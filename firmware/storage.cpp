#include "storage.h"
#include "config.h"
#include "control.h"
#include "sensors.h"
#include "clock_rtc.h"
#include <SPI.h>
#include <SD.h>
#include <FS.h>

const char* const CSV_COL_NAMES[] = {
  "ts", "uptime_s", "age", "setpoint",
  "e_temp", "e_hum", "e_wind", "e_temp_status", "e_wind_status",
  "c_temp", "c_hum", "c_wind", "c_temp_status", "c_wind_status",
  "batt_v", "fan", "lamp", "mode", "alert_level", "alert_codes", "reason"
};
const char CSV_COL_TYPES[] = "SIIFFFFSSFFFSSFBBSSAS";
const int CSV_NCOLS = sizeof(CSV_COL_NAMES) / sizeof(CSV_COL_NAMES[0]);

#define LINE_MAX_LEN 320
#define LOG_DIR      "/logs"
#define EVENTS_PATH  "/logs/events.jsonl"
#define SYNC_PATH    "/logs/sync.txt"

static bool sdOk = false;
static uint32_t lastSdTry = 0;

// ---------------- RAM ring buffers (used while the SD card is not working) ----------------
struct Ring {
  char (*buf)[LINE_MAX_LEN];
  int cap, head, count;
  void push(const char* s) {
    if (count == cap) { head = (head + 1) % cap; count--; }   // full: drop the oldest
    int idx = (head + count) % cap;
    count++;
    strncpy(buf[idx], s, LINE_MAX_LEN - 1);
    buf[idx][LINE_MAX_LEN - 1] = 0;
  }
  const char* at(int i) const { return buf[(head + i) % cap]; }
  void pop(int n) { if (n > count) n = count; head = (head + n) % cap; count -= n; }
};
static char recBuf[RING_RECORDS][LINE_MAX_LEN];
static char evBuf[RING_EVENTS][LINE_MAX_LEN];
static Ring recRing = {recBuf, RING_RECORDS, 0, 0};
static Ring evRing  = {evBuf,  RING_EVENTS,  0, 0};

// ---------------- sync pointers (stored on the SD card) ----------------
static uint32_t syncDate = 0;     // YYYYMMDD of the CSV file being uploaded (0 = no-clock file / start)
static uint32_t syncOff = 0;      // byte offset inside that file
static uint32_t evOff = 0;        // byte offset inside events.jsonl

struct Pending { bool fromRing; int n; uint32_t consumed; };
static Pending pendRec = {false, 0, 0};
static Pending pendEv = {false, 0, 0};

static void saveSyncState() {
  if (!sdOk) return;
  File f = SD.open(SYNC_PATH, FILE_WRITE);   // truncates
  if (!f) return;
  f.printf("%lu %lu %lu\n", (unsigned long)syncDate, (unsigned long)syncOff, (unsigned long)evOff);
  f.close();
}

static void loadSyncState() {
  syncDate = 0; syncOff = 0; evOff = 0;
  File f = SD.open(SYNC_PATH, FILE_READ);
  if (!f) return;
  String s = f.readStringUntil('\n');
  f.close();
  unsigned long a = 0, b = 0, c = 0;
  if (sscanf(s.c_str(), "%lu %lu %lu", &a, &b, &c) == 3) { syncDate = a; syncOff = b; evOff = c; }
}

static void sdFail(const char* why) {
  if (sdOk) Serial.printf("SD: error (%s) - using RAM buffer\n", why);
  sdOk = false;
  SD.end();
  lastSdTry = millis();
}

// If power was lost mid-write the file may end without '\n'; add it so the next line is not glued on.
static void fixTail(const char* path) {
  File f = SD.open(path, FILE_READ);
  if (!f) return;
  size_t sz = f.size();
  bool needNl = false;
  if (sz > 0) { f.seek(sz - 1); needNl = (f.read() != '\n'); }
  f.close();
  if (needNl) {
    File a = SD.open(path, FILE_APPEND);
    if (a) { a.print('\n'); a.close(); }
  }
}

static void datePath(char* out, size_t n, uint32_t date) { snprintf(out, n, LOG_DIR "/%08lu.csv", (unsigned long)date); }

static bool mountSd() {
  SD.end();
  if (!SD.begin(PIN_SD_CS, SPI, SD_SPI_HZ)) { sdOk = false; return false; }
  if (SD.cardType() == CARD_NONE) { SD.end(); sdOk = false; return false; }
  if (!SD.exists(LOG_DIR)) SD.mkdir(LOG_DIR);
  sdOk = true;
  loadSyncState();
  fixTail(EVENTS_PATH);
  if (clockValid()) { char p[32]; datePath(p, sizeof(p), clockDateKey()); fixTail(p); }
  Serial.printf("SD: mounted, %llu MB\n", SD.cardSize() / (1024ULL * 1024ULL));
  return true;
}

bool storageSdOk() { return sdOk; }

void storageBegin() {
  SPI.begin(PIN_SD_SCK, PIN_SD_MISO, PIN_SD_MOSI, PIN_SD_CS);
  if (!mountSd()) Serial.println("SD: not available (RAM buffer in use, will retry)");
  lastSdTry = millis();
}

// ---------------- writing ----------------
static uint32_t dateKeyOfLine(const char* line) {   // line starts with "YYYY-MM-DDT..."
  int y, m, d;
  if (sscanf(line, "%4d-%2d-%2d", &y, &m, &d) == 3 && y > 2000) return (uint32_t)y * 10000UL + m * 100UL + d;
  return 0;
}

static bool sdAppendRecord(const char* line) {
  char path[32];
  datePath(path, sizeof(path), dateKeyOfLine(line));
  bool isNew = !SD.exists(path);
  File f = SD.open(path, FILE_APPEND);
  if (!f) return false;
  if (isNew) {
    for (int i = 0; i < CSV_NCOLS; i++) { f.print(CSV_COL_NAMES[i]); f.print(i < CSV_NCOLS - 1 ? ',' : '\n'); }
  }
  size_t len = strlen(line);
  size_t w = f.write((const uint8_t*)line, len);
  f.write('\n');
  f.close();
  return w == len;
}

static bool sdAppendEvent(const char* line) {
  File f = SD.open(EVENTS_PATH, FILE_APPEND);
  if (!f) return false;
  size_t len = strlen(line);
  size_t w = f.write((const uint8_t*)line, len);
  f.write('\n');
  f.close();
  return w == len;
}

static void appendRecord(const char* line) {
  if (sdOk) {
    // keep anything older that is still queued in RAM in order
    if (recRing.count == 0 && sdAppendRecord(line)) return;
    if (recRing.count == 0) sdFail("write");
  }
  recRing.push(line);
}

void storageAppendEvent(const String& json) {
  if (sdOk) {
    if (evRing.count == 0 && sdAppendEvent(json.c_str())) return;
    if (evRing.count == 0) sdFail("event write");
  }
  evRing.push(json.c_str());
}

static void fnum(char* b, size_t n, float v, int dec) {
  if (isnan(v)) b[0] = 0; else snprintf(b, n, "%.*f", dec, v);
}

void storageLogRecord(const char* reason) {
  char ts[28], codes[140];
  char sp[10], eT[10], eH[10], eW[10], cT[10], cH[10], cW[10], bv[10];
  clockIso(ts, sizeof(ts));
  alertCodesJoin(codes, sizeof(codes), '|');
  fnum(sp, sizeof(sp), ctl.setpoint, 1);
  fnum(eT, sizeof(eT), expC.temp, 1); fnum(eH, sizeof(eH), expC.hum, 1); fnum(eW, sizeof(eW), expC.wind, 2);
  fnum(cT, sizeof(cT), ctlC.temp, 1); fnum(cH, sizeof(cH), ctlC.hum, 1); fnum(cW, sizeof(cW), ctlC.wind, 2);
  fnum(bv, sizeof(bv), battV, 2);
  char line[LINE_MAX_LEN];
  snprintf(line, sizeof(line), "%s,%lu,%d,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%d,%d,%s,%s,%s,%s",
           ts, (unsigned long)(millis() / 1000UL), ctl.age, sp,
           eT, eH, eW, statusName(expC.tempSt), statusName(expC.windSt),
           cT, cH, cW, statusName(ctlC.tempSt), statusName(ctlC.windSt),
           bv, ctl.fan ? 1 : 0, ctl.lamp ? 1 : 0, modeName(), severityName(ctl.level), codes, reason);
  appendRecord(line);
}

// ---------------- reading back (for upload) ----------------
// Reads whole lines starting at byte `start`. Returns valid lines; `consumed` = bytes used
// (including skipped header / corrupt lines). A last line without '\n' is left for later.
static int readLines(File& f, uint32_t start, String* out, int maxLines, bool csv, uint32_t& consumed) {
  consumed = 0;
  if (!f.seek(start)) return 0;
  int n = 0;
  String cur;
  uint32_t used = 0;
  while (n < maxLines && f.available()) {
    int c = f.read();
    if (c < 0) break;
    used++;
    if (c != '\n') { if (cur.length() <= LINE_MAX_LEN) cur += (char)c; continue; }
    consumed = used;                       // complete line
    cur.trim();
    bool ok = cur.length() > 0 && cur.length() < LINE_MAX_LEN;   // longer than a ring/log line = cut or corrupt: skip, never send half a JSON
    if (ok && csv) {
      if (cur.startsWith("ts,")) ok = false;                 // header
      else {
        int commas = 0;
        for (size_t i = 0; i < cur.length(); i++) if (cur[i] == ',') commas++;
        ok = (commas == CSV_NCOLS - 1);                      // drop corrupt/partial rows
      }
    }
    if (ok) out[n++] = cur;
    cur = "";
  }
  return n;
}

static uint32_t findNextDate(uint32_t after) {   // smallest YYYYMMDD.csv date > after, or 0xFFFFFFFF
  uint32_t best = 0xFFFFFFFFUL;
  File dir = SD.open(LOG_DIR);
  if (!dir) return best;
  File e = dir.openNextFile();
  while (e) {
    String name = e.name();
    int slash = name.lastIndexOf('/');
    if (slash >= 0) name = name.substring(slash + 1);
    if (!e.isDirectory() && name.length() == 12 && name.endsWith(".csv")) {
      bool digits = true;
      for (int i = 0; i < 8; i++) if (!isDigit(name[i])) digits = false;
      if (digits) {
        uint32_t d = (uint32_t)name.substring(0, 8).toInt();
        if (d > after && d < best) best = d;
      }
    }
    e.close();
    e = dir.openNextFile();
  }
  dir.close();
  return best;
}

int storagePeekReadings(String* lines, int maxLines) {
  pendRec = {false, 0, 0};
  if (!sdOk) {
    int n = recRing.count < maxLines ? recRing.count : maxLines;
    for (int i = 0; i < n; i++) lines[i] = recRing.at(i);
    pendRec = {true, n, 0};
    return n;
  }
  for (int guard = 0; guard < 60; guard++) {
    char path[32];
    datePath(path, sizeof(path), syncDate);
    if (!SD.exists(path)) {
      uint32_t nx = findNextDate(syncDate);
      if (nx == 0xFFFFFFFFUL) return 0;
      syncDate = nx; syncOff = 0; saveSyncState();
      continue;
    }
    File f = SD.open(path, FILE_READ);
    if (!f) { sdFail("open for sync"); return 0; }
    uint32_t consumed = 0;
    int n = readLines(f, syncOff, lines, maxLines, true, consumed);
    f.close();
    if (consumed == 0) {                       // nothing new in this file
      uint32_t nx = findNextDate(syncDate);
      if (nx == 0xFFFFFFFFUL) return 0;        // fully caught up
      syncDate = nx; syncOff = 0; saveSyncState();
      continue;
    }
    if (n == 0) { syncOff += consumed; saveSyncState(); continue; }   // only header / junk
    pendRec = {false, n, consumed};
    return n;
  }
  return 0;
}

void storageCommitReadings() {
  if (pendRec.fromRing) recRing.pop(pendRec.n);
  else { syncOff += pendRec.consumed; saveSyncState(); }
  pendRec = {false, 0, 0};
}

int storagePeekEvents(String* lines, int maxLines) {
  pendEv = {false, 0, 0};
  if (!sdOk) {
    int n = evRing.count < maxLines ? evRing.count : maxLines;
    for (int i = 0; i < n; i++) lines[i] = evRing.at(i);
    pendEv = {true, n, 0};
    return n;
  }
  if (!SD.exists(EVENTS_PATH)) return 0;
  File f = SD.open(EVENTS_PATH, FILE_READ);
  if (!f) { sdFail("open events"); return 0; }
  uint32_t consumed = 0;
  int n = readLines(f, evOff, lines, maxLines, false, consumed);
  f.close();
  if (n == 0) { if (consumed) { evOff += consumed; saveSyncState(); } return 0; }
  pendEv = {false, n, consumed};
  return n;
}

void storageCommitEvents() {
  if (pendEv.fromRing) evRing.pop(pendEv.n);
  else { evOff += pendEv.consumed; saveSyncState(); }
  pendEv = {false, 0, 0};
}

// ---------------- housekeeping ----------------
void storageService() {
  uint32_t now = millis();
  if (!sdOk) {
    if (now - lastSdTry >= SD_RETRY_MS) {
      lastSdTry = now;
      if (mountSd()) Serial.println("SD: recovered");
    }
    return;
  }
  // SD is back: move what was buffered in RAM onto the card (oldest first)
  while (sdOk && recRing.count > 0) {
    if (sdAppendRecord(recRing.at(0))) recRing.pop(1); else sdFail("flush");
  }
  while (sdOk && evRing.count > 0) {
    if (sdAppendEvent(evRing.at(0))) evRing.pop(1); else sdFail("flush events");
  }
}
