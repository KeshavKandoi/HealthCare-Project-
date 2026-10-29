-- Backoffice High blood pressure test alerts: kept apart from genuine patient BP alerts and private to the API.
create schema if not exists healthcare_private;
create table if not exists healthcare_private.bp_test_alerts (
  id uuid primary key, trigger_key text not null unique, account_email text,
  systolic smallint not null, diastolic smallint not null, recorded_at timestamptz not null, source text not null,
  deliveries jsonb not null, created_at timestamptz not null default now()
);
alter table healthcare_private.bp_test_alerts alter column account_email drop not null;
create index if not exists bp_test_alerts_account on healthcare_private.bp_test_alerts(account_email, created_at desc);
revoke all on healthcare_private.bp_test_alerts from public;
