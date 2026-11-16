#include "clock_rtc.h"
#include "config.h"
#include <Wire.h>
#include <time.h>

static RTC_DS3231 rtc;
static bool rtcPresent = false;
static bool rtcTimeOk = false;      // DS3231 holds a trustworthy time
static bool valid = false;
static bool ntpStarted = false;
static DateTime cached(2000, 1, 1, 0, 0, 0);
static uint32_t lastTickMs = 0;
static uint32_t lastRtcSetMs = 0;
static bool everSetFromNtp = false;

static const uint32_t MIN_EPOCH = 1704067200UL;  // 2024-01-01: anything earlier is garbage

void clockBegin() {
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
  rtcPresent = rtc.begin();
  if (!rtcPresent) {
    Serial.println("RTC: DS3231 not found (will use NTP only)");
  } else {
    rtcTimeOk = !rtc.lostPower();
    if (!rtcTimeOk) Serial.println("RTC: lost power, time invalid until NTP sets it");
  }
  lastTickMs = millis() - 1000;
  clockService();
}

void clockOnWifiUp() {
  if (ntpStarted) return;
  ntpStarted = true;
  configTime((long)TZ_OFFSET_MIN * 60, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");
}

static bool ntpTime(DateTime& out) {
  time_t t = time(nullptr);
  if (t < (time_t)MIN_EPOCH) return false;
  struct tm tmv;
  localtime_r(&t, &tmv);
  out = DateTime(tmv.tm_year + 1900, tmv.tm_mon + 1, tmv.tm_mday, tmv.tm_hour, tmv.tm_min, tmv.tm_sec);
  return true;
}

void clockService() {
  uint32_t now = millis();
  if (now - lastTickMs < 1000) return;
  lastTickMs = now;

  DateTime ntp(2000, 1, 1, 0, 0, 0);
  bool haveNtp = ntpStarted && ntpTime(ntp);

  // Set / re-sync the DS3231 from NTP: when its time is invalid, and once a day.
  if (haveNtp && rtcPresent && (!rtcTimeOk || !everSetFromNtp || now - lastRtcSetMs > 86400000UL)) {
    rtc.adjust(ntp);
    rtcTimeOk = true;
    everSetFromNtp = true;
    lastRtcSetMs = now;
    Serial.println("RTC: set from NTP");
  }

  if (rtcPresent && rtcTimeOk) {
    DateTime d = rtc.now();
    if (d.unixtime() >= MIN_EPOCH && d.year() < 2100) { cached = d; valid = true; return; }
    rtcTimeOk = false;  // garbage read (I2C fault?) -> fall through to NTP
  }
  if (haveNtp) { cached = ntp; valid = true; return; }
  valid = false;
}

bool     clockValid()      { return valid; }
bool     clockRtcPresent() { return rtcPresent; }
DateTime clockNow()        { return cached; }
uint32_t clockEpoch()      { return valid ? cached.unixtime() : 0; }
int32_t  clockDayNumber()  { return valid ? (int32_t)(cached.unixtime() / 86400UL) : -1; }
uint32_t clockDateKey()    { return valid ? (uint32_t)cached.year() * 10000UL + cached.month() * 100UL + cached.day() : 0; }

void clockIsoFrom(const DateTime& dt, char* out, size_t n) {
  int off = TZ_OFFSET_MIN;
  char sign = off < 0 ? '-' : '+';
  if (off < 0) off = -off;
  snprintf(out, n, "%04d-%02d-%02dT%02d:%02d:%02d%c%02d:%02d", dt.year(), dt.month(), dt.day(),
           dt.hour(), dt.minute(), dt.second(), sign, off / 60, off % 60);
}

void clockIso(char* out, size_t n) {
  if (!valid) { if (n) out[0] = 0; return; }
  clockIsoFrom(cached, out, n);
}
