# ECG Feature 5: implementation and limits

This subsystem requires migrations `002_ecg.sql` and `004_monitoring_care.sql`. Apply them to an isolated development PostgreSQL database first with `npm run db:migrate`. `001_postgres.sql` is retained for the existing application.

## Confirmed hardware contract

No firmware source, board model, serial baud rate, sample rate, ADC calibration, packet shape, or lead configuration is present in this repository. Physical hardware transport remains unverified. Do not configure `mV` units until calibration is confirmed. No serial or Wi-Fi adapter is activated by default.

## Provisioning and pairing

Start the backend using `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ECG_OPERATOR_KEY`, `CORS_ORIGINS` and `PORT`; start the frontend with `VITE_BASEURL=http://localhost:4000/api/v1`. A trusted operator provisions a device with `POST /api/v1/ecg/operator/devices` and header `X-Operator-Key`, passing independently verified `sampleRateHz`, `units` (`raw` or calibrated `mV`) and optional `model`. The response contains a one-time `deviceSecret`; store it only in trusted firmware or gateway configuration. Never send it to the patient browser. The patient generates a five-minute code at `/devices`; the trusted gateway sends that code to `POST /api/v1/ecg/device/pair` with `X-Device-Id` and `X-Device-Secret`. The patient checks pairing, then starts a server-side recording. Firmware is not commanded to start or stop.

The gateway sends `POST /api/v1/ecg/device/batches` with the same device headers and JSON `{sessionId,sequence,firstSampleAt,sampleRateHz,samples}`. Sequences are zero-based and must be contiguous. An identical retry returns `duplicate:true`; a gap returns HTTP 409 with `expectedSequence`, so the gateway waits for the missing batch. Older sample timestamps within the study window are accepted for delayed sync, including after study completion for 14 days. Conflicting contents, future timestamps, out-of-window data, excessive batches and mismatched rates are rejected. A heartbeat can report supported battery percent, queued batch count, sync failures and firmware version. After unpairing, the credential is revoked and must be rotated by a trusted operator before reuse.

The TypeScript gateway `npm run ecg:gateway` accepts one validated batch JSON object per input line, writes it to a private local queue before upload, and retries pending files every five seconds while running. It deletes a queued file only after an accepted or identical duplicate response. Configure `ECG_DEVICE_ID`, `ECG_DEVICE_SECRET`, `ECG_API_URL`, and `ECG_QUEUE_DIR` in its trusted runtime; never put a device secret in the browser. Hardware capture and serial transport still require the firmware contract. See `MONITORING_FEATURES.md` for the monitoring, report, clinician, caregiver, FHIR, and support endpoints.

## Browser manual connection

Signed-in users can open **Live monitoring → Connect Holter → Manual connection**, paste the supported `RANDOM % 40 + 60` / `jot -r 10 80 120` loop or JSON, and select **Connect and start**. No local receiver, operator secret, or terminal is needed. The app extracts settings only: it never executes pasted shell text, uses its configured API, and derives the patient from the authenticated session rather than any pasted patient ID.

JSON example: `{"packets":300,"values":[80,90,100,110,100,90,80,85,95,105],"bpm":75}`. Each packet has 10 raw samples and a supplied BPM. The loop produces random samples and BPM. The stream is marked simulated throughout the existing history/report system. It does not contain blood pressure and does not send medical alerts. Keep the page open; Stop stream or normal completion finalizes the recording. Abruptly closing the browser may leave an active recording; Complete recording or starting a new browser run closes it. A five-second absence of packets shows no recent signal.

Deploy both frontend and backend changes. The existing `011_simulated_ecg.sql` migration must be present; missing `is_simulated` columns previously caused the generic ECG request failure. Start requests are rate limited, uploads are scoped to the authenticated account and browser-created simulated device, and sequences/ranges are validated. ECG operator credentials are never sent to the browser.

## Simulator

For a quick local test in the **Demo workspace**, stop any process already using port 4000, then run `npm run ecg:local-demo` from `HEALTHCARE`. Keep the receiver running and start the Vite development frontend separately. Open Live monitoring as a demo patient, start a recording, and send the existing `patientId`, `values`, and `bpm` packets to `http://localhost:4000/api/v1/ecg/data`. Complete the recording and open ECG recordings to review it. The receiver reports rejected packets; use `curl --fail-with-body` to see HTTP failures rather than suppressing them. This receiver replaces the normal API on port 4000 for this local demo only and does not access the database or send alerts. Recordings remain in the current browser tab. The random values and BPM are simulated, not blood pressure or a clinical ECG.

For the authenticated simulator below, run migration `011_simulated_ecg.sql` before starting this version. Use a dedicated test account and device; simulated readings are labeled in the monitor, recording history, downloaded data, and technical report. They are excluded from caregiver and clinician recording lists and care-plan progress. A clinical review cannot be signed for them.

1. Set a private `ECG_OPERATOR_KEY` on the local server and start the server. Provision a simulated device (the shell variable below must contain the same operator key):

   ```sh
   curl -X POST http://localhost:4000/api/v1/ecg/operator/devices \
     -H 'Content-Type: application/json' -H "X-Operator-Key: $ECG_OPERATOR_KEY" \
     -d '{"model":"Test simulator","sampleRateHz":10,"units":"raw","isSimulated":true}'
   ```

   Save the returned `deviceId` and `deviceSecret` privately. The secret is only shown once.
2. Sign in to the dedicated test account, open **My Devices**, and generate a pairing code. Pair from a trusted terminal with the returned device ID and secret:

   ```sh
   curl -X POST http://localhost:4000/api/v1/ecg/device/pair \
     -H 'Content-Type: application/json' \
     -H "X-Device-Id: $ECG_DEVICE_ID" -H "X-Device-Secret: $ECG_DEVICE_SECRET" \
     -d '{"code":"REPLACE_WITH_PAIRING_CODE"}'
   ```

3. In **Live monitoring**, select the test device and start a recording. Copy its test session ID from the recording timeline. Set `ECG_DEVICE_ID`, `ECG_DEVICE_SECRET`, `ECG_SESSION_ID`, `ECG_SAMPLE_RATE_HZ=10`, and, if needed, `ECG_API_URL=http://localhost:4000/api/v1/ecg` in the terminal or backend `.env`.
4. From `HEALTHCARE`, run `npm run ecg:simulate -- 300`. Each success line means the server accepted that one-second batch. The command stops on an HTTP error and reports the reason. After it finishes, complete the recording in the monitor and open **ECG recordings** for the technical report and original data download.

The synthetic waveform is not a physiological measurement. The simulator does not derive heart rate, blood pressure, glucose, or a diagnosis, and does not trigger medical alerts. Use a real, independently measured value to test the corresponding alert workflow. When resuming an interrupted session, inspect the recording's `last_sequence` and set `ECG_START_SEQUENCE` to the next sequence. An unconfirmed packet may have been stored despite a network error; check the session before resuming.

## Storage and operations

Waveform batches are chunked as JSONB rows, not per-sample rows. Hashes detect chunk corruption in future integrity checks. Private database role access is required; Supabase `anon` and `authenticated` roles are revoked in the migration. Patient API authorization checks the signed existing JWT and scopes all reads to its identity. Socket rooms are derived from the signed JWT. Use HTTPS for deployed network traffic. Backups, retention period, deletion workflow, restricted database roles, operator key rotation, monitoring and clinical validation remain deployment work. No medical alerts or BPM inference are implemented.

## Known limitations

Physical hardware, transport, and high-rate load have not been verified against the missing firmware. Migration 001–004 has been checked on isolated PostgreSQL 18. History rendering shows a bounded waveform and does not expose full playback controls. Operator provisioning uses an environment key and should sit behind private network access. This feature is not a certified diagnostic device.
