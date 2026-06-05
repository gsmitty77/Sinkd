-- Sinkd Leagues MAX update
-- Run this once in Supabase SQL Editor after League Plus is already installed.

alter table public.league_subscriptions add column if not exists plan text not null default 'plus';
alter table public.league_subscriptions drop constraint if exists league_subscriptions_plan_check;
alter table public.league_subscriptions add constraint league_subscriptions_plan_check check (plan in ('plus', 'max'));
update public.league_subscriptions set plan = 'plus' where plan is null;

create or replace function public.league_subscription_plan_for_user(target_league_id uuid, target_user_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (select 1 from public.app_admins where user_id = target_user_id) then 'max'
    when exists (
      select 1
      from public.league_subscriptions
      where league_id = target_league_id
        and plan = 'max'
        and status in ('active', 'trialing')
    ) then 'max'
    when exists (
      select 1
      from public.league_subscriptions
      where league_id = target_league_id
        and plan = 'plus'
        and status in ('active', 'trialing')
    ) then 'plus'
    else 'free'
  end;
$$;

revoke all on function public.league_subscription_plan_for_user(uuid, uuid) from public;
grant execute on function public.league_subscription_plan_for_user(uuid, uuid) to service_role;

create or replace function public.league_subscription_plan(target_league_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when exists (
      select 1
      from public.leagues l
      join public.app_admins a on a.user_id = l.owner_id
      where l.id = target_league_id
    ) then 'max'
    when exists (
      select 1
      from public.league_subscriptions
      where league_id = target_league_id
        and plan = 'max'
        and status in ('active', 'trialing')
    ) then 'max'
    when exists (
      select 1
      from public.league_subscriptions
      where league_id = target_league_id
        and plan = 'plus'
        and status in ('active', 'trialing')
    ) then 'plus'
    else 'free'
  end;
$$;

revoke all on function public.league_subscription_plan(uuid) from public;
grant execute on function public.league_subscription_plan(uuid) to authenticated;

create or replace function public.has_league_plus(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.league_subscription_plan(target_league_id) in ('plus', 'max');
$$;

revoke all on function public.has_league_plus(uuid) from public;
grant execute on function public.has_league_plus(uuid) to authenticated;

create or replace function public.has_league_max(target_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.league_subscription_plan(target_league_id) = 'max';
$$;

revoke all on function public.has_league_max(uuid) from public;
grant execute on function public.has_league_max(uuid) to authenticated;

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

  member_limit := case
    when public.has_league_max(new.league_id) then 100
    when public.has_league_plus(new.league_id) then 24
    else 8
  end;

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
