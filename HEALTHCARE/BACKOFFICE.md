# Backoffice: live waveform control

Signing in on the normal login page with the backoffice email `keshavkandoi@gmail.com` and its password opens `/backoffice` instead of the patient workspace. A wrong password for that email falls through to ordinary patient sign-in, so it is rejected as usual. The backoffice session is separate from any patient session in the same browser, lasts 12 hours, and ends with **Sign out**.

The backoffice sets one shared waveform mode. **Live monitoring** (`/ecg-monitor`) has no connection steps: it always shows a live ECG sweep with heart rate, blood pressure and leads status for the selected mode, and every open monitor switches within about two seconds.

| Mode | Live monitoring |
| --- | --- |
| Normal (default) | Resting rhythm, about 70–95 BPM. |
| Off | The waveform disappears and the panel says “Leads are not connected”; readings show “—”. |
| High heart rate | Post-workout rhythm around 135–155 BPM with raised blood pressure. |
| Heavy breathing | Heart rate rising and falling with each breath, a wandering baseline and changing QRS height. |
| High blood pressure | About 170/105 mmHg with a steady rhythm. Each selection also sends one TEST alert by email, SMS and voice call to the operator's configured contacts; see BP_ALERTS.md. |

The waveform is generated in the browser from `lib/ecgSimulation.ts` on the wall clock, so every monitor and the backoffice preview show the same moment of the same signal. Live monitoring does not create recordings.

## API

- `POST /api/v1/backoffice/login` with `{email,password}` returns a signed bearer token. Attempts are limited to 10 per 15 minutes per address.
- `GET /api/v1/backoffice/session` checks a token.
- `GET /api/v1/backoffice/waveform` is public and returns `{mode,updatedAt}`; monitors poll it, and the change is also broadcast as a `backoffice:waveform` socket event.
- `PUT /api/v1/backoffice/waveform` with `{mode}` requires the token. `mode` is `normal`, `off`, `post-workout`, `heavy-breathing` or `high-bp`.

The password is stored in source only as a scrypt hash. Tokens are signed with a key derived from `HEALTHCARE_OTP_SECRET`, so they survive restarts when that secret is set. The current mode is stored in `healthcare_private.backoffice_settings` (migration `014_backoffice_settings.sql`). The API also creates that table if it is missing, and without a database it keeps the mode in memory until restart. The simulated-packet API (`/ecg/manual/simulated/...`) also accepts these modes for scripted recordings.
