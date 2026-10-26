# Monitoring and care workflow

Migration `004_monitoring_care.sql` adds symptom markers, clinician annotations and signed reviews, monitoring plans, caregiver grants, telemetry and support requests. `npm run db:migrate` was verified on an isolated PostgreSQL 18 instance with local Supabase-style roles. No hosted database was changed.

## Patient workflow

- Start a 24 or 72 hour study from `/ecg-monitor`. During an active recording, each symptom button captures the browser timestamp immediately. A tab-scoped pending queue retries an idempotent marker request when connectivity returns. The server checks study ownership and time bounds. The technical report links each marker to a stored ECG batch and sample offset once that batch arrives.
- `/ecg-history/:id` shows actual elapsed duration, union of received sample intervals, sequence gaps, device events, symptom links, and available clinician recorded measurements. Stored sample coverage does **not** certify signal quality. Print the technical report or download the original waveform JSON.
- `/care-plans` displays clinician instructions, target duration, recorded hours and review date. `/family-access` supports explicit scopes, a one-time invitation token, matching account email, permission edits, and revocation. Invitations are copied and shared by the patient; no email is sent. Notification permission is stored but no notification service is active.
- `/device-support` shows device-reported telemetry history, pairing events, troubleshooting, and support or replacement requests. A battery value appears only if firmware reports it. Admins can view fleet diagnostics and manage requests in the separate admin panel.
- `/my-health` downloads an FHIR R5 collection Bundle with Patient, Observation, AllergyIntolerance, MedicationStatement and ECG DiagnosticReport resources. The export preserves source labels and does not include the raw ECG waveform. It is an interoperability starting point, not a certified EHR integration.

## Clinician workflow

`/clinician/ecg` requires a verified doctor profile and a confirmed/completed appointment or active patient consent. Doctors can inspect stored chunks, add timestamped annotations in separate records, and create plans for a device assigned to that patient. They can sign and release one immutable summary per study. `ECG_REVIEW_SIGNING_KEY` is required; the API stores an HMAC attestation and verifies it when the patient opens the report. Key management and identity assurance remain deployment work.

## Trusted gateway

`npm run ecg:gateway` reads newline-delimited batch JSON from stdin and writes each batch to a private queue directory before upload. Run it under a process supervisor, connected to a verified firmware or serial adapter. It retries after network restoration, honors server sequence ordering, and treats identical retries as success. The device must itself retain samples while disconnected if gateway input is unavailable. Actual firmware, memory capacity, sample clock, and calibration are still needed to validate physical 24/72 hour recording. No browser stores device credentials.

## Localization and interface

The patient shell has a selector for 30 Indian languages plus English, with translated navigation labels and locale-aware dates on the dashboard and care plan. Clinical forms and long explanations still need professional translation and validation before they can be presented as fully localized care instructions. Interface motion uses restrained CSS transitions and honors `prefers-reduced-motion`.
