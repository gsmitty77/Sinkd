-- Sinkd follow-up: members can invite other players.
-- Run this in the Supabase SQL editor AFTER supabase-security-fixes.sql
-- (already applied as security_fixes_2026_11_19). Safe to run again.
-- It does not change games, payments, or who can promote themselves.
--
-- A current league member can add someone else as member or pending.
-- They still cannot add themselves as co-leader, ref, or owner,
-- and they cannot give anyone else those roles.

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

  if not self_insert
     and auth.uid() is not null
     and not public.is_league_member(new.league_id) then
    raise exception 'You must be in this league to invite players.';
  end if;

  if not self_insert and new.role not in ('member', 'pending') and not public.can_manage_league(new.league_id) then
    raise exception 'Only a league owner or co-leader can grant that role.';
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

drop trigger if exists protect_league_member_insert on public.league_members;
create trigger protect_league_member_insert
before insert on public.league_members
for each row
execute function public.protect_league_member_insert();

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
    or (
      public.is_league_member(league_id)
      and not (user_id is not null and user_id = auth.uid())
      and not (
        coalesce(auth.jwt() ->> 'email', '') <> ''
        and email is not null
        and lower(email) = lower(auth.jwt() ->> 'email')
      )
      and role in ('member', 'pending')
    )
  )
);
