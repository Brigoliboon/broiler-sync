// DS3231 real-time clock + NTP fallback. All times are LOCAL (TZ_OFFSET_MIN).
#pragma once
#include <Arduino.h>
#include <RTClib.h>

void     clockBegin();
void     clockService();          // call every loop (does work once per second)
void     clockOnWifiUp();         // start NTP (once)
bool     clockValid();            // true when we trust the date/time
bool     clockRtcPresent();
DateTime clockNow();              // last cached local time
uint32_t clockEpoch();            // naive local seconds since 1970 (0 if invalid)
int32_t  clockDayNumber();        // days since 1970-01-01 local (-1 if invalid)
uint32_t clockDateKey();          // YYYYMMDD (0 if invalid)
void     clockIso(char* out, size_t n);          // "2026-11-12T11:48:00+08:00" or "" if invalid
void     clockIsoFrom(const DateTime& dt, char* out, size_t n);
