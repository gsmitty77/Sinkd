-- Sinkd security fixes
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Safe to run again. It does not delete leagues, games, or accounts.
--
-- What it changes:
-- 1. Only the current league owner can change roles above member, touch the
--    owner row, or change leagues.owner_id. Ownership moves in one transaction
--    through transfer_league_ownership().
-- 2. Co-leaders can still approve a pending request (pending -> member) and
--    can still kick members, pending players, and refs. They cannot kick the
--    owner or another co-leader, and they cannot change their own role.
-- 3. Members can still log new league games. Only the owner, co-leaders, and
--    refs can edit or delete league games.
-- 4. A notification insert must set created_by to the signed-in user, and the
--    recipient must be that user, a friend, or someone on a league roster the
--    sender belongs to.

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

drop policy if exists "authenticated users can create notifications" on public.notifications;
create policy "authenticated users can create notifications"
on public.notifications
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.can_create_notification(recipient_id, recipient_email, league_id)
);

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

notify pgrst, 'reload schema';
