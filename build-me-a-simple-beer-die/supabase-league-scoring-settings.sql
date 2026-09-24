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
