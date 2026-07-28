-- Sinkd league seasons storage
-- Run this once in Supabase SQL Editor after the main league setup.

create table if not exists public.league_seasons (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  name text not null default 'Season',
  status text not null default 'scheduled' check (status in ('scheduled', 'active', 'archived')),
  starts_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists league_seasons_one_active_per_league
on public.league_seasons (league_id)
where status = 'active';

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
