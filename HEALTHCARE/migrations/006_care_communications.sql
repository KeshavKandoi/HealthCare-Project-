-- Appointment-scoped conversations and call metadata. Media is never stored here.
create table if not exists appointment_messages (
  id uuid primary key,
  appointment_id uuid not null references scheduled_appointments(id),
  sender_user_id text not null references app_users(id),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists appointment_messages_history on appointment_messages(appointment_id,created_at desc,id desc);
create table if not exists appointment_calls (
  id uuid primary key,
  appointment_id uuid not null references scheduled_appointments(id),
  initiated_by text not null references app_users(id),
  status text not null default 'ringing' check(status in ('ringing','connected','completed','declined','missed','failed')),
  started_at timestamptz not null default now(),
  connected_at timestamptz,
  ended_at timestamptz
);
create index if not exists appointment_calls_history on appointment_calls(appointment_id,started_at desc);
create unique index if not exists appointment_calls_one_active on appointment_calls(appointment_id) where status in ('ringing','connected');
do $$ begin if exists(select 1 from pg_roles where rolname='anon') then revoke all on appointment_messages,appointment_calls from anon; end if; if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on appointment_messages,appointment_calls from authenticated; end if; end $$;
