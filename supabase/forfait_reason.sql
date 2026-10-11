-- Motif de forfait (excuse bidon) sur chaque présence
alter table public.attendance
  add column if not exists forfait_reason text;
