# Account email codes

Heartline sends signup and password reset codes directly through Resend and stores account credentials, hashed code challenges, and hashed session tokens in the private PostgreSQL schema. Existing Supabase Auth accounts can continue to sign in; password recovery verifies the email with a Heartline code and preserves any existing profile.

Before deploying this code:

1. Apply `migrations/010_account_auth.sql` to the Supabase PostgreSQL database. `npm run db:migrate` also applies this migration and the existing migrations; run it only against the intended database.
2. Set `HEALTHCARE_OTP_SECRET` to a new, independent random secret of at least 32 characters in Render. For example, generate one locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store it as a secret; never commit it or send it in chat.
3. Set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on Render. The sender must belong to a domain verified in the Resend account associated with the key, such as `noreply@healthcare.workforge.tech`.
4. Deploy the backend and frontend, then test signup, verification, login, password reset and logout with a real inbox. Resend delivery and the actual deployed environment must be tested separately from local tests.

The existing client uses bearer tokens in browser local storage. Session records are stored as hashes, refresh tokens rotate, password changes revoke sessions, and logout revokes application-owned sessions. Existing Supabase sessions continue to use Supabase's session handling.
