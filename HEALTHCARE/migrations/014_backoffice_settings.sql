-- Backoffice demonstration settings, such as the live waveform mode. Private to the API.
create schema if not exists healthcare_private;
create table if not exists healthcare_private.backoffice_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);
revoke all on healthcare_private.backoffice_settings from public;
