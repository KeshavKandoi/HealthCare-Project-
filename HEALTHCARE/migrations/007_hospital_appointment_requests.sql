-- A preferred-time request becomes a scheduled appointment only after a linked clinician confirms it.
create table if not exists hospital_doctor_links (
  profile_id text primary key,
  doctor_id text not null unique references doctor_profiles(doctor_id),
  linked_at timestamptz not null default now()
);
create table if not exists hospital_appointment_requests (
  id uuid primary key,
  profile_id text not null,
  patient_id text not null references app_users(id),
  preferred_start_at timestamptz not null,
  duration_minutes integer not null check(duration_minutes between 10 and 180),
  reason text,
  status text not null default 'requested' check(status in ('requested','confirmed','declined','cancelled')),
  appointment_id uuid unique references scheduled_appointments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hospital_requests_patient on hospital_appointment_requests(patient_id,created_at desc);
create index if not exists hospital_requests_profile on hospital_appointment_requests(profile_id,preferred_start_at);
do $$ begin if exists(select 1 from pg_roles where rolname='anon') then revoke all on hospital_doctor_links,hospital_appointment_requests from anon; end if; if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on hospital_doctor_links,hospital_appointment_requests from authenticated; end if; end $$;
