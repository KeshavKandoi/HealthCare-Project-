-- A caregiver verifies their own phone. Patient consent remains in caregiver_grants.notify.
alter table caregiver_grants add column if not exists phone_e164 text check (phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$');
alter table caregiver_grants add column if not exists phone_verified_at timestamptz;
alter table caregiver_grants add column if not exists phone_verification_requested_at timestamptz;

create table if not exists patient_bp_alert_settings (
  patient_id text primary key references app_users(id),
  enabled boolean not null default false,
  systolic_limit smallint check (systolic_limit between 90 and 250),
  diastolic_limit smallint check (diastolic_limit between 50 and 150),
  updated_at timestamptz not null default now(),
  check (not enabled or systolic_limit is not null or diastolic_limit is not null)
);

create table if not exists bp_alert_events (
  id uuid primary key,
  patient_id text not null references app_users(id),
  measurement_id uuid not null references patient_health_measurements(id),
  grant_id uuid not null references caregiver_grants(id),
  kind text not null check (kind in ('systolic_bp','diastolic_bp')),
  value numeric(10,2) not null,
  limit_value smallint not null,
  status text not null default 'pending' check (status in ('pending','sending','submitted','failed','expired')),
  provider_message_id text,
  failure_code text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique (measurement_id, grant_id)
);
create index if not exists bp_alert_pending on bp_alert_events(created_at) where status='pending';
create index if not exists bp_alert_patient on bp_alert_events(patient_id,created_at desc);
do $$ begin if exists(select 1 from pg_roles where rolname='anon') then revoke all on patient_bp_alert_settings,bp_alert_events from anon; end if; if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on patient_bp_alert_settings,bp_alert_events from authenticated; end if; end $$;
