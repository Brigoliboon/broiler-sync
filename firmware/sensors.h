// Sensor drivers + per-sensor health status.
#pragma once
#include <Arduino.h>

enum SensorStatus : uint8_t {
  ST_UNKNOWN = 0,      // no complete reading yet (boot)
  ST_OK,
  ST_NO_DATA,          // DHT returned NaN / not responding
  ST_RANGE,            // value outside physical range
  ST_FROZEN,           // identical readings for DHT_FROZEN_READS in a row
  ST_DISCONNECTED      // analog sensor voltage far below its zero-wind offset
};

struct Compartment {
  float temp = NAN, hum = NAN, wind = NAN;   // NaN when the sensor is not usable
  float windV = NAN;                         // raw anemometer volts (for calibration)
  SensorStatus tempSt = ST_UNKNOWN;          // DHT22 status (covers temp + humidity)
  SensorStatus windSt = ST_UNKNOWN;
};

extern Compartment expC;     // experimental (controlled) compartment
extern Compartment ctlC;     // control compartment (monitor only)
extern float battV;          // battery volts (NaN if unusable)
extern SensorStatus battSt;

void sensorsBegin();
void sensorsService();                  // non-blocking, call every loop
inline bool sensorOk(SensorStatus s) { return s == ST_OK; }
const char* statusName(SensorStatus s);
