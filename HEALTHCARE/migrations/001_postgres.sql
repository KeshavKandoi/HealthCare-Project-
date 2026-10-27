-- Fresh PostgreSQL schema for the existing API. Run against an empty database.
create table if not exists app_users (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  constraint app_users_required check (
    nullif(data->>'name', '') is not null and
    nullif(data->>'email', '') is not null
  )
);
create unique index if not exists app_users_email_unique on app_users (lower(data->>'email'));

create table if not exists doctors (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  constraint doctors_required check (
    nullif(data->>'name', '') is not null and
    nullif(data->>'email', '') is not null
  )
);
create unique index if not exists doctors_email_unique on doctors (lower(data->>'email'));

create table if not exists appointments (
  id text primary key,
  data jsonb not null,
  user_id text generated always as (data->>'userId') stored references app_users(id),
  doctor_id text generated always as (data->>'doctorId') stored references doctors(id),
  created_at timestamptz not null default now()
);
create index if not exists appointments_user_id_idx on appointments (user_id);
create index if not exists appointments_doctor_id_idx on appointments (doctor_id);

create table if not exists health_records (
  id text primary key,
  data jsonb not null,
  user_id text generated always as (data->>'userId') stored references app_users(id),
  created_at timestamptz not null default now()
);
create index if not exists health_records_user_id_idx on health_records (user_id);

create table if not exists ecg_records (
  id text primary key,
  data jsonb not null,
  patient_id text generated always as (data->>'patientId') stored references app_users(id),
  created_at timestamptz not null default now()
);
create index if not exists ecg_records_patient_id_idx on ecg_records (patient_id);

create table if not exists web_messages (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
