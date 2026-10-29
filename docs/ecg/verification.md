# ECG monitoring implementation and verification

## Diagnosis
The configured database contained five Browser stream sessions: 10 Hz, raw units, simulated=true, no firmware version. The inspected successive packets repeated exactly `[80,90,100,110,100,90,80,85,95,105]`. Those values cannot recover P/QRS/T morphology. The old live renderer also discarded packet timestamps and stretched each viewport to its own amplitude range.

The shared Canvas renderer now uses original samples and timestamps, stable amplitude scaling, explicit gaps, chronological extrema reduction, drag, horizontal/Shift scrolling, modifier-wheel zoom, time-window controls and a timeline scrollbar. Sparse input is displayed with straight sample-to-sample lines, with a low-rate notice. No smoothing or missing-sample reconstruction is applied. Pausing the display does not stop real acquisition. No filters or synthetic morphology are applied to physical data.

## Simulation
Open simulation in Live monitoring. Resting scenario v1 generates 250 Hz synthetic P/QRS/T morphology and independent BP. HR = 72 + 3 sin(t/30), systolic = 118 + 3 sin(t/45), diastolic = 76 + 2 sin(t/45). These are scenario parameters, not inference. Phase integrates HR to avoid discontinuities. Start/Pause/Resume/Stop and playback use the shared viewer. Runs are capped at five minutes. On Stop, signed-in runs are saved to a separate simulation table. Closing before Stop does not save an unfinished run. Demo-account runs remain local. Simulation never invokes alert services.

## Database setup
Run `npm run db:migrate` from HEALTHCARE before deploying the backend. Migration 013 creates isolated simulation/research tables and a timestamp index. It was applied to a temporary local PostgreSQL database only; production has NOT been migrated. The API checks patient ownership on every simulation read. No simulation is inserted into measured BP or physical ECG tables.

## Research BP limitations
No trained numerical model artifact, paired ECG/BP evaluation dataset or validated reference-monitor adapter was supplied. There are therefore NO BP accuracy results, no loaded model, and no real BP estimates. The visible real-device panel says “BP estimate unavailable — ECG-only input”.

`lib/ecgResearch.ts` provides typed replaceable inference contracts, conservative candidate R-peak features, calibration and quality prerequisite checks, uncertainty checks and unavailable responses. Candidate extraction is not a clinically validated QRS detector. The model/calibration/estimate tables are foundations, not a completed training or automatic monitor-import pipeline. The API deliberately runs without a model. No research output drives alerts.

## Hardware integration status
ESP32 + AD8232 is the stated hardware. No firmware or physical capture was supplied, so ADC scaling, gain, lead identity, actual clock cadence, lead-off handling and physical fidelity remain unverified. Use the existing authenticated `/api/v1/ecg/device/batches` contract, provisioned device credentials and assigned recording session; each packet carries sessionId, monotonic sequence, firstSampleAt, sampleRateHz and actual samples. Firmware must timestamp capture rather than upload, preserve unsent batches, and retry the identical sequence/payload. Never submit synthetic values through a physical device. Do not assume ESP32 ADC volts equal ECG millivolts.

## Verification
- Fixture: first 30 s, MLII, MIT-BIH record 100, 360 Hz. WFDB 212 decoded with both full-record checksums verified against the source header. Converted with header baseline 1024 and gain 200 ADC units/mV.
- Attribution: Moody G, Mark R (2005), MIT-BIH Arrhythmia Database v1.0.0, PhysioNet, https://doi.org/10.13026/C2F305. Open Data Commons Attribution License v1.0. Source: https://physionet.org/content/mitdb/1.0.0/ . This fixture is reference data, never patient data.
- Tests verify all 10,800 reference values and timestamps, gaps/overlaps, extrema order, source repetition, deterministic simulation and smooth BP changes, and unavailable-model/poor-quality gates.
- Isolated PostgreSQL integration passed: physical batch authentication, sequence handling/backfill, simulation persistence, patient isolation, invalid simulation duration and existing care/marker flows.
- Chrome verification passed: reference Canvas, mouse drag, modifier-wheel zoom, timeline, simulation Start/Pause/Resume/Stop, no runtime errors.
- Reference preview: run Vite locally and open `/qa/ecg.html`. It is a development verification entry, not part of the production bundle.

## Remaining acceptance work
Physical-device acquisition and calibration need actual firmware/captures. A trained and independently evaluated BP model and validated automatic reference-data adapter are not present. Full-recording waveform overview, 24-hour stress tests, touch-device verification, and reconnection browser automation remain outstanding; the current timeline is a scrollbar, not a downsampled full-recording overview. Do not describe this as clinically validated or complete hardware acceptance.

## Manual simulated Holter update
Manual connection now defaults to `Simulated Holter resting-v1`, a new 250 Hz/mV simulated device profile. Old Browser stream devices and 10 Hz sessions are not edited. No schema migration is required for this change. The frontend sends the shared generator's complete 250-sample packets; the backend verifies scenario identity, samples, clock and ownership before storing. Sample timestamps equal session start + sequence seconds, with 4 ms spacing. Accepted responses supply simulated vitals; the last stored vitals also appear in ECG History. The renderer reads stored packets, not a separate animation.

The isolated PostgreSQL integration test passed for ten packets / 2,500 samples. All stored samples equal the generator output exactly; BP matches scenarioVitals; duplicate retries are idempotent; another patient's upload is rejected. Physical ingestion regression tests passed in the same suite. Frontend build/typecheck passed. Production database and SMTP were not modified.

Manual-to-automatic visual comparison in the signed-in application has not yet been completed for this update; do not treat the earlier automatic-only browser check as verification of this new manual UI.
