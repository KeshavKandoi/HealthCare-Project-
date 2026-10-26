# Patient appointments and hospital doctor profiles

## Setup

Run `npm run db:migrate` against an isolated development PostgreSQL database before deploying the API. Migrations `003_patient_appointments.sql`, `006_care_communications.sql`, `007_hospital_appointment_requests.sql`, and `008_plan_inquiries.sql` cover schedules, confirmed appointment chat/calls, hospital profile requests, and Holter purchase inquiries. These migrations have not been run against a hosted database here. Start the API with `npm start`; start `HealthCare` with `npm run dev`. Point `VITE_BASEURL` at the API `/api/v1` URL.

## Linking a hospital doctor

The public directory contains four St. John's Medical College Hospital profiles and two TriLife profiles. The supplied St. John's image endpoint returned silhouette placeholders, so the UI uses locally stored portraits from St. John's faculty pages. The two TriLife images are sourced from HexaHealth profiles. Verify image reuse permission before public release.

A profile does not imply that its doctor has a Heartline account. To enable booking:

1. Create the clinician's normal Heartline user and doctor records through the existing onboarding process.
2. Use `POST /api/v1/scheduling/operator/onboard` with `x-operator-key: <CLINICIAN_OPERATOR_KEY>` to verify and link the doctor record to that user.
3. Use `POST /api/v1/hospital-requests/operator/link` with the same operator header and JSON `{ "profileId": "st-johns-kiron-varghese", "doctorId": "<existing doctor id>" }`. The endpoint requires a verified, non-demo clinician.
4. The clinician signs in, opens `/clinician`, and publishes weekday availability. Patients then see open slots on `/doctors/hospital/<profileId>` and send a request to the linked doctor's inbox.
5. The clinician confirms or declines from the hospital request inbox. Confirmation creates a scheduled appointment and enables the existing appointment chat and video windows. The patient sees status and time in `/appointments`.

No email, SMS, or hospital portal delivery exists for appointment requests. Unlinked doctors show online booking unavailable; the UI never claims a request was delivered. Appointment times are stored in UTC and shown in Asia/Kolkata.

## Holter packages

`/subscription` shows proposed, non-binding launch estimates: ₹39,900 for the Holter device and ₹69,900 for a first-year device + care bundle. The bundle proposes four remote cardiology reviews, one year of maintenance/service, and one year of app access. The final device model, review capacity, taxes, delivery, commercial terms, and renewal price require a written quote. `POST /api/v1/plan-inquiries` saves a purchase inquiry for a signed-in patient. No payment or subscription activation is implemented. Demo inquiries are local sample data only.

## Current limits

A verified clinician account and published schedule are required for live bookings and direct messaging. WebRTC video still needs browser camera permission, a reachable signaling server, and a TURN service for reliability across restrictive networks. The database migrations and live clinician flow were not exercised here because an isolated PostgreSQL database and actual clinician accounts have not been provided.
