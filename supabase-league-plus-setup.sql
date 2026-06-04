create table if not exists public.league_subscriptions (
  league_id uuid primary key references public.leagues(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  status text not null default 'inactive',
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.league_subscriptions enable row level security;

drop policy if exists "owners can view their league subscription" on public.league_subscriptions;
create policy "owners can view their league subscription"
on public.league_subscriptions
for select
to authenticated
using (
  exists (
    select 1
    from public.leagues
    where leagues.id = league_subscriptions.league_id
      and leagues.owner_id = auth.uid()
  )
);

create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.app_admins enable row level security;

create or replace function public.has_league_plus_for_user(target_league_id uuid, target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.app_admins where user_id = target_user_id)
    or exists (
      select 1 from public.league_subscriptions
      where league_id = target_league_id
        and status in ('active', 'trialing')
    );
$$;

revoke all on function public.has_league_plus_for_user(uuid, uuid) from public;
grant execute on function public.has_league_plus_for_user(uuid, uuid) to service_role;

create or replace function public.has_league_plus(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
      from public.leagues l
      join public.app_admins a on a.user_id = l.owner_id
      where l.id = target_league_id
    )
    or exists (
      select 1
      from public.league_subscriptions
      where league_id = target_league_id
        and status in ('active', 'trialing')
    );
$$;

revoke all on function public.has_league_plus(uuid) from public;
grant execute on function public.has_league_plus(uuid) to authenticated;

create or replace function public.enforce_league_member_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_members integer;
  member_limit integer;
begin
  if new.role = 'pending' then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.role <> 'pending' then
    return new;
  end if;

  select count(*) into current_members
  from public.league_members
  where league_id = new.league_id
    and role <> 'pending';

  member_limit := case when public.has_league_plus(new.league_id) then 24 else 8 end;
  if current_members >= member_limit then
    raise exception 'This league is full. The current member limit is %.', member_limit;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_league_member_capacity_trigger on public.league_members;
create trigger enforce_league_member_capacity_trigger
before insert or update of role on public.league_members
for each row execute function public.enforce_league_member_capacity();

-- Run separately after replacing YOUR-USER-UID:
-- insert into public.app_admins (user_id) values ('YOUR-USER-UID') on conflict do nothing;
