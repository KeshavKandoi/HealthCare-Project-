-- Separate research/simulation storage. None of these tables feed measured BP alerts.
create table if not exists ecg_simulation_runs (
 id uuid primary key, patient_id text not null references app_users(id), scenario_version text not null,
 started_at timestamptz not null, duration_seconds integer not null check(duration_seconds between 1 and 300),
 sample_rate_hz integer not null check(sample_rate_hz=250), waveform_chunks jsonb not null,
 simulated_bp jsonb not null, created_at timestamptz not null default now()
);
create index if not exists ecg_simulation_patient on ecg_simulation_runs(patient_id,created_at desc);
create table if not exists ecg_research_models (
 id text primary key, version text not null, artifact_sha256 text not null,
 evaluation jsonb not null, prerequisites jsonb not null, approved_for_research boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists ecg_reference_calibrations (
 id uuid primary key, patient_id text not null references app_users(id),
 source text not null check(source in ('validated-device','paired-dataset')), source_reference text not null,
 systolic double precision not null, diastolic double precision not null,
 recorded_at timestamptz not null, expires_at timestamptz not null,
 provenance jsonb not null, check(systolic>diastolic), check(expires_at>recorded_at)
);
create table if not exists ecg_experimental_bp_estimates (
 id uuid primary key, patient_id text not null references app_users(id),
 session_id uuid not null references ecg_recording_sessions(id), model_id text not null references ecg_research_models(id),
 calibration_id uuid references ecg_reference_calibrations(id), estimated_at timestamptz not null,
 result jsonb not null, quality jsonb not null
);
create index if not exists ecg_experimental_patient on ecg_experimental_bp_estimates(patient_id,estimated_at desc);
create index if not exists ecg_chunks_time_range on ecg_recording_chunks(session_id,first_sample_at);
alter table ecg_simulation_runs enable row level security;
alter table ecg_research_models enable row level security;
alter table ecg_reference_calibrations enable row level security;
alter table ecg_experimental_bp_estimates enable row level security;
do $$ begin
 if exists(select 1 from pg_roles where rolname='anon') then revoke all on ecg_simulation_runs,ecg_research_models,ecg_reference_calibrations,ecg_experimental_bp_estimates from anon; end if;
 if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on ecg_simulation_runs,ecg_research_models,ecg_reference_calibrations,ecg_experimental_bp_estimates from authenticated; end if;
end $$;
