-- =============================================================
-- Everything Fitness — migration 003: home/gym mode + AI Coach chat memory
-- Run after migration-002-plans.sql: SQL Editor → New query → paste → Run
-- =============================================================

-- Home vs. gym mode — filters which equipment shows up in the exercise
-- picker and substitution suggestions.
alter table public.profiles add column if not exists training_mode text
  not null default 'gym' check (training_mode in ('gym','home'));

-- AI Coach conversation history. The coach-chat Edge Function reads recent
-- rows here (plus profile/workout/nutrition data) as LLM context, and writes
-- both the user's message and Coach Er's reply back into this table — that's
-- how the coach "remembers" a conversation across app restarts.
create table public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.coach_messages enable row level security;
drop policy if exists "own coach messages" on public.coach_messages;
create policy "own coach messages" on public.coach_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists coach_messages_user_time on public.coach_messages (user_id, created_at);
