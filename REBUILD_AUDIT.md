# Smart Healthcare rebuild audit — 26 October 2026

## What is in this working tree

The branch is `feature/supabase-foundation`. ECG monitoring, patient health records, and scheduling code from the earlier requests remains uncommitted alongside the current rebuild. The public landing page, navigation, patient workspace, and ECG pages have been revised. Experimental AI access is disabled by default. Legacy pricing claims were removed.

TypeScript now covers the patient frontend entry point, router, store, authentication flow, API client, shared domain types, homepage, patient records, scheduling workspace, and ECG pages. The backend entry point and patient/admin authentication boundaries are TypeScript. The admin panel now has a typed entry point, router, store, API client, administrator login/session flow, and guarded routes. The remaining React components, Redux modules, backend routes, controllers, models, and scripts still contain JavaScript. `tsconfig.json` is strict in all three packages, but `allowJs` remains enabled for migration. This is **not** a complete TypeScript conversion.

## Verification completed

- Frontend `npm run build` runs strict `tsc --noEmit` and Vite, both passing. Route level lazy loading reduced the initial JavaScript bundle from about 975 kB to about 333 kB before gzip. Feature chunks are loaded on demand.
- Both Vite HTML entry points now reference `main.tsx` after the JSX entry modules were migrated.
- Backend `npm run build` passes and starts the compiled `dist/server.js` entry point.
- The patient frontend and backend lockfiles pass `npm ci --offline --dry-run`.
- The admin panel production build passes strict `tsc --noEmit` and Vite. Its ESLint check passes after fixing three existing React lint errors. Its package lockfile passes `npm ci --offline --dry-run`.
- An isolated temporary PostgreSQL 18 database successfully applied all three migrations. The backend tests passed against it, including the model integration test. Four additional authentication guard tests pass. The compiled API returned HTTP 200 from `/healthz` with database status `ok`.
- The administrator appointment detail route was exercised through the compiled API with local fixture records: administrator HTTP 200, regular patient HTTP 403 on the administrator route, and owning patient HTTP 200 on the patient route.
- Admin doctor and appointment forms now await their actual API result before showing success or navigating. Doctor form imports use the correct filename case, and admin notifications use the mounted toast provider. Legacy appointment status updates reject unknown values and missing appointments.
- A read-only connected Supabase schema check found `app_users` but not the new `devices`, `patient_health_profiles`, or `scheduled_appointments` tables. The 002/003 migrations have **not** been applied to the hosted project.
- Earlier Brave browser checks showed the revised public homepage and signed-out redirect from `/my-health` to `/login`. The existing API process on port 4000 was stale (`/healthz` returned 404), while its configured database hostname could not resolve from the shell. It was left running to avoid disrupting the user.

## Outstanding work and dependencies

The complete product brief is not delivered. Important gaps include secure document storage, clinician provisioning, billing, messaging, video consultations, notifications, a complete session and authorization overhaul, clinical AI validation, full TypeScript migration, mobile and authenticated browser review, and production deployment. ECG hardware ingest is implemented at the API level but has not been verified against the actual Arduino firmware or device. The hosted database needs a reviewed migration plan and a working connection before these features can be enabled there.

No hosted schema changes, deployment, merge, or clinical validation have been performed. Use `git status --short` for the current file inventory; filenames have changed as JavaScript modules are converted to TypeScript.

## Demo sign-in

The patient registration and login pages offer **Continue as demo patient**. It opens the normal patient workspace without an email service key, database, or device. A tab-scoped local API adapter supplies sample profile, health history, appointment, doctor, device, ECG, and clinician data; demo edits and bookings persist only in that tab. It creates no backend account or JWT and sends no demo requests to the backend. Exit demo clears the sample data. Real patient records and physical device features still require the backend and a real account.
