-- Private application-owned accounts and one-time codes.
create schema if not exists healthcare_private;
revoke all on schema healthcare_private from public;
create table if not exists healthcare_private.accounts (
  id uuid primary key, email text not null unique, name text not null,
  password_hash text not null, verified_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists healthcare_private.challenges (
  id uuid primary key, account_id uuid not null references healthcare_private.accounts(id),
  purpose text not null check (purpose in ('signup','recovery')), code_hash text not null,
  attempts integer not null default 0, expires_at timestamptz not null,
  consumed_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists healthcare_challenges_account on healthcare_private.challenges (account_id,purpose,created_at desc);
create table if not exists healthcare_private.sessions (
  id uuid primary key, account_id uuid not null references healthcare_private.accounts(id),
  access_hash text not null unique, refresh_hash text not null unique,
  access_expires_at timestamptz not null, refresh_expires_at timestamptz not null,
  revoked_at timestamptz, created_at timestamptz not null default now()
);
create table if not exists healthcare_private.auth_attempts (
  bucket text not null, created_at timestamptz not null default now()
);
create index if not exists healthcare_auth_attempts_bucket on healthcare_private.auth_attempts (bucket,created_at);
revoke all on all tables in schema healthcare_private from public;
