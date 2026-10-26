create table if not exists plan_inquiries (
  id uuid primary key,
  patient_id text not null references app_users(id),
  plan_id text not null check(plan_id in ('holter-device','holter-care')),
  contact_phone text,
  note text,
  status text not null default 'new' check(status in ('new','contacted','quoted','closed')),
  created_at timestamptz not null default now()
);
create index if not exists plan_inquiries_patient on plan_inquiries(patient_id,created_at desc);
do $$ begin if exists(select 1 from pg_roles where rolname='anon') then revoke all on plan_inquiries from anon; end if; if exists(select 1 from pg_roles where rolname='authenticated') then revoke all on plan_inquiries from authenticated; end if; end $$;
