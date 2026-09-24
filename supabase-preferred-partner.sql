-- Sinkd preferred partner storage
-- SQL #7: run once after the main league setup.

alter table public.league_members
add column if not exists preferred_partner_user_id uuid references auth.users(id) on delete set null;

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
