alter table bp_alert_events add column if not exists sms_status text not null default 'skipped' check (sms_status in ('skipped','submitted','failed'));
alter table bp_alert_events add column if not exists sms_provider_id text;
