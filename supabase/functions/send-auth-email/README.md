# Supabase Auth email hook

This function sends signup and password recovery codes using Resend. Supabase Auth generates and verifies the codes; the hook verifies Supabase's webhook signature before sending. It rejects other email actions, so do not enable it if invite, magic-link, email-change, or reauthentication emails are needed until those actions are implemented.

Configure these Edge Function secrets in the Healthcare Supabase project:

- `RESEND_API_KEY`: a Resend key authorized to send from the verified domain.
- `RESEND_FROM_EMAIL`: a sender address on that verified domain.
- `SEND_EMAIL_HOOK_SECRET`: the signing secret generated for the Send Email auth hook, including the `v1,whsec_` prefix.

Deploy `send-auth-email` with JWT verification disabled (the function verifies the webhook signature), then enable the Send Email hook for this function. Configure all three secrets before enabling the hook: enabling it replaces Supabase's sender for all Auth emails. Test signup and password recovery with a real inbox. Do not put these secrets in client code or Git.
