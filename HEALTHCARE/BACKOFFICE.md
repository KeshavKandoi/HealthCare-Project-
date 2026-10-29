# Backoffice: live waveform control

Signing in on the normal login page with the backoffice email `keshavkandoi@gmail.com` and its password opens `/backoffice` instead of the patient workspace. The backoffice is the only place the shared live-waveform mode can be changed, and every simulated Live waveform panel follows it within a few seconds. A wrong password for that email falls through to ordinary patient sign-in, so it is rejected as usual. The backoffice session is separate from any patient session in the same browser, lasts 12 hours, and ends with **Sign out**.

| Mode | Live waveform panel |
| --- | --- |
| Normal (default) | The existing resting simulation, unchanged. |
| Off | The waveform disappears and the panel says “Leads are not connected”. No samples are sent, so the stored recording keeps a visible gap for that time. |
| High heart rate | Post-workout rhythm around 135–155 BPM with raised blood pressure. |
| Heavy breathing | Heart rate rising and falling with each breath, a wandering baseline and changing QRS height. |

The modes apply to the simulated Holter stream (**Live monitoring → Connect Holter → Manual connection**) only. A physical device always shows its own signal. Every simulated packet records the mode it was generated with, and the API checks the samples against that mode exactly, as before.

## API

- `POST /api/v1/backoffice/login` with `{email,password}` returns a signed bearer token. Attempts are limited to 10 per 15 minutes per address.
- `GET /api/v1/backoffice/session` checks a token.
- `GET /api/v1/backoffice/waveform` is public and returns `{mode,updatedAt}`; monitors poll it and also receive `backoffice:waveform` socket events.
- `PUT /api/v1/backoffice/waveform` with `{mode}` requires the token. `mode` is `normal`, `off`, `post-workout` or `heavy-breathing`.

The password is stored in source only as a scrypt hash. Tokens are signed with a key derived from `HEALTHCARE_OTP_SECRET`, so they survive restarts when that secret is set. The current mode is stored in `healthcare_private.backoffice_settings` (migration `014_backoffice_settings.sql`). The API also creates that table if it is missing, and without a database it keeps the mode in memory until restart.
