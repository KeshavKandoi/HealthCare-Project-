// Research prototype for classic ESP32; never connect a person to an unisolated USB system.
#include <Arduino.h>
constexpr int ECG_PIN = 34, LO_PLUS = 25, LO_MINUS = 26;
constexpr uint32_t PERIOD_US = 4000;
uint32_t nextSample, indexCount = 0;
void setup() {
  Serial.begin(115200);
  pinMode(LO_PLUS, INPUT); pinMode(LO_MINUS, INPUT);
  analogReadResolution(12);
  nextSample = micros() + PERIOD_US;
}
void loop() {
  uint32_t now = micros();
  if ((int32_t)(now - nextSample) < 0) return;
  // Skip missed acquisition slots; the index exposes gaps instead of inventing samples.
  uint32_t missed = (uint32_t)(now - nextSample) / PERIOD_US;
  indexCount += missed; nextSample += (missed + 1) * PERIOD_US;
  bool leadOff = digitalRead(LO_PLUS) || digitalRead(LO_MINUS);
  int raw = analogRead(ECG_PIN);
  Serial.printf("{\"i\":%lu,\"t\":%lu,\"v\":%d,\"l\":%s}\n", (unsigned long)indexCount++, (unsigned long)now, raw, leadOff ? "true" : "false");
}
