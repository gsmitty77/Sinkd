-- Sinkd league seasons storage
-- Run this once in Supabase SQL Editor after the main league setup.

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

alter table public.league_seasons
add column if not exists scheduled_ends_at timestamptz;

alter table public.league_seasons
drop constraint if exists league_seasons_schedule_dates_check;

alter table public.league_seasons
add constraint league_seasons_schedule_dates_check
check (scheduled_ends_at is null or starts_at is null or scheduled_ends_at > starts_at);

alter table public.league_games
add column if not exists season_id uuid references public.league_seasons(id) on delete set null;

alter table public.league_tournaments
add column if not exists season_id uuid references public.league_seasons(id) on delete set null;

create index if not exists league_games_season_id_idx
on public.league_games (season_id);

create index if not exists league_tournaments_season_id_idx
on public.league_tournaments (season_id);

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

alter table public.league_seasons enable row level security;

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
with check (
  exists (
    select 1
    from public.leagues l
    where l.id = league_seasons.league_id
      and l.owner_id = auth.uid()
  )
);

drop policy if exists "owners can update league seasons" on public.league_seasons;
create policy "owners can update league seasons"
on public.league_seasons
for update
to authenticated
using (
  exists (
    select 1
    from public.leagues l
    where l.id = league_seasons.league_id
      and l.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.leagues l
    where l.id = league_seasons.league_id
      and l.owner_id = auth.uid()
  )
);

drop policy if exists "owners can delete league seasons" on public.league_seasons;
create policy "owners can delete league seasons"
on public.league_seasons
for delete
to authenticated
using (
  exists (
    select 1
    from public.leagues l
    where l.id = league_seasons.league_id
      and l.owner_id = auth.uid()
  )
);

do $$
begin
  alter publication supabase_realtime add table public.league_seasons;
exception when duplicate_object then null;
end $$;
