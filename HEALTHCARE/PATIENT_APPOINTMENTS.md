# Patient health and appointment implementation

## Setup

Run `npm run db:migrate` only against an isolated development PostgreSQL database first. Migration `003_patient_appointments.sql` is additive and adds normalized patient records and a separate appointment subsystem. It has not been applied to the hosted database. Start `HEALTHCARE` with `npm start` and `HEALTHCARE/HealthCare` with `npm run dev`; set the frontend `VITE_BASEURL` to the backend `/api/v1` URL.

## Identity and booking

`/api/v1/my-health` and `/api/v1/scheduling` derive patient identity from the signed existing JWT. Record writes always scope to that identity. Scheduling only lists verified onboarded doctors; production excludes demo doctors. A trusted operator links an existing doctor record to an existing user via `/scheduling/operator/onboard` using `CLINICIAN_OPERATOR_KEY`. That clinician logs in with the existing user account, opens `/clinician`, and publishes weekday rules. The patient opens `/appointments/doctors`, chooses a real slot, and requests it. The clinician accepts or rejects it. The PostgreSQL GiST exclusion constraint prevents two active overlapping reservations, even under concurrent requests. Requests expire after 24 hours on the next slot lookup or booking attempt, releasing their reservation. Times are stored in UTC and shown in Asia/Kolkata.

For fictional development clinicians, create doctor and user records in an isolated database, onboard them with `demoOnly:true`, and set `ENABLE_DEMO_CLINICIANS=true` locally. Label them `Demo Cardiologist 01` etc. No demo clinicians are seeded in production. External Narayana Health profiles are links to their official pages only and cannot be booked within Heartline.

## Limitations

Private object storage and malware screening are not configured, so document upload is intentionally unavailable. The legacy health risk scoring endpoint is retired. The old booking endpoint is retired because it accepted arbitrary patient IDs and unverified slots. Historical legacy appointments remain in their existing table; the new appointment page shows bookings from the secure normalized system. Clinician leave, consultation note editing/release UI, explicit ongoing medical record sharing consent, and appointment notifications need further implementation. No production database migration, live clinician verification, browser end-to-end booking, or concurrent database test was performed.
