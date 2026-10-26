-- Operational monitoring features. Access is mediated by the application API.
alter table ecg_recording_sessions add column if not exists target_hours smallint not null default 24 check (target_hours in (24,72));

create table if not exists ecg_symptom_markers (
  id uuid primary key, session_id uuid not null references ecg_recording_sessions(id),
  patient_id text not null references app_users(id),
  symptom text not null check (symptom in ('dizziness','discomfort','palpitations','breathlessness','other')),
  marked_at timestamptz not null, note text check (length(note)<=500),
  created_at timestamptz not null default now()
);
create index if not exists ecg_markers_session_time on ecg_symptom_markers(session_id,marked_at);

create table if not exists ecg_doctor_annotations (
  id uuid primary key, session_id uuid not null references ecg_recording_sessions(id),
  doctor_id text not null references doctor_profiles(doctor_id),
  at_time timestamptz not null, end_time timestamptz,
  observation text not null check (length(observation) between 1 and 2000),
  needs_attention boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_time is null or end_time>=at_time)
);
create index if not exists ecg_annotations_session_time on ecg_doctor_annotations(session_id,at_time);

create table if not exists ecg_doctor_reviews (
  id uuid primary key, session_id uuid not null references ecg_recording_sessions(id),
  doctor_id text not null references doctor_profiles(doctor_id),
  summary text not null check (length(summary) between 20 and 5000),
  signed_at timestamptz not null, signature text not null,
  released_at timestamptz not null,
  unique(session_id,doctor_id)
);

create table if not exists monitoring_plans (
  id uuid primary key, patient_id text not null references app_users(id),
  doctor_id text not null references doctor_profiles(doctor_id),
  device_id uuid references devices(id), target_hours smallint not null check (target_hours in (24,72)),
  starts_at timestamptz not null, review_due_at timestamptz not null,
  instructions text not null check (length(instructions) between 1 and 3000),
  symptoms text[] not null default '{}',
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now(),
  check (review_due_at>starts_at)
);
create index if not exists monitoring_plans_patient on monitoring_plans(patient_id,created_at desc);

create table if not exists caregiver_grants (
  id uuid primary key, patient_id text not null references app_users(id),
  invite_email text not null, token_hash text not null unique,
  scopes text[] not null check (array_length(scopes,1) between 1 and 4),
  notify boolean not null default false,
  expires_at timestamptz not null,
  caregiver_user_id text references app_users(id),
  accepted_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists caregiver_grants_patient on caregiver_grants(patient_id,created_at desc);
create index if not exists caregiver_grants_caregiver on caregiver_grants(caregiver_user_id) where revoked_at is null;
create unique index if not exists caregiver_one_active_invite on caregiver_grants(patient_id,invite_email) where revoked_at is null;

create table if not exists device_telemetry (
  id uuid primary key, device_id uuid not null references devices(id),
  battery_percent smallint check (battery_percent between 0 and 100),
  queued_batches integer check (queued_batches>=0),
  sync_failures integer check (sync_failures>=0),
  firmware_version text, reported_at timestamptz not null default now()
);
create index if not exists device_telemetry_latest on device_telemetry(device_id,reported_at desc);
create table if not exists device_support_requests (
  id uuid primary key, device_id uuid not null references devices(id),
  patient_id text not null references app_users(id),
  request_type text not null default 'support' check (request_type in ('support','replacement')),
  issue text not null check (length(issue) between 10 and 2000),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table device_support_requests add column if not exists request_type text not null default 'support' check (request_type in ('support','replacement'));
create index if not exists device_support_patient on device_support_requests(patient_id,created_at desc);

do $$ begin if exists(select 1 from pg_roles where rolname='anon') then revoke all on ecg_symptom_markers,ecg_doctor_annotations,ecg_doctor_reviews,monitoring_plans,caregiver_grants,device_telemetry,device_support_requests from anon; end if; if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on ecg_symptom_markers,ecg_doctor_annotations,ecg_doctor_reviews,monitoring_plans,caregiver_grants,device_telemetry,device_support_requests from authenticated; end if; end $$;
