-- Sinkd Leagues MAX feature storage
-- Run this once in Supabase SQL Editor.

alter table public.leagues
add column if not exists custom_badges jsonb not null default '[]'::jsonb;

alter table public.league_chat_messages
add column if not exists pinned boolean not null default false;

alter table public.league_chat_messages
add column if not exists payload jsonb not null default '{}'::jsonb;

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
