#include "cloud.h"
#include "config.h"
#include "settings.h"
#include "storage.h"
#include "clock_rtc.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <esp_task_wdt.h>

static WiFiClient plainClient;
static WiFiClientSecure tlsClient;

static bool wifiWasUp = false;
static uint32_t wifiDownSince = 0;
static uint32_t lastWifiKick = 0;

static uint32_t lastSyncTimer = 0;     // 5-minute countdown start
static uint32_t nextTryMs = 0;
static bool syncReq = false;
static uint32_t lastCfgOk = 0, lastCfgTry = 0;
static bool cfgEver = false;

bool cloudWifiUp() { return WiFi.status() == WL_CONNECTED; }
// wifiWasUp is still true until cloudService() has recorded the drop, so a stale
// wifiDownSince is never used.
uint32_t cloudWifiDownMs() { return (cloudWifiUp() || wifiWasUp) ? 0 : millis() - wifiDownSince; }

void cloudBegin() {
  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASS);     // non-blocking: control + logging run without Wi-Fi
  lastSyncTimer = millis();
  wifiDownSince = millis();
  lastWifiKick = millis();
}

void cloudRequestSyncNow() {
  syncReq = true;
  lastSyncTimer = millis();             // an immediate sync resets the 5-minute countdown
}

// Returns the HTTP status code (or a negative HTTPClient error). Body of the reply in *resp.
static int httpDo(bool post, const String& path, const String* body, String* resp) {
  HTTPClient http;
  String url = String(API_BASE) + path;
  bool tls = url.startsWith("https");
  if (tls) {
    const char* ca = API_ROOT_CA;
    if (ca) tlsClient.setCACert(ca); else tlsClient.setInsecure();
    http.begin(tlsClient, url);
  } else {
    http.begin(plainClient, url);
  }
  http.setConnectTimeout(3000);
  http.setTimeout(4000);
  http.setReuse(false);
  http.addHeader("x-device-key", DEVICE_KEY);
  http.addHeader("x-device-id", DEVICE_ID);
  int code;
  if (post) {
    http.addHeader("Content-Type", "application/json");
    code = http.POST(*body);
  } else {
    code = http.GET();
  }
  if (resp && code > 0) *resp = http.getString();
  http.end();
  return code;
}

// ---------------- config ----------------
static void fetchConfig() {
  String resp;
  int code = httpDo(false, String("/api/devices/") + DEVICE_ID + "/config", nullptr, &resp);
  lastCfgTry = millis();
  if (code == 200) {
    String err;
    if (settingsApplyJson(resp, err)) {
      lastCfgOk = millis();
      cfgEver = true;
      Serial.println("Config: updated from server");
    } else {
      Serial.printf("Config: REJECTED (%s) - keeping previous\n", err.c_str());
    }
  } else {
    Serial.printf("Config: GET -> %d\n", code);
  }
}

// ---------------- CSV line -> JSON object ----------------
static void csvToJson(const String& line, String& out) {
  JsonDocument d;
  d["device_id"] = DEVICE_ID;
  int start = 0;
  for (int col = 0; col < CSV_NCOLS; col++) {
    int comma = line.indexOf(',', start);
    String f = (comma < 0) ? line.substring(start) : line.substring(start, comma);
    start = comma + 1;
    const char* name = CSV_COL_NAMES[col];
    switch (CSV_COL_TYPES[col]) {
      case 'S': if (f.length()) d[name] = f; else d[name] = nullptr; break;
      case 'I': if (f.length()) d[name] = (long)f.toInt(); else d[name] = nullptr; break;
      case 'F': if (f.length()) d[name] = f.toFloat(); else d[name] = nullptr; break;
      case 'B': d[name] = (f == "1"); break;
      case 'A': {
        JsonArray a = d[name].to<JsonArray>();
        int s = 0;
        while (f.length() && s <= (int)f.length()) {
          int p = f.indexOf('|', s);
          String item = (p < 0) ? f.substring(s) : f.substring(s, p);
          if (item.length()) a.add(item);
          if (p < 0) break;
          s = p + 1;
        }
        break;
      }
    }
  }
  serializeJson(d, out);
}

// ---------------- upload ----------------
// A 4xx (other than auth / rate-limit / timeout) means the server will never accept this
// batch: drop it so it cannot block everything behind it.
static bool shouldDrop(int code) {
  return code >= 400 && code < 500 && code != 401 && code != 403 && code != 408 && code != 429;
}

static bool sendBatch(bool events, bool& more) {
  more = false;
  static String lines[SYNC_BATCH];
  for (int round = 0; round < 3; round++) {
    esp_task_wdt_reset();
    int n = events ? storagePeekEvents(lines, SYNC_BATCH) : storagePeekReadings(lines, SYNC_BATCH);
    if (n == 0) return true;
    String body;
    body.reserve(n * 520 + 8);
    body = "[";
    for (int i = 0; i < n; i++) {
      if (i) body += ',';
      if (events) {
        body += lines[i];
      } else {
        String item;
        csvToJson(lines[i], item);   // serializeJson clears its String destination
        body += item;
      }
    }
    body += ']';
    String resp;
    int code = httpDo(true, events ? "/api/alerts" : "/api/readings", &body, &resp);
    esp_task_wdt_reset();
    const char* path = events ? "/api/alerts" : "/api/readings";
    Serial.printf("POST %s x%d -> %d\n", path, n, code);
    bool ok = code >= 200 && code < 300;
    if (!ok) {
      resp.trim();
      if (resp.length() > 180) resp = resp.substring(0, 180);
      if (resp.length()) Serial.printf("Server said: %s\n", resp.c_str());
    }
    if (ok || shouldDrop(code)) {
      if (!ok) Serial.println("Server rejected this batch permanently - dropped");
      if (events) storageCommitEvents(); else storageCommitReadings();
      if (n < SYNC_BATCH) return true;
      if (round == 2) more = true;
    } else {
      return false;
    }
  }
  return true;
}

static void syncService() {
  uint32_t now = millis();
  if (now - lastSyncTimer >= SYNC_INTERVAL_MS) { lastSyncTimer = now; syncReq = true; }
  if (!syncReq || !cloudWifiUp()) return;
  if ((int32_t)(now - nextTryMs) < 0) return;

  bool more1 = false, more2 = false;
  bool ok = sendBatch(true, more1);                 // alert events first
  if (ok) ok = sendBatch(false, more2);             // then readings (oldest first = backfill)
  if (!ok) { nextTryMs = millis() + SYNC_RETRY_MS; return; }   // stay requested, retry later
  nextTryMs = millis() + (more1 || more2 ? 500UL : SYNC_MIN_GAP_MS);
  syncReq = more1 || more2;
}

// ---------------- main service ----------------
void cloudService() {
  uint32_t now = millis();
  bool up = cloudWifiUp();

  if (up && !wifiWasUp) {
    wifiWasUp = true;
    Serial.printf("WiFi: connected %s\n", WiFi.localIP().toString().c_str());
    clockOnWifiUp();
    syncReq = true;                     // backfill anything logged while offline
  } else if (!up && wifiWasUp) {
    wifiWasUp = false;
    wifiDownSince = now;
    Serial.println("WiFi: lost - running from cached config, logging to SD");
  }
  if (!up && now - lastWifiKick > 60000UL) {   // auto-reconnect should handle it; this is the backstop
    lastWifiKick = now;
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
  }
  if (!up) return;

  bool cfgDue = !cfgEver ? (now - lastCfgTry >= 30000UL || lastCfgTry == 0)
                         : (now - lastCfgOk >= CONFIG_INTERVAL_MS && now - lastCfgTry >= 30000UL);
  if (cfgDue) { esp_task_wdt_reset(); fetchConfig(); esp_task_wdt_reset(); }
  syncService();
}
