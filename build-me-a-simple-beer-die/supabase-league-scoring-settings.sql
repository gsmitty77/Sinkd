alter table public.leagues
add column if not exists sink_auto_win boolean not null default false;

alter table public.leagues
add column if not exists fifa_multiplier boolean not null default false;
