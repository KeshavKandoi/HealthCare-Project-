# Family blood pressure text alerts

Migration `005_bp_alerts.sql` stores patient-selected limits, a caregiver-verified phone, and a per-recipient event log. Apply it with `npm run db:migrate` to the intended deployment database after review. The migration was tested only on a disposable local PostgreSQL instance.

## Connect a family phone

1. The patient opens **Family access**, invites the relative's account email, and enables notification permission for that invitation.
2. The relative signs in to their own account and accepts the invitation token shared by the patient.
3. On **BP alerts**, the relative enters their own phone in E.164 format (for example `+919876543210`), receives a Twilio Verify code, and confirms it. A patient cannot mark a relative's phone as verified.
4. The patient sets optional systolic and/or diastolic limits in mmHg and enables alerts. These should be chosen with their care team. Only newly entered BP readings above a configured limit create events. Old readings (over five minutes) do not generate delayed texts.
5. The patient can disable notifications or revoke the invitation. The relative can remove their verified phone.

## SMS setup

Add server-side values from your Twilio account to the environment (never to the browser):

```env
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_VERIFY_SERVICE_SID=VA...
TWILIO_MESSAGING_SERVICE_SID=MG...
```

Create a [Verify service](https://www.twilio.com/docs/verify) for phone confirmation and a [Messaging service](https://www.twilio.com/docs/messaging/services) with a sender that can reach intended recipients. Configure country and sender rules before enabling production traffic; see [Twilio's India SMS guidelines](https://www.twilio.com/en-us/guidelines/in/sms) if sending to Indian numbers. Domestic India traffic may require DLT registration and approved message templates.

The server processes pending events every 10 seconds when all four settings are present. It expires unsent events after 10 minutes. The UI distinguishes `pending`, `submitted` (accepted by Twilio, **not confirmed delivered**), `failed`, and `expired`. No SMS is sent in demo mode or when the provider is absent. There is no delivery-status webhook or emergency escalation. Confirm readings and urgent symptoms through ordinary clinical channels.

## Doctor directory

The external directory has four St. John's cardiology profiles and two cardiologists linked to TriLife Hospital (formerly Specialist Hospital) in Kalyan Nagar. Profiles and portraits link to the source sites. They are separate from Heartline's bookable clinician roster. See [CARE_COMMUNICATIONS.md](CARE_COMMUNICATIONS.md) for appointment messaging and video access.
