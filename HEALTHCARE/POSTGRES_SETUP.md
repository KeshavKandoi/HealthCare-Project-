# PostgreSQL setup

The backend uses PostgreSQL for application data and Supabase Auth for registration, login, and session validation. Passwords are held by Supabase Auth; new `app_users` profiles do not store them.

1. Copy `.env.example` to `.env` and set `DATABASE_URL` to your PostgreSQL connection URL. For Supabase, use a connection string from **Project Settings → Database → Connect**. URL-encode reserved characters in the password. Set `SUPABASE_URL` and the project's publishable API key for Supabase Auth. Keep the database URL on the backend only. `GEMINI_API_KEY` is only for the optional AI Doctor feature.
2. On a new, empty database, run `npm install` and `npm run db:migrate` from `HEALTHCARE/`. The migration creates the application tables and does not change Supabase Auth settings.
3. Run `npm start`. Startup checks the database schema before opening the API port.
4. Copy `HealthCare/.env.example` to `HealthCare/.env` and `../admin-panel/.env.example` to `../admin-panel/.env` if needed. Both frontends need `VITE_BASEURL` pointing to the backend API.

Do not run the migration against a populated database until its schema has been reviewed and backed up. The backend uses direct PostgreSQL access, so database access should be limited to the backend credential. For local integration tests, use an isolated local PostgreSQL instance and set `PG_TEST_DATABASE_URL` before `npm test`.
