-- Keep test waveforms distinguishable from recordings made by physical devices.
alter table devices add column if not exists is_simulated boolean not null default false;
alter table ecg_recording_sessions add column if not exists is_simulated boolean not null default false;
