# Family blood pressure alerts

Migrations `005_bp_alerts.sql` and `012_bp_sms.sql` store patient-selected limits, caregiver phone verification, and per-recipient email, SMS and voice submission status. Run `npm run db:migrate` against the intended database before deploying this version.

## Connect a caregiver

1. The patient opens **Family access**, invites a relative by email, and enables notification permission for that invitation.
2. The relative signs in and accepts the invitation. Resend can then send alerts to the invitation email address.
3. For SMS or voice calls, the relative verifies their own phone on **BP alerts** with Twilio Verify. A patient cannot mark the phone as verified.
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
TWILIO_SMS_FROM=+12345678900
```

Resend requires a verified sending domain and API key. The email address must be on that domain. The Twilio number must be a caller ID allowed by your account; for the trial, use the voice trial number shown in **Communications → Voice → Overview → Try out Voice**. Trial calls can reach only Twilio-verified numbers and are limited to the account's country and free-minute balance. The trial may reject custom outbound call instructions even though it supports restricted custom TwiML; confirm a real test call before relying on voice delivery. The former `TWILIO_MESSAGING_SERVICE_SID` is not used by these alerts.

For SMS, `TWILIO_SMS_FROM` must be an SMS-capable sender available to the account and destination. Twilio's current restricted trial permits predefined SMS templates rather than this custom alert text, and requires recipients to be verified in Twilio; the trial may therefore reject these custom alerts even when free units remain. The app's caregiver phone verification and Twilio's trial recipient verification are separate checks. See https://www.twilio.com/docs/usage/trials/try-out-sms. Do not assume the trial demo number can be used for custom alerts. Configure an eligible sender and test with a consenting recipient.

The server starts the alert worker when at least one delivery channel is configured. Email, SMS and voice are attempted independently. The activity table shows `submitted` when the provider accepts a request, not confirmed delivery or that the recipient read/heard the alert. The worker does not retry a rejected request. Events expire after ten minutes if still pending. Do not treat this feature as an emergency response system. ECG samples and random BPM values are not blood pressure readings and never trigger these alerts.

## Backoffice High blood pressure test alerts

Selecting **High blood pressure** in the Backoffice sets the monitors to a simulated hypertensive reading (about 170/105 mmHg) and sends one test alert: an email through Resend, an SMS and a voice call through Twilio. Each channel is attempted independently, once per click. A retried or repeated request never resends, and a submission interrupted part-way is marked failed rather than retried, to avoid duplicate messages or calls. The email and SMS contain the reading and time; the call uses a neural voice at a measured pace and repeats the message once.

Test alerts go only to contacts the operator sets on the server, never to patients or caregivers:

```env
BP_TEST_ALERT_ACCOUNT=you@example.com     # Heartline account that sees the test alerts on its BP alerts page
BP_TEST_ALERT_EMAIL=you@example.com       # optional; defaults to BP_TEST_ALERT_ACCOUNT
BP_TEST_ALERT_PHONE=+919876543210         # SMS and voice; on a Twilio trial this number must be verified in Twilio
BP_TEST_ALERT_TIMEZONE=Asia/Kolkata       # optional; time shown in the alert
```

Nothing is sent until `BP_TEST_ALERT_ACCOUNT` is set; setting these variables is the approval for live deliveries. The existing `RESEND_*` and `TWILIO_*` variables above are reused.

Test alerts are stored in `healthcare_private.bp_test_alerts` (migration `015_bp_test_alerts.sql`; the API also creates it if missing), separate from genuine patient alerts. The configured account sees them under **Monitoring test alerts** on its BP alerts page, marked TEST, with the reading, time, source, recipient and an expandable per-channel history. Statuses come from the providers: **Pending** before submission, **Submitted** once Resend or Twilio accepts it, **Delivered** only when Resend reports delivery, Twilio reports an SMS delivered or a call completed, and **Failed** when the provider rejects or reports failure. The server polls the providers for up to two hours after an alert. A completed call means it was answered, which may include voicemail.
