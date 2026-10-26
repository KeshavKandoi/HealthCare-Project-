# PostgreSQL setup

The backend now uses PostgreSQL for users, doctors, appointments, health records, ECG records, and contact messages. The existing application login remains password plus JWT; Supabase Auth and verification email are not part of this change.

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection URL. For Supabase, use a connection string from **Project Settings → Database → Connect**. URL-encode reserved characters in the password. Keep the URL and `JWT_SECRET` server-side only. A Supabase API key is not needed for this direct PostgreSQL connection. `GEMINI_API_KEY` is only for the optional AI Doctor feature.
2. On a new, empty database, run `npm install` and `npm run db:migrate` from `HEALTHCARE/`. The migration creates the six application tables. It does not import MongoDB data or change Supabase Auth settings.
3. Run `npm start`. Startup checks the connection and all six tables before opening the API port.
4. Copy `HealthCare/.env.example` to `HealthCare/.env` and `../admin-panel/.env.example` to `../admin-panel/.env` if needed. Both frontends need `VITE_BASEURL` pointing to the backend API.

Do not run the migration against a populated database until its schema has been reviewed and backed up. Existing MongoDB records require a separate data export/import; this schema migration does not move them. The backend uses direct PostgreSQL access, so database access should be limited to the backend credential. For local integration tests, use an isolated local PostgreSQL instance and set `PG_TEST_DATABASE_URL` before `npm test`.
