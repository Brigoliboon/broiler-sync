#include "lcd_display.h"
#include "config.h"

#if LCD_ENABLED

#include <Wire.h>
#include "sensors.h"
#include "control.h"
#include "storage.h"
#include "cloud.h"

// PCF8574 backpack bit mapping (the usual "LCM1602 IIC" board).
#define LCD_RS 0x01
#define LCD_RW 0x02
#define LCD_EN 0x04
#define LCD_BL 0x08

static bool     lcdOk = false;
static uint32_t lastInitMs = 0;
static uint32_t lastUpdateMs = 0;
static uint32_t lastPageMs = 0;
static uint8_t  page = 0;

static void lcdWrite(uint8_t value) {
  Wire.beginTransmission(LCD_I2C_ADDR);
  Wire.write(value);
  Wire.endTransmission();
}

static void lcdPulse(uint8_t value) {
  lcdWrite(value | LCD_EN);
  delayMicroseconds(2);
  lcdWrite(value & (uint8_t)~LCD_EN);
  delayMicroseconds(50);
}

static void lcdNibble(uint8_t nibble, bool rs) {
  uint8_t value = (uint8_t)((nibble & 0x0F) << 4) | LCD_BL | (rs ? LCD_RS : 0);
  lcdPulse(value);
}

static void lcdCommand(uint8_t command) {
  lcdNibble(command >> 4, false);
  lcdNibble(command & 0x0F, false);
  if (command <= 0x03) delay(2); else delayMicroseconds(100);
}

static void lcdData(uint8_t value) {
  lcdNibble(value >> 4, true);
  lcdNibble(value & 0x0F, true);
  delayMicroseconds(100);
}

static bool lcdProbe() {
  Wire.beginTransmission(LCD_I2C_ADDR);
  return Wire.endTransmission() == 0;
}

static void lcdInit() {
  delay(50);
  lcdNibble(0x03, false); delay(5);
  lcdNibble(0x03, false); delay(5);
  lcdNibble(0x03, false); delay(1);
  lcdNibble(0x02, false); delay(1);   // switch to 4-bit mode
  lcdCommand(0x28);                   // 4-bit, 2 lines, 5x8 font
  lcdCommand(0x0C);                   // display on, cursor off, blink off
  lcdCommand(0x06);                   // increment cursor, no shift
  lcdCommand(0x01);                   // clear
  delay(2);
}

static void lcdSetCursor(uint8_t col, uint8_t row) {
  static const uint8_t rowOffset[4] = {0x00, 0x40, 0x14, 0x54};
  if (row > 3) row = 3;
  if (col >= LCD_COLS) col = LCD_COLS - 1;
  lcdCommand((uint8_t)(0x80 | (rowOffset[row] + col)));
}

static void lcdLine(uint8_t row, const char* text) {
  char buf[LCD_COLS + 1];
  size_t n = strlen(text);
  if (n > LCD_COLS) n = LCD_COLS;
  memcpy(buf, text, n);
  for (size_t i = n; i < LCD_COLS; i++) buf[i] = ' ';
  buf[LCD_COLS] = 0;
  lcdSetCursor(0, row);
  for (uint8_t i = 0; i < LCD_COLS; i++) lcdData((uint8_t)buf[i]);
}

static void fmtTemp(char* out, size_t n, float value) {
  if (isnan(value)) snprintf(out, n, "--"); else snprintf(out, n, "%.1f", value);
}

static void fmtHum(char* out, size_t n, float value) {
  if (isnan(value)) snprintf(out, n, "--"); else snprintf(out, n, "%.0f", value);
}

static void fmtWind(char* out, size_t n, float value) {
  if (isnan(value)) snprintf(out, n, "--"); else snprintf(out, n, "%.2f", value);
}

static void drawReadingsPage() {
  char et[8], eh[8], ew[8], ct[8], ch[8], cw[8];
  char line0[LCD_COLS + 1], line1[LCD_COLS + 1];
  fmtTemp(et, sizeof(et), expC.temp);
  fmtHum(eh, sizeof(eh), expC.hum);
  fmtWind(ew, sizeof(ew), expC.wind);
  fmtTemp(ct, sizeof(ct), ctlC.temp);
  fmtHum(ch, sizeof(ch), ctlC.hum);
  fmtWind(cw, sizeof(cw), ctlC.wind);
  snprintf(line0, sizeof(line0), "E %sC %s%% %s", et, eh, ew);
  snprintf(line1, sizeof(line1), "C %sC %s%% %s", ct, ch, cw);
  lcdLine(0, line0);
  lcdLine(1, line1);
}

static void drawControlPage() {
  char line0[LCD_COLS + 1], line1[LCD_COLS + 1];
  char batt[8];
  if (isnan(battV)) snprintf(batt, sizeof(batt), "--"); else snprintf(batt, sizeof(batt), "%.1f", battV);
  snprintf(line0, sizeof(line0), "FAN %-3s LAMP %-3s", ctl.fan ? "ON" : "OFF", ctl.lamp ? "ON" : "OFF");
  const char* mode = ctl.manualActive ? "MAN" : "AUTO";
  const char* alert = ctl.level == SEV_CRITICAL ? "CRIT" : ctl.level == SEV_WARNING ? "WARN" : "OK";
  snprintf(line1, sizeof(line1), "%-4s %sV %s", mode, batt, alert);
  lcdLine(0, line0);
  lcdLine(1, line1);
}

static void drawStatusPage() {
  char line0[LCD_COLS + 1], line1[LCD_COLS + 1];
  snprintf(line0, sizeof(line0), "AGE %dd SP %.1fC", ctl.age, ctl.setpoint);
  snprintf(line1, sizeof(line1), "SD %s WIFI %s", storageSdOk() ? "OK" : "ERR", cloudWifiUp() ? "OK" : "--");
  lcdLine(0, line0);
  lcdLine(1, line1);
}

static void drawPage() {
  switch (page) {
    case 0:  drawReadingsPage(); break;
    case 1:  drawControlPage();  break;
    default: drawStatusPage();   break;
  }
}

void lcdBegin() {
  lastInitMs = millis();
  if (!lcdProbe()) {
    Serial.println("LCD: 1602 I2C not found (will retry)");
    return;
  }
  lcdInit();
  lcdOk = true;
  lastUpdateMs = 0;
  lastPageMs = millis();
  Serial.printf("LCD: 1602 I2C ready at 0x%02X\n", LCD_I2C_ADDR);
}

void lcdService() {
  uint32_t now = millis();
  if (!lcdOk) {
    if (now - lastInitMs < LCD_RETRY_MS) return;
    lastInitMs = now;
    if (!lcdProbe()) return;
    lcdInit();
    lcdOk = true;
    lastUpdateMs = 0;
    lastPageMs = now;
    Serial.printf("LCD: 1602 I2C ready at 0x%02X\n", LCD_I2C_ADDR);
  }

  if (now - lastUpdateMs < LCD_UPDATE_MS) return;
  lastUpdateMs = now;

  if (now - lastPageMs >= LCD_PAGE_MS) {
    lastPageMs = now;
    page = (uint8_t)((page + 1) % 3);
  }
  drawPage();
}

bool lcdPresent() { return lcdOk; }

#else

void lcdBegin() {}
void lcdService() {}
bool lcdPresent() { return false; }

#endif
