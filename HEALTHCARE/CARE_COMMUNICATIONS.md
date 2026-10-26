# Appointment messages and video

Migration `006_care_communications.sql` adds appointment-scoped message and call-history tables. Run `npm run db:migrate` on the reviewed target database, then restart the backend. The frontend route is `/care-conversations`.

Only the patient and the verified Heartline clinician assigned to a confirmed or completed appointment can read or send its messages. Video calls are limited to confirmed appointments from 15 minutes before the scheduled start until 30 minutes after the scheduled end. Calls record status and timestamps, not audio or video. External St. John's and TriLife profile cards have no Heartline account, so patients cannot contact those doctors in-app unless the clinicians are onboarded separately.

Video uses browser WebRTC with authenticated Socket.IO signaling and a public STUN server. Both participants must sign in and grant camera and microphone access. For reliable production connectivity across restrictive networks, configure a managed TURN service and test two devices; there is no TURN relay, recording, or clinical emergency escalation yet. The demo shows a local sample chat and disables video. The API and appointment authorization were integration-tested against a disposable PostgreSQL instance; a two-party browser call has not been verified.
