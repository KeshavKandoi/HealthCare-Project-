# ESP32 USB bridge

The bridge forwards newline-delimited JSON batches from a serial port to the existing authenticated offline gateway. It does not interpret arbitrary ADC text or create timing information. USB runs on the computer connected to the ESP32, not on Render.

1. Install Python pyserial (`python3 -m pip install pyserial`) and run `npm run build` in `HEALTHCARE`.
2. Provision and pair the physical device using the existing operator and pairing flow. Start a recording in Heartline. Configure `ECG_DEVICE_ID`, `ECG_DEVICE_SECRET` and `ECG_API_URL` for the existing gateway without sharing credentials.
3. Run `python3 scripts/usb-ecg-bridge.py /dev/cu.usbserial-... --baud 115200` from `HEALTHCARE`, using the actual serial port and firmware baud rate.
4. Firmware must send one JSON object per line with `sessionId`, integer `sequence` beginning at zero, `firstSampleAt` (UTC ISO timestamp of the first acquired sample), `sampleRateHz`, and `samples` (ordered numeric ADC values). Rate must match the provisioned device. A trusted clock and reliable sample acquisition are required. Keep samples in `raw` units until independently calibrated.

The existing gateway queues accepted serial lines on disk and uploads in order with device credentials. The serial bridge itself does not buffer data that the ESP32 sends while the bridge is disconnected, cannot guarantee lossless acquisition or detect missing serial packets without firmware sequence/timing support, and does not control the device. The gateway queue contains sensitive ECG data and should be protected and removed according to your data-retention practices.

ESP32 firmware and actual capture format were not provided; this integration has not been verified with hardware. AD8232 measures ECG, not blood pressure. Do not use this prototype for clinical decisions without device validation, isolation, calibration, and safety review.

## Example ESP32 firmware and Node USB gateway

`HEALTHCARE/firmware/heartline_esp32/heartline_esp32.ino` targets a **classic ESP32** at 250 Hz and 115200 baud. Wire AD8232 3.3V to ESP32 3V3, GND to GND, OUTPUT to GPIO34 (ADC1), LO+ to GPIO25 and LO− to GPIO26. Pin names and lead-off polarity vary between boards; verify the board documentation and DC lead-off configuration. Do not apply a voltage outside ESP32 ADC limits. These pins are not a universal mapping for ESP32-S2/S3/C3 variants.

**Electrical safety:** Do not attach electrodes to a person while this prototype is connected to USB or any unisolated computer/power supply. Initial tests must use an ECG signal generator. The AD8232 evaluation board is not a comprehensive patient-protection system; see [Analog Devices safety guidance](https://www.analog.com/media/en/technical-documentation/user-guides/AD8232-EVALZ_UG-514.pdf).

Use Arduino IDE with the matching Espressif ESP32 board package and board selection, open the sketch, select the USB port and upload. The sketch emits one JSON line per acquisition: `i` (sample slot), `t` (32-bit device monotonic microseconds), `v` (12-bit ADC counts), and `l` (lead-off boolean). Missed slots increment the index; lead-off samples are not forwarded as signal. This is a prototype using `analogRead` and serial printing, not a verified hard real-time acquisition system.

Build the backend, provision a **raw**, 250 Hz physical device using the existing operator endpoint and pair it with the code on My Devices. Create a new recording for that device in Live monitoring. Set `ECG_DEVICE_ID`, `ECG_DEVICE_SECRET`, and `ECG_API_URL` as required by the existing gateway, then run on macOS:

```
node scripts/usb-serial-gateway.mjs /dev/cu.YOUR_PORT YOUR_RECORDING_UUID
```

The Node bridge configures 115200 baud and forwards 25-sample batches to the existing authenticated queue. It derives UTC from the host clock at first receipt and ESP32 monotonic time, so USB latency and host clock accuracy affect absolute timestamps. It starts sequence numbers at zero and therefore requires a fresh recording each time; after disconnect or reset, start another recording. During lead-off or skipped slots it leaves gaps. The prototype does not ensure serial backpressure, durable storage before gateway enqueue, or recovery of data produced while disconnected. Avoid concurrent connections to the serial port. The existing queue stores sensitive ECG data locally; secure it.

Verify with a signal generator: capture serial output, compare sample indices and monotonic timestamps over several minutes to 250 Hz, check for skipped indices, exercise both lead-off inputs, and inspect the saved waveform and gaps. Measure ADC offset, gain, attenuation and front-end gain against known inputs before deriving mV; the sketch reports raw counts only and does not calculate BP or clinically verified signal quality. Physical hardware and firmware compilation have not been tested in this environment.
