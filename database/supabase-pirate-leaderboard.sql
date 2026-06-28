create table if not exists public.pirate_leaderboard (
  player_id text primary key,
  pirate_name text not null check (char_length(pirate_name) between 3 and 20),
  selected_pirate_id text,
  selected_pirate_name text,
  prestige_count integer not null default 0 check (prestige_count >= 0),
  best_prestige_level integer not null default 0 check (best_prestige_level >= 0),
  best_prestige_power numeric not null default 0 check (best_prestige_power >= 0),
  last_prestige_at timestamptz not null default now(),
  pvp_snapshot jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pirate_leaderboard_rank_idx
  on public.pirate_leaderboard (
    best_prestige_level desc,
    best_prestige_power desc,
    prestige_count desc,
    last_prestige_at desc
  );

alter table public.pirate_leaderboard enable row level security;

drop policy if exists "Pirate leaderboard public read" on public.pirate_leaderboard;
revoke all on public.pirate_leaderboard from anon, authenticated;

create or replace view public.pirate_leaderboard_public as
select
  player_id,
  pirate_name,
  selected_pirate_id,
  selected_pirate_name,
  prestige_count,
  best_prestige_level,
  best_prestige_power,
  last_prestige_at,
  updated_at
from public.pirate_leaderboard
where best_prestige_level >= 1;

grant select on public.pirate_leaderboard_public to anon, authenticated;

create or replace view public.pirate_arena_public as
select
  player_id,
  pirate_name,
  selected_pirate_id,
  selected_pirate_name,
  prestige_count,
  best_prestige_level,
  best_prestige_power,
  pvp_snapshot,
  last_prestige_at,
  updated_at
from public.pirate_leaderboard
where best_prestige_level >= 1
  and pvp_snapshot is not null;

grant select on public.pirate_arena_public to anon, authenticated;

create or replace function public.upsert_pirate_leaderboard(
  p_player_id text,
  p_pirate_name text,
  p_selected_pirate_id text,
  p_selected_pirate_name text,
  p_prestige_count integer,
  p_best_prestige_level integer,
  p_best_prestige_power numeric,
  p_last_prestige_at timestamptz,
  p_pvp_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_player_id is null or length(trim(p_player_id)) < 8 then
    raise exception 'player_id invalido';
  end if;

  if p_pirate_name is null or char_length(trim(p_pirate_name)) < 3 or char_length(trim(p_pirate_name)) > 20 then
    raise exception 'pirate_name invalido';
  end if;

  insert into public.pirate_leaderboard (
    player_id,
    pirate_name,
    selected_pirate_id,
    selected_pirate_name,
    prestige_count,
    best_prestige_level,
    best_prestige_power,
    last_prestige_at,
    pvp_snapshot,
    created_at,
    updated_at
  )
  values (
    trim(p_player_id),
    trim(p_pirate_name),
    nullif(trim(coalesce(p_selected_pirate_id, '')), ''),
    nullif(trim(coalesce(p_selected_pirate_name, '')), ''),
    greatest(0, coalesce(p_prestige_count, 0)),
    greatest(0, coalesce(p_best_prestige_level, 0)),
    greatest(0, coalesce(p_best_prestige_power, 0)),
    coalesce(p_last_prestige_at, now()),
    p_pvp_snapshot,
    now(),
    now()
  )
  on conflict (player_id) do update
  set
    pirate_name = excluded.pirate_name,
    selected_pirate_id = excluded.selected_pirate_id,
    selected_pirate_name = excluded.selected_pirate_name,
    prestige_count = greatest(public.pirate_leaderboard.prestige_count, excluded.prestige_count),
    best_prestige_level = greatest(public.pirate_leaderboard.best_prestige_level, excluded.best_prestige_level),
    best_prestige_power = greatest(public.pirate_leaderboard.best_prestige_power, excluded.best_prestige_power),
    last_prestige_at = greatest(public.pirate_leaderboard.last_prestige_at, excluded.last_prestige_at),
    pvp_snapshot = excluded.pvp_snapshot,
    updated_at = now();
end;
$$;

revoke all on function public.upsert_pirate_leaderboard(
  text,
  text,
  text,
  text,
  integer,
  integer,
  numeric,
  timestamptz,
  jsonb
) from public;

grant execute on function public.upsert_pirate_leaderboard(
  text,
  text,
  text,
  text,
  integer,
  integer,
  numeric,
  timestamptz,
  jsonb
) to anon, authenticated;
