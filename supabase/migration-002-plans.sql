-- =============================================================
-- Everything Fitness — migration 002: extra splits + custom plans
-- Run after schema.sql: SQL Editor → New query → paste → Run
-- =============================================================

-- Extra built-in splits (Arnold, PPL×UL, PHUL, PHAT) + a "CUSTOM" marker for
-- user-built weeks. Postgres can't add enum-style check values in place, so
-- drop and recreate the constraint.
alter table public.profiles drop constraint if exists profiles_split_check;
alter table public.profiles add constraint profiles_split_check
  check (split in ('PPL','UL','FB','BRO','ARN','PPLUL','PHUL','PHAT','CUSTOM'));

-- A custom plan overrides the built-in split: split_days is the 7-day week,
-- split_label is the display name. Both null → fall back to the built-in split.
alter table public.profiles add column if not exists split_days text[];
alter table public.profiles add column if not exists split_label text;

create table if not exists public.custom_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  days text[] not null,
  created_at timestamptz not null default now()
);
alter table public.custom_plans enable row level security;
drop policy if exists "own custom plans" on public.custom_plans;
create policy "own custom plans" on public.custom_plans for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
