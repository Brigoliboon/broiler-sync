// Control logic: broiler age, setpoint, fan/lamp rules, modes, safe states, alerts.
#pragma once
#include <Arduino.h>

enum Severity : uint8_t { SEV_OK = 0, SEV_WARNING = 1, SEV_CRITICAL = 2 };
enum AgeSource : uint8_t { AGE_SRC_OVERRIDE, AGE_SRC_RTC, AGE_SRC_CACHE, AGE_SRC_FALLBACK };

enum AlertId : uint8_t {
  AL_E_TEMP_SENSOR, AL_E_TEMP_HIGH, AL_E_TEMP_HIGH_CRIT, AL_E_TEMP_LOW, AL_E_TEMP_LOW_CRIT,
  AL_E_HUM_LOW, AL_E_HUM_HIGH, AL_E_WIND_HIGH, AL_E_WIND_SENSOR,
  AL_C_TEMP_SENSOR, AL_C_HUM_LOW, AL_C_HUM_HIGH, AL_C_WIND_HIGH, AL_C_WIND_SENSOR,
  AL_BATT_LOW, AL_BATT_CRIT, AL_BATT_SENSOR,
  AL_SD_ERROR, AL_RTC_LOST, AL_AGE_UNKNOWN,
  AL_COUNT
};

struct ControlState {
  int       age = 7;
  AgeSource ageSrc = AGE_SRC_FALLBACK;
  float     setpoint = 26.0f;
  bool      fan = false;            // actual relay state
  bool      lamp = false;
  bool      manualActive = false;   // effective mode = MANUAL
  bool      bootHold = true;        // relays held OFF until the first valid temperature
  bool      safeMode = false;       // experimental DHT22 failed (auto mode)
  bool      fanResting = false;     // brooding guard is forcing the fan off
  uint32_t  alertMask = 0;          // active (debounced) alerts, bit = AlertId
  Severity  level = SEV_OK;
};
extern ControlState ctl;

void controlBegin();                     // call FIRST in setup(): drives relay pins to OFF
void controlService();                   // call every loop (works once per second)
const char* controlTakeTrigger();        // "alert" / "relay" / "mode" if an immediate log+sync is wanted, else nullptr

float setpointForAge(int age);
const char* alertName(int id);
const char* severityName(Severity s);
const char* modeName();
void alertCodesJoin(char* out, size_t n, char sep);   // active codes, e.g. "E_HUM_LOW|BATT_LOW"
void buildEventJson(String& out, const char* event, const char* code, const char* severity,
                    const char* message, float value);
