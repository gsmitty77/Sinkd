-- Beer Die Leagues cloud schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  privacy text not null default 'open' check (privacy in ('open', 'invite')),
  logo_top text not null default '#f6d365',
  logo_left text not null default '#0f766e',
  logo_right text not null default '#d99f20',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leagues_unique_normalized_name
on public.leagues (lower(btrim(name)));

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  display_name text not null,
  nickname text default '',
  cup_color text default '#d71920',
  role text not null default 'member' check (role in ('owner', 'co_leader', 'ref', 'member')),
  created_at timestamptz not null default now(),
  unique (league_id, email)
);

alter table public.league_members add column if not exists nickname text default '';
alter table public.league_members add column if not exists cup_color text default '#d71920';

do $$
begin
  alter table public.league_members drop constraint if exists league_members_role_check;
  alter table public.league_members
    add constraint league_members_role_check
    check (role in ('owner', 'co_leader', 'ref', 'member'));
end $$;

create table if not exists public.league_games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  logged_by uuid references auth.users(id) on delete set null,
  team_a_players text[] not null default '{}',
  team_b_players text[] not null default '{}',
  team_a_score integer not null default 0,
  team_b_score integer not null default 0,
  winner_index integer not null check (winner_index in (0, 1)),
  player_stats jsonb not null default '{}',
  self_sink_player text default '',
  self_sink_team integer,
  created_at timestamptz not null default now()
);

create table if not exists public.league_tournaments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  requester_name text default '',
  recipient_email text not null,
  recipient_id uuid references auth.users(id) on delete set null,
  recipient_name text default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.friend_requests alter column recipient_email drop not null;

create unique index if not exists friend_requests_unique_active_email_invite
on public.friend_requests (requester_id, lower(recipient_email))
where status in ('pending', 'accepted') and recipient_email is not null and btrim(recipient_email) <> '';

create unique index if not exists friend_requests_unique_active_user_invite
on public.friend_requests (requester_id, recipient_id)
where status in ('pending', 'accepted') and recipient_id is not null;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references auth.users(id) on delete cascade,
  recipient_email text default '',
  league_id uuid references public.leagues(id) on delete cascade,
  type text not null default 'general' check (type in ('achievement', 'friend_request', 'league_invite', 'ranking', 'general')),
  title text not null,
  message text not null,
  link_target text default '',
  image_url text default '',
  read_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.notifications add column if not exists image_url text default '';

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text default '',
  endpoint text not null unique,
  subscription jsonb not null,
  user_agent text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text default '',
  nickname text default '',
  topic text not null default 'other',
  message text not null,
  contact text default '',
  page text default '',
  user_agent text default '',
  status text not null default 'new' check (status in ('new', 'reviewing', 'done', 'ignored')),
  created_at timestamptz not null default now()
);

alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.league_games enable row level security;
alter table public.league_tournaments enable row level security;
alter table public.friend_requests enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.feedback enable row level security;

create or replace function public.is_league_member(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = target_league_id
      and lm.user_id = auth.uid()
  );
$$;

create or replace function public.is_open_league(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.leagues l
    where l.id = target_league_id
      and l.privacy = 'open'
  );
$$;

create or replace function public.can_manage_league(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = target_league_id
      and lm.role in ('owner', 'co_leader')
      and lm.user_id = auth.uid()
  );
$$;

create or replace function public.can_log_league_games(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = target_league_id
      and lm.role in ('owner', 'co_leader', 'ref')
      and lm.user_id = auth.uid()
  );
$$;

create or replace function public.is_league_owner(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.league_members lm
    where lm.league_id = target_league_id
      and lm.role = 'owner'
      and (
        lm.user_id = auth.uid()
        or lower(lm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

drop policy if exists "members can view their leagues" on public.leagues;
create policy "members can view their leagues"
on public.leagues
for select
to authenticated
using (
  public.is_open_league(id)
  or owner_id = auth.uid()
  or public.is_league_member(id)
  or exists (
    select 1
    from public.league_members lm
    where lm.league_id = id
      and lm.user_id is null
      and lower(lm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "authenticated users can create leagues" on public.leagues;
create policy "authenticated users can create leagues"
on public.leagues
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "owners can update leagues" on public.leagues;
create policy "owners can update leagues"
on public.leagues
for update
to authenticated
using (owner_id = auth.uid() or public.can_manage_league(id))
with check (owner_id = auth.uid() or public.can_manage_league(id));

drop policy if exists "owners can delete leagues" on public.leagues;
create policy "owners can delete leagues"
on public.leagues
for delete
to authenticated
using (owner_id = auth.uid() or public.is_league_owner(id));

create or replace function public.create_owner_league_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_email text;
  owner_name text;
begin
  owner_email := coalesce(auth.jwt() ->> 'email', '');
  owner_name := split_part(owner_email, '@', 1);
  if owner_name = '' then
    owner_name := 'Owner';
  end if;

  insert into public.league_members (league_id, user_id, email, display_name, role)
  values (new.id, new.owner_id, owner_email, owner_name, 'owner')
  on conflict (league_id, email) do nothing;

  return new;
end;
$$;

drop trigger if exists create_owner_league_member_trigger on public.leagues;
create trigger create_owner_league_member_trigger
after insert on public.leagues
for each row
execute function public.create_owner_league_member();

drop policy if exists "members can view league members" on public.league_members;
create policy "members can view league members"
on public.league_members
for select
to authenticated
using (
  public.is_league_member(league_id)
  or (
    user_id is null
    and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "managers can add members" on public.league_members;
drop policy if exists "members can invite and links can add members" on public.league_members;
create policy "members can invite and links can add members"
on public.league_members
for insert
to authenticated
with check (
  (
    (
      public.is_league_member(league_id)
      or user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    and (
      select count(*)
      from public.league_members lm
      where lm.league_id = public.league_members.league_id
    ) < 50
  )
  or exists (
    select 1 from public.leagues l
    where l.id = league_id
      and l.owner_id = auth.uid()
  )
);

drop policy if exists "managers can update members" on public.league_members;
create policy "managers can update members"
on public.league_members
for update
to authenticated
using (public.can_manage_league(league_id))
with check (public.can_manage_league(league_id));

drop policy if exists "invited users can accept league invites" on public.league_members;
create policy "invited users can accept league invites"
on public.league_members
for update
to authenticated
using (
  user_id is null
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  user_id = auth.uid()
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create or replace function public.update_my_league_profile(profile_name text, profile_cup_color text default '#d71920')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.league_members
  set
    display_name = coalesce(nullif(btrim(profile_name), ''), display_name),
    nickname = coalesce(nullif(btrim(profile_name), ''), nickname),
    cup_color = coalesce(nullif(profile_cup_color, ''), cup_color),
    user_id = auth.uid(),
    email = lower(coalesce(auth.jwt() ->> 'email', email))
  where user_id = auth.uid();
end;
$$;

drop policy if exists "managers can remove members" on public.league_members;
create policy "managers can remove members"
on public.league_members
for delete
to authenticated
using (public.can_manage_league(league_id));

drop policy if exists "members can leave leagues" on public.league_members;
create policy "members can leave leagues"
on public.league_members
for delete
to authenticated
using (
  role <> 'owner'
  and (
    user_id = auth.uid()
    or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "invited users can deny league invites" on public.league_members;
create policy "invited users can deny league invites"
on public.league_members
for delete
to authenticated
using (
  user_id is null
  and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "members can view league games" on public.league_games;
create policy "members can view league games"
on public.league_games
for select
to authenticated
using (
  public.is_league_member(league_id)
);

drop policy if exists "managers can log league games" on public.league_games;
create policy "managers can log league games"
on public.league_games
for insert
to authenticated
with check (public.can_log_league_games(league_id));

drop policy if exists "managers can update league games" on public.league_games;
create policy "managers can update league games"
on public.league_games
for update
to authenticated
using (public.can_log_league_games(league_id))
with check (public.can_log_league_games(league_id));

drop policy if exists "managers can delete league games" on public.league_games;
create policy "managers can delete league games"
on public.league_games
for delete
to authenticated
using (public.can_manage_league(league_id));

drop policy if exists "members can view league tournaments" on public.league_tournaments;
create policy "members can view league tournaments"
on public.league_tournaments
for select
to authenticated
using (public.is_league_member(league_id));

drop policy if exists "authorized users can create league tournaments" on public.league_tournaments;
create policy "authorized users can create league tournaments"
on public.league_tournaments
for insert
to authenticated
with check (public.can_log_league_games(league_id));

drop policy if exists "authorized users can update league tournaments" on public.league_tournaments;
create policy "authorized users can update league tournaments"
on public.league_tournaments
for update
to authenticated
using (public.can_log_league_games(league_id))
with check (public.can_log_league_games(league_id));

drop policy if exists "managers can delete league tournaments" on public.league_tournaments;
create policy "managers can delete league tournaments"
on public.league_tournaments
for delete
to authenticated
using (public.can_manage_league(league_id));

drop policy if exists "users can view their friend requests" on public.friend_requests;
create policy "users can view their friend requests"
on public.friend_requests
for select
to authenticated
using (
  requester_id = auth.uid()
  or recipient_id = auth.uid()
  or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "users can send friend requests" on public.friend_requests;
create policy "users can send friend requests"
on public.friend_requests
for insert
to authenticated
with check (requester_id = auth.uid());

drop policy if exists "recipients can answer friend requests" on public.friend_requests;
create policy "recipients can answer friend requests"
on public.friend_requests
for update
to authenticated
using (
  lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or recipient_id = auth.uid()
)
with check (
  lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or recipient_id = auth.uid()
);

drop policy if exists "users can remove their friendships" on public.friend_requests;
create policy "users can remove their friendships"
on public.friend_requests
for delete
to authenticated
using (
  requester_id = auth.uid()
  or recipient_id = auth.uid()
  or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "users can view their notifications" on public.notifications;
create policy "users can view their notifications"
on public.notifications
for select
to authenticated
using (
  recipient_id = auth.uid()
  or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "authenticated users can create notifications" on public.notifications;
create policy "authenticated users can create notifications"
on public.notifications
for insert
to authenticated
with check (created_by = auth.uid() or created_by is null);

drop policy if exists "users can mark their notifications read" on public.notifications;
create policy "users can mark their notifications read"
on public.notifications
for update
to authenticated
using (
  recipient_id = auth.uid()
  or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  recipient_id = auth.uid()
  or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "users can delete their notifications" on public.notifications;
create policy "users can delete their notifications"
on public.notifications
for delete
to authenticated
using (
  recipient_id = auth.uid()
  or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "users can view their push subscriptions" on public.push_subscriptions;
create policy "users can view their push subscriptions"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can save their push subscriptions" on public.push_subscriptions;
create policy "users can save their push subscriptions"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update their push subscriptions" on public.push_subscriptions;
create policy "users can update their push subscriptions"
on public.push_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "users can delete their push subscriptions" on public.push_subscriptions;
create policy "users can delete their push subscriptions"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "users can create feedback" on public.feedback;
create policy "users can create feedback"
on public.feedback
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can view their feedback" on public.feedback;
create policy "users can view their feedback"
on public.feedback
for select
to authenticated
using (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.leagues;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.league_members;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.league_games;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.league_tournaments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.friend_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.push_subscriptions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.feedback;
exception when duplicate_object then null;
end $$;
