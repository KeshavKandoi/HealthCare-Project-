# Family blood pressure alerts

Migration `005_bp_alerts.sql` stores patient-selected limits, caregiver phone verification, and per-recipient email and voice submission status. Run `npm run db:migrate` against the intended database before deploying this version.

## Connect a caregiver

1. The patient opens **Family access**, invites a relative by email, and enables notification permission for that invitation.
2. The relative signs in and accepts the invitation. Resend can then send alerts to the invitation email address.
3. For voice calls, the relative verifies their own phone on **BP alerts** with Twilio Verify. A patient cannot mark the phone as verified.
4. The patient sets systolic and/or diastolic limits in mmHg and enables alerts. Only newly entered readings above the limit create events. Readings more than five minutes old do not create delayed alerts.
5. The patient can disable notifications or revoke the invitation. The relative can remove their verified phone, which stops voice calls but not email.

## Render environment

```env
RESEND_API_KEY=...
RESEND_FROM_EMAIL=alerts@your-verified-domain.example
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
TWILIO_VOICE_FROM=+12345678900
```

Resend requires a verified sending domain and API key. The email address must be on that domain. The Twilio number must be a caller ID allowed by your account; for the trial, use the voice trial number shown in **Communications → Voice → Overview → Try out Voice**. Trial calls can reach only Twilio-verified numbers and are limited to the account's country and free-minute balance. The trial may reject custom outbound call instructions even though it supports restricted custom TwiML; confirm a real test call before relying on voice delivery. The former `TWILIO_MESSAGING_SERVICE_SID` is not used by these alerts.

The server starts the alert worker when at least one delivery channel is configured. Email and voice are attempted independently. The activity table shows `submitted` when the provider accepts a request, not confirmed delivery or that the recipient read/heard the alert. The worker does not retry a rejected request. Events expire after ten minutes if still pending. Do not treat this feature as an emergency response system.
