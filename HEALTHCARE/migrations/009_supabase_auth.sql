-- Passwords are managed by Supabase Auth; local profiles require only identity fields.
alter table app_users drop constraint if exists app_users_required;
alter table app_users add constraint app_users_required check (
  nullif(data->>'name', '') is not null and
  nullif(data->>'email', '') is not null
);
create unique index if not exists app_users_auth_user_id_unique on app_users ((data->>'authUserId')) where data ? 'authUserId';
