// Local 1602 I2C LCD status display (PCF8574 backpack, shares the DS3231 bus).
#pragma once
#include <Arduino.h>

void lcdBegin();          // probe + initialise; safe if the LCD is missing
void lcdService();        // non-blocking, call every loop
bool lcdPresent();        // true after a successful probe + init
