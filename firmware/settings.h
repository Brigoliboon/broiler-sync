// Runtime settings: defaults -> flash cache (NVS) -> server config (validated).
#pragma once
#include <Arduino.h>

#define SETTINGS_MAGIC 0x50563202UL   // "PV2" + layout version; change when the struct changes

enum CfgMode : int32_t { CFG_AUTO = 0, CFG_MANUAL = 1 };

struct Settings {
  uint32_t magic;
  int32_t  flockStartDay;     // days since 1970-01-01 (local date of day 0), -1 = unknown
  int32_t  ageOverride;       // >= 0: use this age instead of the RTC calculation, -1 = none
  int32_t  cfgMode;           // CfgMode as last sent by the server
  float    fanOnDelta, fanOffDelta;
  float    lampOnDelta, lampOffDelta;
  float    tempWarnDelta, tempCritDelta;
  int32_t  broodDays, fanMaxOnS, fanRestS;
  float    humLow, humHigh, humBroodLow;
  int32_t  humBroodDays;
  float    windMs[3];
  int32_t  windUntil[3];
  float    battWarnV, battCritV;
  int32_t  minSwitchS;
  int32_t  manualMinutes;
};

// Manual override session (survives a reboot as long as the clock is valid).
struct ManualState {
  uint32_t magic;
  int32_t  id;                // last manual_id applied (server increments it for each new command)
  int32_t  active;            // 1 while the override is running
  int32_t  fan, lamp;         // desired relay states
  uint32_t endsEpoch;         // clock epoch when it ends (0 = timed by millis instead)
};

extern Settings cfg;
extern ManualState manual;
extern uint32_t manualEndsMs;          // used when the clock was invalid at start
extern int32_t lastKnownAge;           // cached age, -1 = none
extern bool configFromServer;          // true once a server config was accepted this boot

void settingsBegin();
void settingsDefaults(Settings& s);
bool settingsValidate(const Settings& s, const char** why);
bool settingsApplyJson(const String& body, String& err);   // parse + validate + save
void settingsSaveLastAge(int32_t age);
void manualStart(int32_t id, bool fan, bool lamp, int32_t minutes);
void manualStop();
