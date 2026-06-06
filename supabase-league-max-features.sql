-- Sinkd Leagues MAX feature storage
-- Run this once in Supabase SQL Editor.

alter table public.leagues
add column if not exists custom_badges jsonb not null default '[]'::jsonb;

alter table public.league_chat_messages
add column if not exists pinned boolean not null default false;

alter table public.league_chat_messages
add column if not exists payload jsonb not null default '{}'::jsonb;

create table if not exists public.league_poll_votes (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  poll_id uuid not null references public.league_chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_index integer not null check (option_index >= 0 and option_index <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (poll_id, user_id)
);

alter table public.league_poll_votes enable row level security;

do $$
begin
  alter table public.league_chat_messages drop constraint if exists league_chat_messages_type_check;
  alter table public.league_chat_messages
    add constraint league_chat_messages_type_check
    check (type in ('user', 'system', 'poll', 'event', 'announcement'));
end $$;

drop policy if exists "managers can update league chat" on public.league_chat_messages;
create policy "managers can update league chat"
on public.league_chat_messages
for update
to authenticated
using (public.can_manage_league(league_id))
with check (public.can_manage_league(league_id));

drop policy if exists "members can view league poll votes" on public.league_poll_votes;
create policy "members can view league poll votes"
on public.league_poll_votes
for select
to authenticated
using (public.is_league_member(league_id));

drop policy if exists "members can vote in league polls" on public.league_poll_votes;
create policy "members can vote in league polls"
on public.league_poll_votes
for insert
to authenticated
with check (public.is_league_member(league_id) and user_id = auth.uid());

drop policy if exists "members can change their league poll vote" on public.league_poll_votes;
create policy "members can change their league poll vote"
on public.league_poll_votes
for update
to authenticated
using (public.is_league_member(league_id) and user_id = auth.uid())
with check (public.is_league_member(league_id) and user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.league_poll_votes;
exception when duplicate_object then null;
end $$;
