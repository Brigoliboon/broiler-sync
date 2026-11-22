#include "settings.h"
#include "config.h"
#include "clock_rtc.h"
#include <Preferences.h>
#include <ArduinoJson.h>
#include <RTClib.h>

Settings cfg;
ManualState manual;
uint32_t manualEndsMs = 0;
int32_t lastKnownAge = -1;
bool configFromServer = false;

static Preferences prefs;
static const char* NS = "poultry2";

void settingsDefaults(Settings& s) {
  memset(&s, 0, sizeof(s));
  s.magic = SETTINGS_MAGIC;
  s.flockStartDay = -1;
  s.ageOverride = -1;
  s.cfgMode = CFG_AUTO;
  s.fanOnDelta = DEF_FAN_ON_DELTA;   s.fanOffDelta = DEF_FAN_OFF_DELTA;
  s.lampOnDelta = DEF_LAMP_ON_DELTA; s.lampOffDelta = DEF_LAMP_OFF_DELTA;
  s.tempWarnDelta = DEF_TEMP_WARN_DELTA; s.tempCritDelta = DEF_TEMP_CRIT_DELTA;
  s.broodDays = DEF_BROOD_DAYS; s.fanMaxOnS = DEF_FAN_MAX_ON_S; s.fanRestS = DEF_FAN_REST_S;
  s.humLow = DEF_HUM_LOW; s.humHigh = DEF_HUM_HIGH; s.humBroodLow = DEF_HUM_BROOD_LOW;
  s.humBroodDays = DEF_HUM_BROOD_DAYS;
  s.windMs[0] = DEF_WIND_MS_1; s.windMs[1] = DEF_WIND_MS_2; s.windMs[2] = DEF_WIND_MS_3;
  s.windUntil[0] = DEF_WIND_UNTIL_1; s.windUntil[1] = DEF_WIND_UNTIL_2; s.windUntil[2] = DEF_WIND_UNTIL_3;
  s.battWarnV = DEF_BATT_WARN_V; s.battCritV = DEF_BATT_CRIT_V;
  s.minSwitchS = DEF_MIN_SWITCH_S;
  s.manualMinutes = DEF_MANUAL_MINUTES;
}

static bool finite(float v) { return !isnan(v) && !isinf(v); }

bool settingsValidate(const Settings& s, const char** why) {
  const char* w = nullptr;
  if (s.magic != SETTINGS_MAGIC) w = "magic";
  else if (!finite(s.fanOnDelta) || !finite(s.fanOffDelta) || !finite(s.lampOnDelta) || !finite(s.lampOffDelta) ||
           !finite(s.tempWarnDelta) || !finite(s.tempCritDelta) || !finite(s.humLow) || !finite(s.humHigh) ||
           !finite(s.humBroodLow) || !finite(s.battWarnV) || !finite(s.battCritV) ||
           !finite(s.windMs[0]) || !finite(s.windMs[1]) || !finite(s.windMs[2])) w = "not a number";
  else if (s.fanOnDelta < 0.5f || s.fanOnDelta > 10) w = "fan_on_delta";
  else if (s.fanOffDelta < -5 || s.fanOffDelta > s.fanOnDelta - 0.5f) w = "fan_off_delta (needs 0.5 C gap below on)";
  else if (s.lampOnDelta < 0 || s.lampOnDelta > 10) w = "lamp_on_delta";
  else if (s.lampOffDelta < -5 || s.lampOffDelta > 5 || s.lampOffDelta <= -s.lampOnDelta) w = "lamp_off_delta (must be above lamp on point)";
  else if (s.lampOffDelta >= s.fanOffDelta) w = "lamp_off_delta must be below fan_off_delta";
  else if (s.tempWarnDelta < s.fanOnDelta || s.tempWarnDelta > 10) w = "temp_warn_delta";
  else if (s.tempCritDelta < s.tempWarnDelta || s.tempCritDelta > 15) w = "temp_crit_delta";
  else if (s.broodDays < 0 || s.broodDays > 60) w = "brood_days";
  else if (s.fanMaxOnS < 10 || s.fanMaxOnS > 3600) w = "fan_max_on_s";
  else if (s.fanRestS < 10 || s.fanRestS > 3600) w = "fan_rest_s";
  else if (s.humLow < 0 || s.humHigh > 100 || s.humLow >= s.humHigh) w = "hum_low/hum_high";
  else if (s.humBroodLow < s.humLow || s.humBroodLow >= s.humHigh) w = "hum_brood_low";
  else if (s.humBroodDays < 0 || s.humBroodDays > 60) w = "hum_brood_days";
  else if (s.windMs[0] < 0.01f || s.windMs[1] < 0.01f || s.windMs[2] < 0.01f ||
           s.windMs[0] > 10 || s.windMs[1] > 10 || s.windMs[2] > 10) w = "wind_alert_ms";
  else if (s.windUntil[0] < 0 || s.windUntil[0] > s.windUntil[1] || s.windUntil[1] > s.windUntil[2] || s.windUntil[2] > 120) w = "wind_alert_until_days";
  else if (s.battCritV < 6 || s.battWarnV > 30 || s.battCritV >= s.battWarnV) w = "batt_warn_v/batt_crit_v";
  else if (s.minSwitchS < 5 || s.minSwitchS > 600) w = "min_switch_s";
  else if (s.manualMinutes < 1 || s.manualMinutes > 1440) w = "manual_minutes";
  else if (s.ageOverride < -1 || s.ageOverride > 120) w = "age_override_days";
  else if (s.cfgMode != CFG_AUTO && s.cfgMode != CFG_MANUAL) w = "mode";
  else if (s.flockStartDay != -1 && (s.flockStartDay < 18262 /*2020-01-01*/ || s.flockStartDay > 47482 /*2100*/)) w = "flock_start";
  if (why) *why = w;
  return w == nullptr;
}

static void saveSettings() {
  prefs.begin(NS, false);
  prefs.putBytes("cfg", &cfg, sizeof(cfg));
  prefs.end();
}
static void saveManual() {
  prefs.begin(NS, false);
  prefs.putBytes("man", &manual, sizeof(manual));
  prefs.end();
}

void settingsSaveLastAge(int32_t age) {
  lastKnownAge = age;
  prefs.begin(NS, false);
  prefs.putInt("age", age);
  prefs.end();
}

void settingsBegin() {
  settingsDefaults(cfg);
  memset(&manual, 0, sizeof(manual));
  manual.magic = SETTINGS_MAGIC;
  manual.id = -1;

  prefs.begin(NS, true);
  if (prefs.getBytesLength("cfg") == sizeof(Settings)) {
    Settings tmp;
    prefs.getBytes("cfg", &tmp, sizeof(tmp));
    const char* why;
    if (settingsValidate(tmp, &why)) { cfg = tmp; Serial.println("Settings: loaded cached config"); }
    else Serial.printf("Settings: cached config invalid (%s), using defaults\n", why);
  } else {
    Serial.println("Settings: no cached config, using defaults");
  }
  if (prefs.getBytesLength("man") == sizeof(ManualState)) {
    ManualState tmp;
    prefs.getBytes("man", &tmp, sizeof(tmp));
    if (tmp.magic == SETTINGS_MAGIC) manual = tmp;
  }
  lastKnownAge = prefs.getInt("age", -1);
  prefs.end();

  // A manual session can only be resumed when we can tell whether it already expired.
  if (manual.active) {
    if (MANUAL_RESUME_AFTER_REBOOT && manual.endsEpoch != 0 && clockValid() && clockEpoch() < manual.endsEpoch) {
      manualEndsMs = millis() + (manual.endsEpoch - clockEpoch()) * 1000UL;
      Serial.println("Manual override resumed after reboot");
    } else {
      manual.active = 0;
      saveManual();
    }
  }
}

void manualStart(int32_t id, bool fan, bool lamp, int32_t minutes) {
  manual.id = id;
  manual.active = 1;
  manual.fan = fan; manual.lamp = lamp;
  // Both timers run; whichever passes first ends the override (survives a bad/lost clock).
  manual.endsEpoch = clockValid() ? clockEpoch() + (uint32_t)minutes * 60UL : 0;
  manualEndsMs = millis() + (uint32_t)minutes * 60000UL;
  saveManual();
  Serial.printf("Manual override #%d: fan=%d lamp=%d for %d min\n", (int)id, fan, lamp, (int)minutes);
}

void manualStop() {
  if (!manual.active) return;
  manual.active = 0;
  saveManual();
}

// ---------- server config ----------
static bool getNum(JsonVariantConst v, float& out) {
  if (!v.is<float>()) return false;
  out = v.as<float>();
  return true;
}
static bool getInt(JsonVariantConst v, int32_t& out) {
  float f;
  if (!getNum(v, f) || isnan(f) || f > 1e9f || f < -1e9f) return false;
  out = (int32_t)lroundf(f);
  return true;
}
static bool has(JsonVariantConst v) { return !v.isUnbound(); }   // key present (null counts)

bool settingsApplyJson(const String& body, String& err) {
  JsonDocument doc;
  DeserializationError e = deserializeJson(doc, body);
  if (e) { err = String("bad JSON: ") + e.c_str(); return false; }
  if (!doc.is<JsonObject>()) { err = "config is not an object"; return false; }

  JsonObjectConst o = doc.as<JsonObjectConst>();
  Settings n = cfg;
  float f; int32_t i;

  JsonVariantConst v = o["flock_start"];
  if (has(v)) {
    if (v.isNull()) n.flockStartDay = -1;
    else if (v.is<const char*>()) {
      int y, m, d;
      if (sscanf(v.as<const char*>(), "%d-%d-%d", &y, &m, &d) != 3 || y < 2020 || y > 2099 || m < 1 || m > 12 || d < 1 || d > 31) {
        err = "flock_start must be YYYY-MM-DD"; return false;
      }
      n.flockStartDay = (int32_t)(DateTime(y, m, d, 0, 0, 0).unixtime() / 86400UL);
    } else { err = "flock_start must be a string"; return false; }
  }
  v = o["age_override_days"];
  if (has(v)) {
    if (v.isNull()) n.ageOverride = -1;
    else if (getInt(v, i)) n.ageOverride = i;
    else { err = "age_override_days"; return false; }
  }
  v = o["mode"];
  if (has(v)) {
    const char* m = v.is<const char*>() ? v.as<const char*>() : "";
    if (!strcasecmp(m, "auto")) n.cfgMode = CFG_AUTO;
    else if (!strcasecmp(m, "manual")) n.cfgMode = CFG_MANUAL;
    else { err = "mode must be auto|manual"; return false; }
  }
  if (getNum(o["fan_on_delta"], f))    n.fanOnDelta = f;
  if (getNum(o["fan_off_delta"], f))   n.fanOffDelta = f;
  if (getNum(o["lamp_on_delta"], f))   n.lampOnDelta = f;
  if (getNum(o["lamp_off_delta"], f))  n.lampOffDelta = f;
  if (getNum(o["temp_warn_delta"], f)) n.tempWarnDelta = f;
  if (getNum(o["temp_crit_delta"], f)) n.tempCritDelta = f;
  if (getInt(o["brood_days"], i))      n.broodDays = i;
  if (getInt(o["fan_max_on_s"], i))    n.fanMaxOnS = i;
  if (getInt(o["fan_rest_s"], i))      n.fanRestS = i;
  if (getNum(o["hum_low"], f))         n.humLow = f;
  if (getNum(o["hum_high"], f))        n.humHigh = f;
  if (getNum(o["hum_brood_low"], f))   n.humBroodLow = f;
  if (getInt(o["hum_brood_days"], i))  n.humBroodDays = i;
  if (getNum(o["batt_warn_v"], f))     n.battWarnV = f;
  if (getNum(o["batt_crit_v"], f))     n.battCritV = f;
  if (getInt(o["min_switch_s"], i))    n.minSwitchS = i;
  if (getInt(o["manual_minutes"], i))  n.manualMinutes = i;

  JsonArrayConst wm = o["wind_alert_ms"];
  if (!wm.isNull()) {
    if (wm.size() != 3) { err = "wind_alert_ms needs 3 values"; return false; }
    for (int k = 0; k < 3; k++) { if (!getNum(wm[k], f)) { err = "wind_alert_ms"; return false; } n.windMs[k] = f; }
  }
  JsonArrayConst wu = o["wind_alert_until_days"];
  if (!wu.isNull()) {
    if (wu.size() != 3) { err = "wind_alert_until_days needs 3 values"; return false; }
    for (int k = 0; k < 3; k++) { if (!getInt(wu[k], i)) { err = "wind_alert_until_days"; return false; } n.windUntil[k] = i; }
  }

  const char* why = nullptr;
  if (!settingsValidate(n, &why)) { err = String("rejected: ") + why; return false; }

  // manual override command (only a NEW manual_id starts a session; "auto" cancels it)
  int32_t mid = -1, mmin = n.manualMinutes;
  bool hasId = getInt(o["manual_id"], mid);
  if (n.cfgMode == CFG_MANUAL && hasId && mid != manual.id) {
    bool mf = o["manual_fan"] | false;
    bool ml = o["manual_lamp"] | false;
    manualStart(mid, mf, ml, mmin);
  } else if (n.cfgMode == CFG_AUTO) {
    manualStop();
  }

  bool changed = memcmp(&n, &cfg, sizeof(Settings)) != 0;
  cfg = n;
  if (changed) saveSettings();
  configFromServer = true;
  return true;
}
