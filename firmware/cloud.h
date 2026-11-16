// Wi-Fi, config download, batched upload with backfill.
#pragma once
#include <Arduino.h>

void cloudBegin();
void cloudService();                       // non-blocking apart from short HTTP calls
void cloudRequestSyncNow();                // immediate upload (also restarts the 5-min countdown)
bool cloudWifiUp();
