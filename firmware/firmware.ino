// ============================================================================
//  Poultry Climate IoT - ESP32 firmware v2
//  2 compartments (experimental + control), 1 exhaust fan + 1 lamp in the
//  experimental compartment, SD logging, RTC, battery monitor, web API sync.
//
//  Tabs:  config.h    pins, defaults, Wi-Fi/API placeholders  (EDIT THIS)
//         sensors     DHT22 x2, anemometer x2, battery + error detection
//         control     age -> setpoint, fan/lamp rules, safe states, alerts
//         settings    flash-cached server config + validation, manual override
//         storage     SD CSV log, RAM fallback, unsent-data pointers
//         cloud       Wi-Fi, GET config, batched POST with backfill
//         clock_rtc   DS3231 + NTP fallback
//         lcd_display 1602 I2C status pages (shares the DS3231 bus)
//
//  Libraries: DHT sensor library + Adafruit Unified Sensor, ArduinoJson 7,
//             RTClib (+ Adafruit BusIO). SD / SPI / Wire / WiFi are in the core.
//  Board:     ESP32 Dev Module (esp32:esp32:esp32)
// ============================================================================
#include <WiFi.h>
#include <esp_task_wdt.h>
#include <esp_system.h>
#include <Wire.h>
#include "config.h"
#include "settings.h"
#include "clock_rtc.h"
#include "sensors.h"
#include "control.h"
#include "storage.h"
#include "cloud.h"
#include "lcd_display.h"

static uint32_t lastLogMs = 0;
static uint32_t lastSerialMs = 0;

static const char* resetReasonName(esp_reset_reason_t r) {
  switch (r) {
    case ESP_RST_POWERON:  return "power-on";
    case ESP_RST_SW:       return "software reset";
    case ESP_RST_PANIC:    return "panic/crash";
    case ESP_RST_INT_WDT:  return "interrupt watchdog";
    case ESP_RST_TASK_WDT: return "task watchdog (hang)";
    case ESP_RST_WDT:      return "watchdog";
    case ESP_RST_BROWNOUT: return "brownout";
    default:               return "other";
  }
}

static void pf(float v, int dec) {
  if (isnan(v)) Serial.print("--"); else Serial.print(v, dec);
}

static void printCompartment(const char* tag, const Compartment& c) {
  Serial.print(tag); Serial.print(":T="); pf(c.temp, 1);
  Serial.print(" H="); pf(c.hum, 0);
  Serial.print(" W="); pf(c.wind, 2);
  if (c.tempSt != ST_OK) { Serial.print(" (dht:"); Serial.print(statusName(c.tempSt)); Serial.print(')'); }
  if (c.windSt != ST_OK) { Serial.print(" (wind:"); Serial.print(statusName(c.windSt)); Serial.print(')'); }
  Serial.print(' ');
}

static void printStatusLine() {
  // age=5 sp=27.0 E:T=..H=..W=.. C:T=..H=..W=.. bat=12.6V fan=0 lamp=1 mode=AUTO alert=OK
  Serial.printf("age=%d sp=%.1f ", ctl.age, ctl.setpoint);
  printCompartment("E", expC);
  printCompartment("C", ctlC);
  Serial.print("bat="); pf(battV, 1); Serial.print("V ");
  Serial.printf("fan=%d lamp=%d mode=%s ", ctl.fan, ctl.lamp, modeName());
  Serial.print("alert=");
  if (ctl.level == SEV_OK) Serial.print("OK");
  else {
    char codes[140];
    alertCodesJoin(codes, sizeof(codes), ',');
    Serial.printf("%s[%s]", ctl.level == SEV_CRITICAL ? "CRIT" : "WARN", codes);
  }
  if (ctl.safeMode) Serial.print(" SAFE");
  if (ctl.fanResting) Serial.print(" fan-rest");
  Serial.printf(" sd=%d wifi=%d lcd=%d\n", storageSdOk(), cloudWifiUp(), lcdPresent());
}

// LCD diagnostics: list every I2C device so a wrong LCD_I2C_ADDR is obvious.
static void i2cScan() {
  Serial.printf("I2C scan (SDA=%d SCL=%d):\n", PIN_I2C_SDA, PIN_I2C_SCL);
  bool lcdSeen = false;
  int count = 0;
  for (uint8_t addr = 0x08; addr < 0x78; addr++) {
    Wire.beginTransmission(addr);
    if (Wire.endTransmission() != 0) continue;
    count++;
    if (addr == LCD_I2C_ADDR) lcdSeen = true;
    Serial.printf("  found 0x%02X%s\n", addr,
                  addr == LCD_I2C_ADDR ? "  <- LCD_I2C_ADDR" :
                  addr == 0x68         ? "  (DS3231)" : "");
  }
  if (count == 0) Serial.println("  nothing found: check SDA/SCL, GND and power");
  else if (!lcdSeen) Serial.printf("  nothing at 0x%02X: if 0x27/0x3F is listed above, set LCD_I2C_ADDR in config.h\n", LCD_I2C_ADDR);
}

static void printLcdState() {
  if (lcdPresent()) Serial.printf("LCD state: OK (init done at 0x%02X). If the screen is still blank: contrast trimmer or 5 V supply\n", LCD_I2C_ADDR);
  else Serial.printf("LCD state: NOT READY (no ACK at 0x%02X, retrying every %lu s)\n", LCD_I2C_ADDR, LCD_RETRY_MS / 1000);
}

void setup() {
  controlBegin();                 // FIRST: relay pins to OFF
  Serial.begin(115200);
  Serial.printf("\nPoultry v2 firmware %s starting\n", FW_VERSION);

  // Watchdog: a hung loop reboots the board; relays come up OFF.
  esp_task_wdt_config_t wdt = {};
  wdt.timeout_ms = WDT_TIMEOUT_S * 1000;
  wdt.idle_core_mask = 0;
  wdt.trigger_panic = true;
  if (esp_task_wdt_init(&wdt) == ESP_ERR_INVALID_STATE) esp_task_wdt_reconfigure(&wdt);
  esp_task_wdt_add(NULL);

  clockBegin();                   // RTC first so a resumed manual override can be checked
  settingsBegin();
  sensorsBegin();
  i2cScan();                      // after clockBegin: the I2C bus is up
  lcdBegin();                     // after clockBegin: shares the DS3231 I2C bus
  printLcdState();
  storageBegin();
  cloudBegin();

  String j;
  buildEventJson(j, "info", "BOOT", "ok", resetReasonName(esp_reset_reason()), NAN);
  storageAppendEvent(j);
  lastLogMs = millis();
  Serial.println("Setup done, relays OFF until the first valid temperature");
}

void loop() {
  esp_task_wdt_reset();
  uint32_t now = millis();

  clockService();
  sensorsService();
  controlService();
  lcdService();

  // Immediate log + upload when something important just happened.
  const char* why = controlTakeTrigger();
  if (why) {
    storageLogRecord(why);
    cloudRequestSyncNow();
  }

  if (now - lastLogMs >= LOG_INTERVAL_MS) {
    lastLogMs = now;
    storageLogRecord("interval");
  }

  if (now - lastSerialMs >= SERIAL_LINE_MS) {
    lastSerialMs = now;
    printStatusLine();
  }

  storageService();
  cloudService();
  delay(5);
}
