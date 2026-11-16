-- Beer Die Leagues cloud schema
-- Run this once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  rules text default '',
  privacy text not null default 'open' check (privacy in ('open', 'invite')),
  logo_top text not null default '#f6d365',
  logo_left text not null default '#0f766e',
  logo_right text not null default '#d99f20',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists leagues_unique_normalized_name
on public.leagues (lower(btrim(name)));

alter table public.leagues
add column if not exists rules text default '';

alter table public.leagues
add column if not exists sink_auto_win boolean not null default false;

alter table public.leagues
add column if not exists fifa_multiplier boolean not null default false;

alter table public.leagues
add column if not exists scoring_rules jsonb not null default '{
  "tableHits": {"enabled": true, "points": 1},
  "sinks": {"enabled": true, "points": 3},
  "tinks": {"enabled": true, "points": 2},
  "fgOffense": {"enabled": true, "points": 2},
  "fgDefense": {"enabled": true, "points": 2},
  "fifas": {"enabled": true, "points": 1}
}'::jsonb;

alter table public.leagues
add column if not exists custom_badges jsonb not null default '[]'::jsonb;

create table if not exists public.league_members (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  display_name text not null,
  nickname text default '',
  cup_color text default '#d71920',
  player_code text,
  role text not null default 'member' check (role in ('owner', 'co_leader', 'ref', 'member')),
  created_at timestamptz not null default now(),
  unique (league_id, email)
);

alter table public.league_members add column if not exists nickname text default '';
alter table public.league_members add column if not exists cup_color text default '#d71920';
alter table public.league_members add column if not exists player_code text;
alter table public.league_members
add column if not exists preferred_partner_user_id uuid references auth.users(id) on delete set null;

do $$
begin
  alter table public.league_members drop constraint if exists league_members_role_check;
alter table public.league_members
add constraint league_members_role_check
    check (role in ('owner', 'co_leader', 'ref', 'member', 'pending'));
end $$;

do $$
begin
  if exists (
    select 1
    from public.league_members
    where role = 'owner'
    group by league_id
    having count(*) > 1
  ) then
    raise exception 'A league already has more than one owner row. Fix those rows, then run this script again.';
  end if;
end $$;

create unique index if not exists league_members_one_owner
on public.league_members (league_id)
where role = 'owner';

alter table public.league_members
drop constraint if exists league_members_preferred_partner_not_self;

alter table public.league_members
add constraint league_members_preferred_partner_not_self
check (preferred_partner_user_id is null or preferred_partner_user_id <> user_id);

create or replace function public.clear_departed_preferred_partner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.user_id is not null then
    update public.league_members
    set preferred_partner_user_id = null
    where league_id = old.league_id
      and preferred_partner_user_id = old.user_id;
  end if;
  return old;
end;
$$;

drop trigger if exists clear_departed_preferred_partner on public.league_members;
create trigger clear_departed_preferred_partner
before delete on public.league_members
for each row execute function public.clear_departed_preferred_partner();

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

create table if not exists public.league_seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null default 'Season',
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'archived')),
  starts_at timestamptz,
  scheduled_ends_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.league_seasons add column if not exists scheduled_ends_at timestamptz;
alter table public.league_seasons drop constraint if exists league_seasons_schedule_dates_check;
alter table public.league_seasons add constraint league_seasons_schedule_dates_check
check (scheduled_ends_at is null or starts_at is null or scheduled_ends_at > starts_at);
alter table public.league_games add column if not exists season_id uuid references public.league_seasons(id) on delete set null;
alter table public.league_tournaments add column if not exists season_id uuid references public.league_seasons(id) on delete set null;

create index if not exists league_games_season_id_idx on public.league_games (season_id);
create index if not exists league_tournaments_season_id_idx on public.league_tournaments (season_id);

create or replace function public.assign_active_league_season()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    new.season_id := old.season_id;
  else
    select season.id
      into new.season_id
      from public.league_seasons season
     where season.league_id = new.league_id
       and season.status = 'active'
     limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_league_game_season on public.league_games;
create trigger assign_league_game_season
before insert or update on public.league_games
for each row execute function public.assign_active_league_season();

drop trigger if exists assign_league_tournament_season on public.league_tournaments;
create trigger assign_league_tournament_season
before insert or update on public.league_tournaments
for each row execute function public.assign_active_league_season();

create unique index if not exists league_seasons_one_active_per_league
on public.league_seasons (league_id)
where status = 'active';

create unique index if not exists league_seasons_one_scheduled_per_league
on public.league_seasons (league_id)
where status = 'scheduled';

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

create table if not exists public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  player_code text not null unique check (player_code ~ '^SINK-[A-Z0-9]{4}$'),
  nickname text not null default '',
  cup_color text default '#d71920',
  updated_at timestamptz not null default now()
);

create or replace function public.find_player_by_code(target_player_code text)
returns table(user_id uuid, player_code text, nickname text, cup_color text)
language sql
stable
security definer
set search_path = public, auth
as $$
  with normalized as (
    select upper(regexp_replace(coalesce(target_player_code, ''), '[^A-Za-z0-9]', '', 'g')) as code
  ),
  profile_matches as (
    select pp.user_id, pp.player_code, pp.nickname, pp.cup_color
    from public.player_profiles pp, normalized n
    where replace(upper(pp.player_code), '-', '') = n.code
    limit 1
  ),
  metadata_matches as (
    select
      u.id as user_id,
      upper(coalesce(u.raw_user_meta_data #>> '{sinkd_profile,playerCode}', '')) as player_code,
      coalesce(nullif(btrim(u.raw_user_meta_data #>> '{sinkd_profile,nickname}'), ''), 'Friend') as nickname,
      coalesce(nullif(u.raw_user_meta_data #>> '{sinkd_profile,cupColor}', ''), '#d71920') as cup_color
    from auth.users u, normalized n
    where replace(upper(coalesce(u.raw_user_meta_data #>> '{sinkd_profile,playerCode}', '')), '-', '') = n.code
    limit 1
  )
  select * from profile_matches
  union all
  select * from metadata_matches
  where not exists (select 1 from profile_matches)
  limit 1;
$$;

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

create table if not exists public.league_chat_messages (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  author_name text default '',
  type text not null default 'user' check (type in ('user', 'system', 'poll', 'event', 'announcement')),
  message text not null,
  pinned boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.league_chat_messages add column if not exists pinned boolean not null default false;
alter table public.league_chat_messages add column if not exists payload jsonb not null default '{}'::jsonb;

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

do $$
begin
  alter table public.league_chat_messages drop constraint if exists league_chat_messages_type_check;
  alter table public.league_chat_messages
    add constraint league_chat_messages_type_check
    check (type in ('user', 'system', 'poll', 'event', 'announcement'));
end $$;

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
alter table public.league_seasons enable row level security;
alter table public.league_chat_messages enable row level security;
alter table public.league_poll_votes enable row level security;
alter table public.friend_requests enable row level security;
alter table public.player_profiles enable row level security;
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
      and lm.role <> 'pending'
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
      and lm.role in ('owner', 'co_leader', 'ref', 'member')
      and lm.user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_league_games(target_league_id uuid)
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

create or replace function public.invite_player_to_league(target_league_id uuid, target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text;
  target_name text;
begin
  if not public.is_league_member(target_league_id) then
    raise exception 'You must be in this league to invite players.';
  end if;

  select email into target_email
  from auth.users
  where id = target_user_id;

  if target_email is null then
    raise exception 'Player not found.';
  end if;

  select coalesce(
      nullif(btrim(pp.nickname), ''),
      nullif(btrim(u.raw_user_meta_data #>> '{sinkd_profile,nickname}'), ''),
      pp.player_code,
      nullif(btrim(u.raw_user_meta_data #>> '{sinkd_profile,playerCode}'), '')
    )
    into target_name
  from auth.users u
  left join public.player_profiles pp on pp.user_id = u.id
  where u.id = target_user_id;

  insert into public.league_members (league_id, user_id, email, display_name, nickname, player_code, role)
  values (
    target_league_id,
    null,
    lower(target_email),
    coalesce(target_name, 'Invited Player'),
    '',
    (
      select coalesce(pp.player_code, u.raw_user_meta_data #>> '{sinkd_profile,playerCode}')
      from auth.users u
      left join public.player_profiles pp on pp.user_id = u.id
      where u.id = target_user_id
    ),
    'member'
  )
  on conflict (league_id, email) do nothing;
end;
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

create or replace function public.can_create_notification(
  target_recipient_id uuid default null,
  target_recipient_email text default null,
  target_league_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and (
      target_recipient_id = auth.uid()
      or (
        nullif(btrim(coalesce(target_recipient_email, '')), '') is not null
        and nullif(btrim(coalesce(auth.jwt() ->> 'email', '')), '') is not null
        and lower(btrim(target_recipient_email)) = lower(btrim(auth.jwt() ->> 'email'))
      )
      or exists (
        select 1
        from public.friend_requests fr
        where fr.status in ('pending', 'accepted')
          and (
            (
              fr.requester_id = auth.uid()
              and (
                (target_recipient_id is not null and fr.recipient_id = target_recipient_id)
                or (
                  nullif(btrim(coalesce(target_recipient_email, '')), '') is not null
                  and nullif(btrim(coalesce(fr.recipient_email, '')), '') is not null
                  and lower(btrim(fr.recipient_email)) = lower(btrim(target_recipient_email))
                )
              )
            )
            or (
              fr.recipient_id = auth.uid()
              and (
                (target_recipient_id is not null and fr.requester_id = target_recipient_id)
                or (
                  nullif(btrim(coalesce(target_recipient_email, '')), '') is not null
                  and nullif(btrim(coalesce(fr.requester_email, '')), '') is not null
                  and lower(btrim(fr.requester_email)) = lower(btrim(target_recipient_email))
                )
              )
            )
          )
      )
      or (
        target_league_id is not null
        and public.is_league_member(target_league_id)
        and exists (
          select 1
          from public.league_members lm
          where lm.league_id = target_league_id
            and (
              (target_recipient_id is not null and lm.user_id = target_recipient_id)
              or (
                nullif(btrim(coalesce(target_recipient_email, '')), '') is not null
                and nullif(btrim(coalesce(lm.email, '')), '') is not null
                and lower(btrim(lm.email)) = lower(btrim(target_recipient_email))
              )
              or (
                target_recipient_id is not null
                and nullif(btrim(coalesce(lm.email, '')), '') is not null
                and lower(btrim(lm.email)) = lower(coalesce((
                  select u.email from auth.users u where u.id = target_recipient_id
                ), ''))
              )
            )
        )
      )
    );
$$;

create or replace function public.protect_league_owner_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not distinct from old.owner_id then
    return new;
  end if;

  if coalesce(current_setting('sinkd.allow_owner_transfer', true), '') = 'on' then
    return new;
  end if;

  raise exception 'Only the league owner can transfer ownership.';
end;
$$;

create or replace function public.protect_league_member_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(current_setting('sinkd.allow_owner_transfer', true), '') = 'on' then
    return new;
  end if;

  if old.role = 'owner'
     and old.user_id is distinct from auth.uid()
     and not (
       coalesce(auth.jwt() ->> 'email', '') <> ''
       and lower(coalesce(old.email, '')) = lower(auth.jwt() ->> 'email')
     )
  then
    raise exception 'Only the league owner can change the owner row.';
  end if;

  if new.role is not distinct from old.role
     and (old.role <> 'owner' or new.user_id is not distinct from old.user_id) then
    return new;
  end if;

  if new.role = 'owner' or old.role = 'owner' then
    raise exception 'Ownership changes go through transfer.';
  end if;

  if old.user_id = auth.uid()
     or (
       coalesce(auth.jwt() ->> 'email', '') <> ''
       and lower(coalesce(old.email, '')) = lower(auth.jwt() ->> 'email')
     )
  then
    raise exception 'You cannot change your own role.';
  end if;

  if public.is_league_owner(old.league_id)
     and new.role in ('member', 'ref', 'co_leader', 'pending') then
    return new;
  end if;

  if public.can_manage_league(old.league_id)
     and old.role = 'pending'
     and new.role = 'member' then
    return new;
  end if;

  raise exception 'Only the league owner can change that role.';
end;
$$;

create or replace function public.protect_league_member_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  self_insert boolean := auth.uid() is not null and (
    new.user_id = auth.uid()
    or (
      new.user_id is null
      and caller_email <> ''
      and lower(coalesce(new.email, '')) = caller_email
    )
  );
begin
  if new.role = 'owner' then
    if new.user_id is null
       or not exists (
         select 1
         from public.leagues l
         where l.id = new.league_id
           and l.owner_id = new.user_id
       )
       or exists (
         select 1
         from public.league_members lm
         where lm.league_id = new.league_id
           and lm.role = 'owner'
       )
    then
      raise exception 'You cannot create an owner that way.';
    end if;
    return new;
  end if;

  if self_insert and new.role not in ('member', 'pending') then
    raise exception 'You cannot give yourself that role.';
  end if;

  if self_insert and new.role = 'member' and not public.is_open_league(new.league_id) then
    raise exception 'Request to join this invite-only league instead.';
  end if;

  if self_insert and new.role = 'pending' and public.is_open_league(new.league_id) then
    raise exception 'Open leagues are joined as a member.';
  end if;

  if not self_insert and new.role = 'co_leader' and not public.is_league_owner(new.league_id) then
    raise exception 'Only the league owner can grant that role.';
  end if;

  if not self_insert and new.role = 'ref' and not public.can_manage_league(new.league_id) then
    raise exception 'Only a league owner or co-leader can grant that role.';
  end if;

  return new;
end;
$$;

create or replace function public.transfer_league_ownership(target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.league_members%rowtype;
  league public.leagues%rowtype;
  caller_member public.league_members%rowtype;
  owner_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in required.';
  end if;

  select * into target
  from public.league_members
  where id = target_member_id;

  if not found then
    raise exception 'Choose another connected league member.';
  end if;

  select * into league
  from public.leagues
  where id = target.league_id
  for update;

  if not found or league.owner_id is distinct from auth.uid() then
    raise exception 'Only the league owner can transfer ownership.';
  end if;

  select * into target
  from public.league_members
  where id = target_member_id
    and league_id = league.id
  for update;

  select * into caller_member
  from public.league_members
  where league_id = league.id
    and role = 'owner'
    and user_id = auth.uid()
  for update;

  if not found
     or target.id = caller_member.id
     or target.user_id is null
     or target.user_id = auth.uid()
     or target.role = 'owner' then
    raise exception 'Choose another connected league member.';
  end if;

  perform set_config('sinkd.allow_owner_transfer', 'on', true);

  update public.league_members
  set role = 'co_leader'
  where id = caller_member.id
    and league_id = league.id
    and role = 'owner';

  update public.league_members
  set role = 'owner'
  where id = target.id
    and league_id = league.id;

  update public.leagues
  set owner_id = target.user_id,
      updated_at = now()
  where id = league.id
    and owner_id = auth.uid();

  select count(*) into owner_count
  from public.league_members
  where league_id = league.id
    and role = 'owner';

  if owner_count <> 1
     or (select l.owner_id from public.leagues l where l.id = league.id) is distinct from target.user_id then
    raise exception 'Ownership transfer failed.';
  end if;
end;
$$;

drop trigger if exists protect_league_owner_id on public.leagues;
create trigger protect_league_owner_id
before update of owner_id on public.leagues
for each row
execute function public.protect_league_owner_id();

drop trigger if exists protect_league_member_role on public.league_members;
create trigger protect_league_member_role
before update on public.league_members
for each row
execute function public.protect_league_member_role();

drop trigger if exists protect_league_member_insert on public.league_members;
create trigger protect_league_member_insert
before insert on public.league_members
for each row
execute function public.protect_league_member_insert();

do $$
begin
  execute 'revoke all on function public.transfer_league_ownership(uuid) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.transfer_league_ownership(uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant execute on function public.transfer_league_ownership(uuid) to authenticated';
    execute 'grant execute on function public.can_create_notification(uuid, text, uuid) to authenticated';
    execute 'grant execute on function public.can_edit_league_games(uuid) to authenticated';
  end if;
end $$;

drop policy if exists "members can view their leagues" on public.leagues;
create policy "members can view their leagues"
on public.leagues
for select
to authenticated
using (
  true
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
with check (
  (owner_id = auth.uid() or public.can_manage_league(id))
  and owner_id is not distinct from (
    select l.owner_id from public.leagues l where l.id = leagues.id
  )
);

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
  or user_id = auth.uid()
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
      select count(*)
      from public.league_members lm
      where lm.league_id = public.league_members.league_id
    ) < 50
    or exists (
      select 1
      from public.leagues l
      where l.id = league_id
        and l.owner_id = auth.uid()
    )
  )
  and (
    (
      (
        user_id = auth.uid()
        or (
          user_id is null
          and coalesce(auth.jwt() ->> 'email', '') <> ''
          and lower(coalesce(email, '')) = lower(auth.jwt() ->> 'email')
        )
      )
      and (
        (role = 'member' and public.is_open_league(league_id))
        or (role = 'pending' and not public.is_open_league(league_id))
      )
    )
    or (
      public.can_manage_league(league_id)
      and not (user_id is not null and user_id = auth.uid())
      and not (
        coalesce(auth.jwt() ->> 'email', '') <> ''
        and email is not null
        and lower(email) = lower(auth.jwt() ->> 'email')
      )
      and role <> 'owner'
      and (
        public.is_league_owner(league_id)
        or role in ('member', 'pending', 'ref')
      )
    )
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
  and role in ('member', 'pending')
);

drop function if exists public.update_my_league_profile(text, text);
drop function if exists public.update_my_league_profile(text, text, text);
drop function if exists public.update_my_league_profile(text, text, text, uuid);
create or replace function public.update_my_league_profile(
  profile_name text,
  profile_cup_color text default '#d71920',
  profile_player_code text default '',
  profile_preferred_partner_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.league_members as target
  set
    display_name = coalesce(nullif(btrim(profile_name), ''), display_name),
    nickname = coalesce(nullif(btrim(profile_name), ''), nickname),
    cup_color = coalesce(nullif(profile_cup_color, ''), cup_color),
    player_code = coalesce(nullif(profile_player_code, ''), player_code),
    preferred_partner_user_id = case
      when profile_preferred_partner_user_id is null or profile_preferred_partner_user_id = auth.uid() then null
      when exists (
        select 1
        from public.league_members partner
        where partner.league_id = target.league_id
          and partner.user_id = profile_preferred_partner_user_id
          and partner.role <> 'pending'
      ) then profile_preferred_partner_user_id
      else null
    end,
    user_id = auth.uid(),
    email = lower(coalesce(auth.jwt() ->> 'email', email))
  where target.user_id = auth.uid();
end;
$$;

drop policy if exists "managers can remove members" on public.league_members;
create policy "managers can remove members"
on public.league_members
for delete
to authenticated
using (
  public.can_manage_league(league_id)
  and role <> 'owner'
  and not (user_id is not null and user_id = auth.uid())
  and not (
    coalesce(auth.jwt() ->> 'email', '') <> ''
    and email is not null
    and lower(email) = lower(auth.jwt() ->> 'email')
  )
  and (
    public.is_league_owner(league_id)
    or role in ('member', 'pending', 'ref')
  )
);

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
using (public.can_edit_league_games(league_id))
with check (public.can_edit_league_games(league_id));

drop policy if exists "managers can delete league games" on public.league_games;
drop policy if exists "owners can delete league games" on public.league_games;
drop policy if exists "officials can delete league games" on public.league_games;
create policy "officials can delete league games"
on public.league_games
for delete
to authenticated
using (public.can_edit_league_games(league_id));

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

drop policy if exists "members can view league seasons" on public.league_seasons;
create policy "members can view league seasons"
on public.league_seasons
for select
to authenticated
using (public.is_league_member(league_id));

drop policy if exists "owners can create league seasons" on public.league_seasons;
create policy "owners can create league seasons"
on public.league_seasons
for insert
to authenticated
with check (public.is_league_owner(league_id));

drop policy if exists "owners can update league seasons" on public.league_seasons;
create policy "owners can update league seasons"
on public.league_seasons
for update
to authenticated
using (public.is_league_owner(league_id))
with check (public.is_league_owner(league_id));

drop policy if exists "owners can delete league seasons" on public.league_seasons;
create policy "owners can delete league seasons"
on public.league_seasons
for delete
to authenticated
using (public.is_league_owner(league_id));

drop policy if exists "members can view league chat" on public.league_chat_messages;
create policy "members can view league chat"
on public.league_chat_messages
for select
to authenticated
using (public.is_league_member(league_id));

drop policy if exists "members can write league chat" on public.league_chat_messages;
create policy "members can write league chat"
on public.league_chat_messages
for insert
to authenticated
with check (public.is_league_member(league_id) and user_id = auth.uid());

drop policy if exists "managers can update league chat" on public.league_chat_messages;
create policy "managers can update league chat"
on public.league_chat_messages
for update
to authenticated
using (public.can_manage_league(league_id))
with check (public.can_manage_league(league_id));

drop policy if exists "managers can delete league chat" on public.league_chat_messages;
create policy "managers can delete league chat"
on public.league_chat_messages
for delete
to authenticated
using (public.can_manage_league(league_id));

drop policy if exists "authors can delete own league chat" on public.league_chat_messages;
create policy "authors can delete own league chat"
on public.league_chat_messages
for delete
to authenticated
using (public.is_league_member(league_id) and user_id = auth.uid());

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

drop policy if exists "authenticated users can find player codes" on public.player_profiles;
create policy "authenticated users can find player codes"
on public.player_profiles
for select
to authenticated
using (true);

drop policy if exists "users can create their player profile" on public.player_profiles;
create policy "users can create their player profile"
on public.player_profiles
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users can update their player profile" on public.player_profiles;
create policy "users can update their player profile"
on public.player_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

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
with check (
  created_by = auth.uid()
  and public.can_create_notification(recipient_id, recipient_email, league_id)
);

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
  alter publication supabase_realtime add table public.league_seasons;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.league_chat_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.league_poll_votes;
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
