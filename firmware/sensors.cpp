#include "sensors.h"
#include "config.h"
#include <DHT.h>

Compartment expC, ctlC;
float battV = NAN;
SensorStatus battSt = ST_UNKNOWN;

const char* statusName(SensorStatus s) {
  switch (s) {
    case ST_OK:           return "ok";
    case ST_NO_DATA:      return "no_data";
    case ST_RANGE:        return "range";
    case ST_FROZEN:       return "frozen";
    case ST_DISCONNECTED: return "disconnected";
    default:              return "unknown";
  }
}

// ---------------- DHT22 (non-blocking state machine, retries up to DHT_RETRIES) ----------------
struct DhtCtx {
  DHT* dht;
  uint32_t nextMs;
  uint8_t attempt;        // attempts used in the current cycle
  uint8_t failCycles;     // consecutive failed cycles
  uint16_t same;          // consecutive identical readings
  float lastT, lastH;
  SensorStatus lastBad;
};

static DHT dhtExp(PIN_DHT_EXP, DHT22);
static DHT dhtCtl(PIN_DHT_CTL, DHT22);
static DhtCtx ctxE = {&dhtExp, 0, 0, 0, 0, NAN, NAN, ST_NO_DATA};
static DhtCtx ctxC = {&dhtCtl, 0, 0, 0, 0, NAN, NAN, ST_NO_DATA};

static void dhtService(DhtCtx& c, Compartment& s, uint32_t now) {
  if ((int32_t)(now - c.nextMs) < 0) return;
  float t = c.dht->readTemperature();
  float h = c.dht->readHumidity();   // served from the same read (< 2 s apart)

  SensorStatus bad = ST_OK;
  if (isnan(t) || isnan(h)) bad = ST_NO_DATA;
  else if (t < DHT_TEMP_MIN || t > DHT_TEMP_MAX || h < 0.0f || h > 100.0f) bad = ST_RANGE;

  if (bad != ST_OK) {
    c.lastBad = bad;
    if (++c.attempt < DHT_RETRIES) { c.nextMs = now + DHT_RETRY_MS; return; }  // retry soon
    c.attempt = 0;
    c.nextMs = now + DHT_READ_MS;
    if (c.failCycles < 255) c.failCycles++;
    if (c.failCycles >= DHT_FAIL_CYCLES) {   // short glitches keep the last good value
      s.temp = NAN; s.hum = NAN; s.tempSt = c.lastBad;
    }
    return;
  }

  c.attempt = 0; c.failCycles = 0;
  c.nextMs = now + DHT_READ_MS;
  s.temp = t; s.hum = h;
  if (t == c.lastT && h == c.lastH) { if (c.same < 65535) c.same++; } else c.same = 0;
  c.lastT = t; c.lastH = h;
  s.tempSt = (c.same >= DHT_FROZEN_READS) ? ST_FROZEN : ST_OK;
}

// ---------------- anemometer (analog) ----------------
struct AnemCtx { uint8_t pin; uint8_t bad; float ema; bool haveEma; };
static AnemCtx anE = {PIN_WIND_EXP, 0, 0, false};
static AnemCtx anC = {PIN_WIND_CTL, 0, 0, false};
static uint32_t lastAnemMs = 0;

static float readVolts(uint8_t pin, int samples) {
  uint32_t mv = 0;
  for (int i = 0; i < samples; i++) mv += analogReadMilliVolts(pin);
  return (mv / (float)samples) / 1000.0f;
}

static float voltsToMs(float v) {
  if (v <= ANEMO_V_MIN) return 0.0f;
  float ms = (v - ANEMO_V_MIN) * (WIND_MAX_MS / (ANEMO_V_MAX - ANEMO_V_MIN));
  return ms > WIND_MAX_MS ? WIND_MAX_MS : ms;
}

static void anemService(AnemCtx& a, Compartment& s) {
  float v = readVolts(a.pin, 8);
  s.windV = v;
  SensorStatus st = ST_OK;
  if (ANEMO_V_DISCONNECT > 0 && v < ANEMO_V_DISCONNECT) st = ST_DISCONNECTED;
  else if (v > ANEMO_V_OVER) st = ST_RANGE;

  if (st != ST_OK) {
    if (a.bad < 255) a.bad++;
    if (a.bad >= ANEMO_BAD_SAMPLES) { s.windSt = st; s.wind = NAN; a.haveEma = false; }
    return;
  }
  a.bad = 0;
  float ms = voltsToMs(v);
  a.ema = a.haveEma ? a.ema + ANEMO_EMA_ALPHA * (ms - a.ema) : ms;
  a.haveEma = true;
  s.wind = a.ema;
  s.windSt = ST_OK;
}

// ---------------- battery ----------------
static uint32_t lastBattMs = 0;
static bool haveBatt = false;

static void battService() {
  uint32_t mvSum = 0;
  for (int i = 0; i < 16; i++) mvSum += analogReadMilliVolts(PIN_BATT);
  float mv = mvSum / 16.0f;
  if (mv < BATT_PIN_MV_MIN) { battSt = ST_DISCONNECTED; battV = NAN; haveBatt = false; return; }
  float v = (mv / 1000.0f) * BATT_DIVIDER_RATIO * BATT_CAL_FACTOR;
  if (mv > BATT_PIN_MV_CLIP) battSt = ST_RANGE; else battSt = ST_OK;
  battV = haveBatt && !isnan(battV) ? battV + 0.3f * (v - battV) : v;
  haveBatt = true;
}

// ---------------- public ----------------
void sensorsBegin() {
  analogReadResolution(12);
  analogSetPinAttenuation(PIN_WIND_EXP, ADC_11db);   // ADC1 pins only: ADC2 is dead while Wi-Fi is on
  analogSetPinAttenuation(PIN_WIND_CTL, ADC_11db);
  analogSetPinAttenuation(PIN_BATT, ADC_11db);
  dhtExp.begin();
  dhtCtl.begin();
  uint32_t now = millis();
  ctxE.nextMs = now + 2000;      // DHT22 needs ~2 s after power-up
  ctxC.nextMs = now + 2500;
  lastAnemMs = now;
  lastBattMs = now - BATT_SAMPLE_MS;
}

void sensorsService() {
  uint32_t now = millis();
  dhtService(ctxE, expC, now);
  dhtService(ctxC, ctlC, now);
  if (now - lastAnemMs >= ANEMO_SAMPLE_MS) {
    lastAnemMs = now;
    anemService(anE, expC);
    anemService(anC, ctlC);
  }
  if (now - lastBattMs >= BATT_SAMPLE_MS) {
    lastBattMs = now;
    battService();
  }
}
