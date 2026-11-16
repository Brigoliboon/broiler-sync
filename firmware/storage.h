// microSD logging (CSV), RAM fallback ring buffers and the "what is still unsent" pointers.
#pragma once
#include <Arduino.h>

// CSV record layout (also used to build the JSON that is uploaded)
extern const char* const CSV_COL_NAMES[];
extern const char CSV_COL_TYPES[];   // S=string F=float I=int B=bool(0/1) A=array (items split on '|')
extern const int CSV_NCOLS;

void storageBegin();
void storageService();                              // SD re-mount, ring -> SD flush
bool storageSdOk();
void storageLogRecord(const char* reason);          // snapshot of current state -> CSV (SD or ring)
void storageAppendEvent(const String& jsonLine);    // alert/info event (JSON line)

// Unsent data. Peek returns up to maxLines lines (0 = nothing pending); after a successful upload
// call Commit to move the pointer. Without Commit the same lines are returned again (retry).
int  storagePeekReadings(String* lines, int maxLines);
void storageCommitReadings();
int  storagePeekEvents(String* lines, int maxLines);
void storageCommitEvents();
