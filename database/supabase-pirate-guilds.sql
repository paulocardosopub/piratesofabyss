create extension if not exists pgcrypto;

create or replace function public.pirate_guild_full_message()
returns text
language sql
immutable
as $$
  select 'Esta Irmandade ja atingiu o limite maximo de 20 membros.';
$$;

create or replace function public.pirate_guild_day_key(p_now timestamptz default now())
returns text
language sql
stable
as $$
  select ((timezone('America/Sao_Paulo', p_now) - interval '12 hours')::date)::text;
$$;

create table if not exists public.pirate_guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 32),
  description text not null default '' check (char_length(description) <= 180),
  entry_mode text not null default 'open' check (entry_mode in ('open', 'application')),
  level integer not null default 1 check (level >= 1),
  experience integer not null default 0 check (experience >= 0),
  upgrades jsonb not null default '{"damage":0,"hp":0,"xp":0}'::jsonb,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pirate_guilds_name_lower_idx
  on public.pirate_guilds (lower(trim(name)));

create table if not exists public.pirate_guild_members (
  guild_id uuid not null references public.pirate_guilds(id) on delete cascade,
  player_id text not null,
  pirate_name text not null,
  role text not null default 'member' check (role in ('king', 'quartermaster', 'member')),
  contribution numeric not null default 0 check (contribution >= 0),
  boss_damage numeric not null default 0 check (boss_damage >= 0),
  boss_participation_count integer not null default 0 check (boss_participation_count >= 0),
  boss_damage_day_key text not null default public.pirate_guild_day_key(),
  player_snapshot jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (guild_id, player_id),
  unique (player_id)
);

alter table public.pirate_guild_members
  add column if not exists boss_damage_day_key text not null default public.pirate_guild_day_key();

update public.pirate_guild_members
set boss_damage_day_key = public.pirate_guild_day_key()
where boss_damage_day_key is null or boss_damage_day_key = '';

create index if not exists pirate_guild_members_guild_idx
  on public.pirate_guild_members (guild_id, role, updated_at desc);

create table if not exists public.pirate_guild_applications (
  guild_id uuid not null references public.pirate_guilds(id) on delete cascade,
  player_id text not null,
  pirate_name text not null,
  player_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  primary key (guild_id, player_id)
);

create unique index if not exists pirate_guild_applications_player_idx
  on public.pirate_guild_applications (player_id);

create table if not exists public.pirate_guild_boss_state (
  guild_id uuid primary key references public.pirate_guilds(id) on delete cascade,
  day_key text not null,
  current_boss_index integer not null default 0,
  boss_hp numeric not null default 0 check (boss_hp >= 0),
  boss_max_hp numeric not null default 0 check (boss_max_hp >= 0),
  damage_by_player jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.pirate_guild_boss_state
  add column if not exists active_player_id text,
  add column if not exists active_pirate_name text,
  add column if not exists active_until timestamptz;

alter table public.pirate_guild_boss_state
  drop constraint if exists pirate_guild_boss_state_current_boss_index_check;
alter table public.pirate_guild_boss_state
  drop constraint if exists pirate_guild_boss_state_current_boss_index_range;
alter table public.pirate_guild_boss_state
  add constraint pirate_guild_boss_state_current_boss_index_range
  check (current_boss_index between 0 and 21);

create table if not exists public.pirate_guild_boss_cooldowns (
  guild_id uuid not null references public.pirate_guilds(id) on delete cascade,
  player_id text not null,
  last_attempt_at timestamptz not null default now(),
  primary key (guild_id, player_id)
);

create table if not exists public.pirate_guild_security_events (
  id bigserial primary key,
  guild_id uuid references public.pirate_guilds(id) on delete set null,
  player_id text,
  action text not null,
  reason text not null,
  suspicion_level text not null default 'warning' check (suspicion_level in ('warning', 'limited', 'review', 'blocked')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists pirate_guild_security_events_player_idx
  on public.pirate_guild_security_events (player_id, action, created_at desc);

alter table public.pirate_guilds enable row level security;
alter table public.pirate_guild_members enable row level security;
alter table public.pirate_guild_applications enable row level security;
alter table public.pirate_guild_boss_state enable row level security;
alter table public.pirate_guild_boss_cooldowns enable row level security;
alter table public.pirate_guild_security_events enable row level security;

revoke all on public.pirate_guilds from anon, authenticated;
revoke all on public.pirate_guild_members from anon, authenticated;
revoke all on public.pirate_guild_applications from anon, authenticated;
revoke all on public.pirate_guild_boss_state from anon, authenticated;
revoke all on public.pirate_guild_boss_cooldowns from anon, authenticated;
revoke all on public.pirate_guild_security_events from anon, authenticated;

create or replace function public.pirate_guild_number_from_snapshot(p_snapshot jsonb, p_key text)
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_snapshot ->> p_key, '') ~ '^[0-9]+(\.[0-9]+)?$'
      then (p_snapshot ->> p_key)::numeric
    else 0
  end;
$$;

create or replace function public.pirate_guild_log_security_event(
  p_guild_id uuid,
  p_player_id text,
  p_action text,
  p_reason text,
  p_payload jsonb default '{}'::jsonb,
  p_suspicion_level text default 'warning'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.pirate_guild_security_events (guild_id, player_id, action, reason, suspicion_level, payload)
  values (
    p_guild_id,
    left(trim(coalesce(p_player_id, '')), 80),
    left(coalesce(p_action, 'unknown'), 80),
    left(coalesce(p_reason, 'unknown'), 160),
    case when p_suspicion_level in ('warning', 'limited', 'review', 'blocked') then p_suspicion_level else 'warning' end,
    coalesce(p_payload, '{}'::jsonb)
  );
exception
  when others then
    null;
end;
$$;

create or replace function public.pirate_guild_validate_player_id(p_player_id text)
returns text
language sql
immutable
as $$
  select case
    when char_length(trim(coalesce(p_player_id, ''))) between 8 and 80
      and trim(coalesce(p_player_id, '')) ~ '^[A-Za-z0-9:_-]+$'
    then null
    else 'player_id_invalido'
  end;
$$;

create or replace function public.pirate_guild_normalize_snapshot(p_snapshot jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_snapshot jsonb := case when jsonb_typeof(p_snapshot) = 'object' then p_snapshot else '{}'::jsonb end;
  v_gold numeric := public.pirate_guild_number_from_snapshot(v_snapshot, 'gold');
  v_level numeric := public.pirate_guild_number_from_snapshot(v_snapshot, 'level');
  v_power numeric := public.pirate_guild_number_from_snapshot(v_snapshot, 'naval_power');
  v_prestiges numeric := public.pirate_guild_number_from_snapshot(v_snapshot, 'prestige_count');
  v_hp numeric := public.pirate_guild_number_from_snapshot(v_snapshot, 'max_hp');
  v_damage numeric := public.pirate_guild_number_from_snapshot(v_snapshot, 'damage');
  v_dps numeric := public.pirate_guild_number_from_snapshot(v_snapshot, 'dps');
  v_map numeric := public.pirate_guild_number_from_snapshot(v_snapshot, 'highest_map_unlocked');
begin
  return jsonb_build_object(
    'player_id', left(coalesce(v_snapshot ->> 'player_id', ''), 80),
    'pirate_name', left(coalesce(v_snapshot ->> 'pirate_name', 'Pirata sem nome'), 32),
    'gold', least(1000000000000000::numeric, greatest(0, floor(v_gold))),
    'level', least(500, greatest(1, floor(v_level))),
    'captain_runtime_level', least(500, greatest(1, floor(public.pirate_guild_number_from_snapshot(v_snapshot, 'captain_runtime_level')))),
    'captain_name', left(coalesce(v_snapshot ->> 'captain_name', ''), 80),
    'ship_id', least(256, greatest(0, floor(public.pirate_guild_number_from_snapshot(v_snapshot, 'ship_id')))),
    'ship_name', left(coalesce(v_snapshot ->> 'ship_name', 'Navio'), 80),
    'ship_level', least(100, greatest(0, floor(public.pirate_guild_number_from_snapshot(v_snapshot, 'ship_level')))),
    'naval_power', least(1000000000000000::numeric, greatest(0, floor(v_power))),
    'prestige_count', least(10000, greatest(0, floor(v_prestiges))),
    'max_hp', least(1000000000000000::numeric, greatest(0, floor(v_hp))),
    'damage', least(1000000000000000::numeric, greatest(0, floor(v_damage))),
    'dps', least(1000000000000000::numeric, greatest(0, floor(v_dps))),
    'highest_map_unlocked', least(64, greatest(1, floor(v_map))),
    'highest_map_name', left(coalesce(v_snapshot ->> 'highest_map_name', ''), 80),
    'updated_at', left(coalesce(v_snapshot ->> 'updated_at', ''), 40)
  );
end;
$$;

create or replace function public.pirate_guild_reset_daily_boss_damage(
  p_guild_id uuid,
  p_day_key text default public.pirate_guild_day_key()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day_key text := coalesce(nullif(trim(coalesce(p_day_key, '')), ''), public.pirate_guild_day_key());
begin
  update public.pirate_guild_members
  set boss_damage = 0,
      boss_participation_count = 0,
      boss_damage_day_key = v_day_key,
      updated_at = now()
  where guild_id = p_guild_id
    and boss_damage_day_key <> v_day_key;
end;
$$;

create or replace function public.get_pirate_guild_home(p_player_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_membership public.pirate_guild_members%rowtype;
  v_day_key text := public.pirate_guild_day_key();
  v_cooldown_until timestamptz;
begin
  select *
    into v_membership
  from public.pirate_guild_members
  where player_id = v_player_id
  limit 1;

  if v_membership.guild_id is not null then
    perform public.pirate_guild_reset_daily_boss_damage(v_membership.guild_id, v_day_key);

    select last_attempt_at + interval '3 minutes'
      into v_cooldown_until
    from public.pirate_guild_boss_cooldowns
    where guild_id = v_membership.guild_id
      and player_id = v_player_id;
  end if;

  return jsonb_build_object(
    'guilds',
    coalesce((
      with member_stats as (
        select
          guild_id,
          count(*)::integer as member_count,
          coalesce(sum(public.pirate_guild_number_from_snapshot(player_snapshot, 'naval_power')), 0) as total_power,
          coalesce(sum(public.pirate_guild_number_from_snapshot(player_snapshot, 'prestige_count')), 0) as total_prestiges,
          coalesce(sum(contribution), 0) as total_contribution
        from public.pirate_guild_members
        group by guild_id
      )
      select jsonb_agg(jsonb_build_object(
        'id', g.id,
        'name', g.name,
        'description', g.description,
        'entry_mode', g.entry_mode,
        'level', g.level,
        'experience', g.experience,
        'upgrades', g.upgrades,
        'member_count', coalesce(ms.member_count, 0),
        'total_power', coalesce(ms.total_power, 0),
        'total_prestiges', coalesce(ms.total_prestiges, 0),
        'total_contribution', coalesce(ms.total_contribution, 0)
      ) order by g.level desc, coalesce(ms.total_power, 0) desc, g.created_at asc)
      from public.pirate_guilds g
      left join member_stats ms on ms.guild_id = g.id
    ), '[]'::jsonb),
    'current',
    case
      when v_membership.guild_id is null then null
      else (
        with member_stats as (
          select
            guild_id,
            count(*)::integer as member_count,
            coalesce(sum(public.pirate_guild_number_from_snapshot(player_snapshot, 'naval_power')), 0) as total_power,
            coalesce(sum(public.pirate_guild_number_from_snapshot(player_snapshot, 'prestige_count')), 0) as total_prestiges,
            coalesce(sum(contribution), 0) as total_contribution
          from public.pirate_guild_members
          where guild_id = v_membership.guild_id
          group by guild_id
        )
        select jsonb_build_object(
          'role', v_membership.role,
          'guild', jsonb_build_object(
            'id', g.id,
            'name', g.name,
            'description', g.description,
            'entry_mode', g.entry_mode,
            'level', g.level,
            'experience', g.experience,
            'upgrades', g.upgrades,
            'member_count', coalesce(ms.member_count, 0),
            'total_power', coalesce(ms.total_power, 0),
            'total_prestiges', coalesce(ms.total_prestiges, 0),
            'total_contribution', coalesce(ms.total_contribution, 0)
          ),
          'members', coalesce((
            select jsonb_agg(jsonb_build_object(
              'player_id', m.player_id,
              'pirate_name', m.pirate_name,
              'role', m.role,
              'contribution', m.contribution,
              'boss_damage', m.boss_damage,
              'boss_participation_count', m.boss_participation_count,
              'boss_damage_day_key', m.boss_damage_day_key,
              'player_snapshot', m.player_snapshot,
              'joined_at', m.joined_at,
              'updated_at', m.updated_at
            ) order by public.pirate_guild_number_from_snapshot(m.player_snapshot, 'prestige_count') desc, public.pirate_guild_number_from_snapshot(m.player_snapshot, 'naval_power') desc)
            from public.pirate_guild_members m
            where m.guild_id = g.id
          ), '[]'::jsonb),
          'applications', case
            when v_membership.role in ('king', 'quartermaster') then coalesce((
              select jsonb_agg(jsonb_build_object(
                'player_id', a.player_id,
                'pirate_name', a.pirate_name,
                'player_snapshot', a.player_snapshot,
                'created_at', a.created_at
              ) order by a.created_at asc)
              from public.pirate_guild_applications a
              where a.guild_id = g.id
            ), '[]'::jsonb)
            else '[]'::jsonb
          end,
          'boss_state', coalesce((
            select jsonb_build_object(
              'day_key', coalesce(bs.day_key, v_day_key),
              'current_boss_index', case when bs.day_key = v_day_key then bs.current_boss_index else 0 end,
              'boss_hp', case when bs.day_key = v_day_key then bs.boss_hp else 0 end,
              'boss_max_hp', case when bs.day_key = v_day_key then bs.boss_max_hp else 0 end,
              'damage_by_player', case when bs.day_key = v_day_key then bs.damage_by_player else '{}'::jsonb end,
              'active_player_id', case when bs.day_key = v_day_key and bs.active_until > now() then bs.active_player_id else null end,
              'active_pirate_name', case when bs.day_key = v_day_key and bs.active_until > now() then bs.active_pirate_name else null end,
              'active_until', case when bs.day_key = v_day_key and bs.active_until > now() then bs.active_until else null end,
              'cooldown_until', v_cooldown_until
            )
            from public.pirate_guild_boss_state bs
            where bs.guild_id = g.id
          ), jsonb_build_object(
            'day_key', v_day_key,
            'current_boss_index', 0,
            'boss_hp', 0,
            'boss_max_hp', 0,
            'damage_by_player', '{}'::jsonb,
            'active_player_id', null,
            'active_pirate_name', null,
            'active_until', null,
            'cooldown_until', v_cooldown_until
          ))
        )
        from public.pirate_guilds g
        left join member_stats ms on ms.guild_id = g.id
        where g.id = v_membership.guild_id
      )
    end
  );
end;
$$;

create or replace function public.upsert_pirate_guild_profile(
  p_player_id text,
  p_pirate_name text,
  p_player_snapshot jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_player_id_error text := public.pirate_guild_validate_player_id(p_player_id);
  v_snapshot jsonb := public.pirate_guild_normalize_snapshot(p_player_snapshot);
begin
  if v_player_id_error is not null then
    perform public.pirate_guild_log_security_event(null, v_player_id, 'profile_sync', v_player_id_error, '{}'::jsonb, 'blocked');
    raise exception 'player_id invalido';
  end if;

  update public.pirate_guild_members
  set pirate_name = trim(coalesce(p_pirate_name, pirate_name)),
      player_snapshot = v_snapshot,
      updated_at = now()
  where player_id = v_player_id;

  return jsonb_build_object('ok', found);
end;
$$;

create or replace function public.create_pirate_guild(
  p_player_id text,
  p_pirate_name text,
  p_player_snapshot jsonb,
  p_name text,
  p_description text default '',
  p_entry_mode text default 'open'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_name text := trim(coalesce(p_name, ''));
  v_guild_id uuid;
  v_player_id_error text := public.pirate_guild_validate_player_id(p_player_id);
  v_snapshot jsonb := public.pirate_guild_normalize_snapshot(p_player_snapshot);
begin
  if v_player_id_error is not null then
    perform public.pirate_guild_log_security_event(null, v_player_id, 'create_guild', v_player_id_error, '{}'::jsonb, 'blocked');
    raise exception 'player_id invalido';
  end if;
  if char_length(v_name) < 3 or char_length(v_name) > 32 then raise exception 'nome invalido'; end if;
  if public.pirate_guild_number_from_snapshot(v_snapshot, 'gold') < 10000 then
    perform public.pirate_guild_log_security_event(null, v_player_id, 'create_guild', 'gold_insuficiente', jsonb_build_object('gold', public.pirate_guild_number_from_snapshot(v_snapshot, 'gold')), 'warning');
    raise exception 'Ouro insuficiente para criar a Irmandade.';
  end if;
  if exists (select 1 from public.pirate_guild_members where player_id = v_player_id) then
    raise exception 'jogador ja esta em uma irmandade';
  end if;

  insert into public.pirate_guilds (name, description, entry_mode, created_by)
  values (v_name, left(trim(coalesce(p_description, '')), 180), case when p_entry_mode = 'application' then 'application' else 'open' end, v_player_id)
  returning id into v_guild_id;

  insert into public.pirate_guild_members (guild_id, player_id, pirate_name, role, player_snapshot)
  values (v_guild_id, v_player_id, trim(coalesce(p_pirate_name, 'Pirata sem nome')), 'king', v_snapshot);

  return jsonb_build_object('ok', true, 'guild_id', v_guild_id);
end;
$$;

create or replace function public.join_pirate_guild(
  p_player_id text,
  p_pirate_name text,
  p_player_snapshot jsonb,
  p_guild_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_guild public.pirate_guilds%rowtype;
  v_member_count integer;
  v_player_id_error text := public.pirate_guild_validate_player_id(p_player_id);
  v_snapshot jsonb := public.pirate_guild_normalize_snapshot(p_player_snapshot);
begin
  if v_player_id_error is not null then
    perform public.pirate_guild_log_security_event(p_guild_id, v_player_id, 'join_guild', v_player_id_error, '{}'::jsonb, 'blocked');
    raise exception 'player_id invalido';
  end if;

  if exists (select 1 from public.pirate_guild_members where player_id = v_player_id) then
    raise exception 'jogador ja esta em uma irmandade';
  end if;

  select * into v_guild from public.pirate_guilds where id = p_guild_id for update;
  if v_guild.id is null then raise exception 'irmandade nao encontrada'; end if;

  select count(*)::integer into v_member_count
  from public.pirate_guild_members
  where guild_id = p_guild_id;

  if v_member_count >= 20 then
    raise exception '%', public.pirate_guild_full_message();
  end if;

  if v_guild.entry_mode = 'open' then
    insert into public.pirate_guild_members (guild_id, player_id, pirate_name, role, player_snapshot)
    values (p_guild_id, v_player_id, trim(coalesce(p_pirate_name, 'Pirata sem nome')), 'member', v_snapshot);
    delete from public.pirate_guild_applications where player_id = v_player_id;
    return jsonb_build_object('ok', true, 'status', 'joined');
  end if;

  insert into public.pirate_guild_applications (guild_id, player_id, pirate_name, player_snapshot)
  values (p_guild_id, v_player_id, trim(coalesce(p_pirate_name, 'Pirata sem nome')), v_snapshot)
  on conflict (player_id) do update
  set guild_id = excluded.guild_id,
      pirate_name = excluded.pirate_name,
      player_snapshot = excluded.player_snapshot,
      created_at = now();

  return jsonb_build_object('ok', true, 'status', 'applied');
end;
$$;

create or replace function public.update_pirate_guild_config(
  p_player_id text,
  p_guild_id uuid,
  p_name text,
  p_description text,
  p_entry_mode text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text := trim(coalesce(p_name, ''));
begin
  select role into v_role
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = trim(coalesce(p_player_id, ''));

  if v_role not in ('king', 'quartermaster') then raise exception 'sem permissao'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 32 then raise exception 'nome invalido'; end if;

  update public.pirate_guilds
  set name = v_name,
      description = left(trim(coalesce(p_description, '')), 180),
      entry_mode = case when p_entry_mode = 'application' then 'application' else 'open' end,
      updated_at = now()
  where id = p_guild_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.set_pirate_guild_role(
  p_player_id text,
  p_guild_id uuid,
  p_target_player_id text,
  p_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_target_role text;
begin
  select role into v_actor_role from public.pirate_guild_members where guild_id = p_guild_id and player_id = trim(coalesce(p_player_id, ''));
  select role into v_target_role from public.pirate_guild_members where guild_id = p_guild_id and player_id = trim(coalesce(p_target_player_id, ''));

  if v_actor_role not in ('king', 'quartermaster') then raise exception 'sem permissao'; end if;
  if v_target_role is null then raise exception 'membro alvo invalido'; end if;

  if p_role = 'king' then
    if v_actor_role <> 'king' then raise exception 'apenas o Rei Pirata pode transferir lideranca'; end if;
    update public.pirate_guild_members set role = 'member', updated_at = now() where guild_id = p_guild_id and role = 'king';
    update public.pirate_guild_members set role = 'king', updated_at = now() where guild_id = p_guild_id and player_id = trim(coalesce(p_target_player_id, ''));
  elsif p_role = 'quartermaster' then
    if v_target_role = 'king' then raise exception 'Rei Pirata nao pode ser Intendente simultaneamente'; end if;
    update public.pirate_guild_members set role = 'member', updated_at = now() where guild_id = p_guild_id and role = 'quartermaster';
    update public.pirate_guild_members set role = 'quartermaster', updated_at = now() where guild_id = p_guild_id and player_id = trim(coalesce(p_target_player_id, ''));
  else
    raise exception 'cargo invalido';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.kick_pirate_guild_member(
  p_player_id text,
  p_guild_id uuid,
  p_target_player_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id text := trim(coalesce(p_player_id, ''));
  v_target_id text := trim(coalesce(p_target_player_id, ''));
  v_actor_role text;
  v_target_role text;
  v_target_name text;
begin
  if v_actor_id = '' or v_target_id = '' then raise exception 'membro alvo invalido'; end if;
  if v_actor_id = v_target_id then raise exception 'voce nao pode expulsar a si mesmo'; end if;

  select role into v_actor_role
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = v_actor_id;

  select role, pirate_name into v_target_role, v_target_name
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = v_target_id;

  if v_actor_role not in ('king', 'quartermaster') then raise exception 'sem permissao'; end if;
  if v_target_role is null then raise exception 'membro alvo invalido'; end if;
  if v_target_role = 'king' then raise exception 'Rei Pirata nao pode ser expulso'; end if;
  if v_actor_role = 'quartermaster' and v_target_role <> 'member' then raise exception 'Intendente so pode expulsar membros'; end if;

  delete from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = v_target_id;

  delete from public.pirate_guild_applications
  where guild_id = p_guild_id and player_id = v_target_id;

  delete from public.pirate_guild_boss_cooldowns
  where guild_id = p_guild_id and player_id = v_target_id;

  update public.pirate_guild_boss_state
  set active_player_id = null,
      active_pirate_name = null,
      active_until = null,
      updated_at = now()
  where guild_id = p_guild_id
    and active_player_id = v_target_id;

  update public.pirate_guilds
  set updated_at = now()
  where id = p_guild_id;

  return jsonb_build_object('ok', true, 'target_player_id', v_target_id, 'target_pirate_name', coalesce(v_target_name, ''));
end;
$$;

create or replace function public.decide_pirate_guild_application(
  p_player_id text,
  p_guild_id uuid,
  p_applicant_player_id text,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_application public.pirate_guild_applications%rowtype;
  v_member_count integer;
begin
  select role into v_role
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = trim(coalesce(p_player_id, ''));

  if v_role not in ('king', 'quartermaster') then raise exception 'sem permissao'; end if;

  select * into v_application
  from public.pirate_guild_applications
  where guild_id = p_guild_id and player_id = trim(coalesce(p_applicant_player_id, ''));

  if v_application.player_id is null then raise exception 'solicitacao nao encontrada'; end if;

  if p_approve then
    perform 1 from public.pirate_guilds where id = p_guild_id for update;
    select count(*)::integer into v_member_count
    from public.pirate_guild_members
    where guild_id = p_guild_id;

    if v_member_count >= 20 then
      raise exception '%', public.pirate_guild_full_message();
    end if;

    insert into public.pirate_guild_members (guild_id, player_id, pirate_name, role, player_snapshot)
    values (p_guild_id, v_application.player_id, v_application.pirate_name, 'member', v_application.player_snapshot);
  end if;

  delete from public.pirate_guild_applications
  where guild_id = p_guild_id and player_id = v_application.player_id;

  return jsonb_build_object('ok', true, 'approved', coalesce(p_approve, false));
end;
$$;

create or replace function public.upgrade_pirate_guild_bonus(
  p_player_id text,
  p_guild_id uuid,
  p_upgrade_key text,
  p_cost integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guild public.pirate_guilds%rowtype;
  v_actor_role text;
  v_current_level integer;
  v_expected_cost integer;
  v_next_level integer;
begin
  if p_upgrade_key not in ('damage', 'hp', 'xp') then raise exception 'melhoria invalida'; end if;
  select role into v_actor_role
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = trim(coalesce(p_player_id, ''));

  if v_actor_role is null then raise exception 'jogador fora da irmandade'; end if;
  if v_actor_role not in ('king', 'quartermaster') then raise exception 'Apenas Rei Pirata e Intendente podem distribuir EXP da Irmandade.'; end if;

  select * into v_guild from public.pirate_guilds where id = p_guild_id for update;
  if v_guild.id is null then raise exception 'irmandade nao encontrada'; end if;

  v_current_level := least(10, greatest(0, coalesce((v_guild.upgrades ->> p_upgrade_key)::integer, 0)));
  if v_current_level >= 10 then raise exception 'melhoria no maximo'; end if;
  v_next_level := v_current_level + 1;
  v_expected_cost := v_next_level;

  if coalesce(p_cost, v_expected_cost) <> v_expected_cost then raise exception 'custo invalido'; end if;
  if v_guild.experience < v_expected_cost then raise exception 'experiencia insuficiente'; end if;

  update public.pirate_guilds
  set experience = experience - v_expected_cost,
      upgrades = jsonb_set(upgrades, array[p_upgrade_key], to_jsonb(v_next_level), true),
      updated_at = now()
  where id = p_guild_id;

  update public.pirate_guild_members
  set contribution = contribution + v_expected_cost,
      updated_at = now()
  where guild_id = p_guild_id and player_id = trim(coalesce(p_player_id, ''));

  return jsonb_build_object('ok', true, 'upgrade_key', p_upgrade_key, 'level', v_next_level);
end;
$$;

create or replace function public.start_pirate_guild_boss_attempt(
  p_player_id text,
  p_guild_id uuid,
  p_boss_index integer,
  p_boss_max_hp numeric,
  p_boss_payload jsonb default '{}'::jsonb,
  p_player_snapshot jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_member public.pirate_guild_members%rowtype;
  v_state public.pirate_guild_boss_state%rowtype;
  v_day_key text := public.pirate_guild_day_key();
  v_cooldown timestamptz;
  v_player_id_error text := public.pirate_guild_validate_player_id(p_player_id);
  v_snapshot jsonb := public.pirate_guild_normalize_snapshot(p_player_snapshot);
begin
  if v_player_id_error is not null then
    perform public.pirate_guild_log_security_event(p_guild_id, v_player_id, 'start_guild_boss', v_player_id_error, '{}'::jsonb, 'blocked');
    raise exception 'player_id invalido';
  end if;
  if p_boss_index < 0 or p_boss_index > 20 then raise exception 'boss invalido'; end if;
  if p_boss_max_hp <= 0 then raise exception 'hp invalido'; end if;
  if p_boss_max_hp > 1000000000000000 then
    perform public.pirate_guild_log_security_event(p_guild_id, v_player_id, 'start_guild_boss', 'boss_hp_absurdo', jsonb_build_object('boss_max_hp', p_boss_max_hp), 'blocked');
    raise exception 'hp invalido';
  end if;

  select * into v_member
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = v_player_id;
  if v_member.player_id is null then raise exception 'jogador fora da irmandade'; end if;

  perform public.pirate_guild_reset_daily_boss_damage(p_guild_id, v_day_key);

  select last_attempt_at + interval '3 minutes'
    into v_cooldown
  from public.pirate_guild_boss_cooldowns
  where guild_id = p_guild_id and player_id = v_player_id;

  if v_cooldown is not null and v_cooldown > now() then
    raise exception 'cooldown ativo ate %', v_cooldown;
  end if;

  insert into public.pirate_guild_boss_state (guild_id, day_key, current_boss_index, boss_hp, boss_max_hp, damage_by_player)
  values (p_guild_id, v_day_key, 0, case when p_boss_index = 0 then p_boss_max_hp else 0 end, case when p_boss_index = 0 then p_boss_max_hp else 0 end, '{}'::jsonb)
  on conflict (guild_id) do nothing;

  select * into v_state
  from public.pirate_guild_boss_state
  where guild_id = p_guild_id
  for update;

  if v_state.day_key <> v_day_key then
    update public.pirate_guild_boss_state
    set day_key = v_day_key,
        current_boss_index = 0,
        boss_hp = case when p_boss_index = 0 then p_boss_max_hp else 0 end,
        boss_max_hp = case when p_boss_index = 0 then p_boss_max_hp else 0 end,
        damage_by_player = '{}'::jsonb,
        active_player_id = null,
        active_pirate_name = null,
        active_until = null,
        updated_at = now()
    where guild_id = p_guild_id
    returning * into v_state;
  end if;

  if v_state.current_boss_index <> p_boss_index then raise exception 'boss bloqueado'; end if;

  if v_state.boss_hp <= 0 or v_state.boss_max_hp <= 0 then
    update public.pirate_guild_boss_state
    set boss_hp = p_boss_max_hp,
        boss_max_hp = p_boss_max_hp,
        updated_at = now()
    where guild_id = p_guild_id
    returning * into v_state;
  end if;

  if v_state.active_until is not null
    and v_state.active_until > now()
    and coalesce(v_state.active_player_id, '') <> v_player_id then
    raise exception '% esta desafiando', coalesce(nullif(v_state.active_pirate_name, ''), 'Outro jogador');
  end if;

  insert into public.pirate_guild_boss_cooldowns (guild_id, player_id, last_attempt_at)
  values (p_guild_id, v_player_id, now())
  on conflict (guild_id, player_id) do update
  set last_attempt_at = excluded.last_attempt_at;

  update public.pirate_guild_members
  set player_snapshot = v_snapshot,
      updated_at = now()
  where guild_id = p_guild_id and player_id = v_player_id;

  update public.pirate_guild_boss_state
  set active_player_id = v_player_id,
      active_pirate_name = left(coalesce(nullif(v_snapshot ->> 'pirate_name', ''), v_member.pirate_name, 'Pirata'), 32),
      active_until = now() + interval '30 seconds',
      updated_at = now()
  where guild_id = p_guild_id
  returning * into v_state;

  return jsonb_build_object(
    'ok', true,
    'boss_state', jsonb_build_object(
      'day_key', v_state.day_key,
      'current_boss_index', v_state.current_boss_index,
      'boss_hp', v_state.boss_hp,
      'boss_max_hp', v_state.boss_max_hp,
      'damage_by_player', v_state.damage_by_player,
      'active_player_id', v_state.active_player_id,
      'active_pirate_name', v_state.active_pirate_name,
      'active_until', v_state.active_until,
      'cooldown_until', now() + interval '3 minutes'
    )
  );
end;
$$;

create or replace function public.finish_pirate_guild_boss_attempt(
  p_player_id text,
  p_guild_id uuid,
  p_boss_index integer,
  p_damage numeric,
  p_boss_max_hp numeric,
  p_player_snapshot jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_member public.pirate_guild_members%rowtype;
  v_state public.pirate_guild_boss_state%rowtype;
  v_day_key text := public.pirate_guild_day_key();
  v_damage numeric := greatest(0, coalesce(p_damage, 0));
  v_new_hp numeric;
  v_defeated boolean := false;
  v_player_total numeric;
  v_player_id_error text := public.pirate_guild_validate_player_id(p_player_id);
  v_snapshot jsonb := public.pirate_guild_normalize_snapshot(p_player_snapshot);
begin
  if v_player_id_error is not null then
    perform public.pirate_guild_log_security_event(p_guild_id, v_player_id, 'finish_guild_boss', v_player_id_error, '{}'::jsonb, 'blocked');
    raise exception 'player_id invalido';
  end if;
  if p_boss_index < 0 or p_boss_index > 20 then raise exception 'boss invalido'; end if;
  if p_boss_max_hp <= 0 or p_boss_max_hp > 1000000000000000 then raise exception 'hp invalido'; end if;
  if v_damage > greatest(p_boss_max_hp * 2, public.pirate_guild_number_from_snapshot(v_snapshot, 'dps') * 900, 1000000) then
    perform public.pirate_guild_log_security_event(p_guild_id, v_player_id, 'finish_guild_boss', 'dano_absurdo', jsonb_build_object('damage', v_damage, 'boss_max_hp', p_boss_max_hp), 'blocked');
    raise exception 'dano invalido';
  end if;

  select * into v_member
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = v_player_id;
  if v_member.player_id is null then raise exception 'jogador fora da irmandade'; end if;

  perform public.pirate_guild_reset_daily_boss_damage(p_guild_id, v_day_key);

  select * into v_state
  from public.pirate_guild_boss_state
  where guild_id = p_guild_id
  for update;
  if v_state.guild_id is null then raise exception 'boss nao iniciado'; end if;

  if v_state.day_key <> v_day_key then
    update public.pirate_guild_boss_state
    set day_key = v_day_key,
        current_boss_index = 0,
        boss_hp = case when p_boss_index = 0 then greatest(p_boss_max_hp, 0) else 0 end,
        boss_max_hp = case when p_boss_index = 0 then greatest(p_boss_max_hp, 0) else 0 end,
        damage_by_player = '{}'::jsonb,
        active_player_id = null,
        active_pirate_name = null,
        active_until = null,
        updated_at = now()
    where guild_id = p_guild_id
    returning * into v_state;
  end if;

  if v_state.current_boss_index <> p_boss_index then raise exception 'boss desatualizado'; end if;

  if v_state.active_until is not null
    and v_state.active_until > now()
    and coalesce(v_state.active_player_id, '') <> v_player_id then
    raise exception 'outro jogador esta desafiando';
  end if;

  if v_damage <= 0 then
    update public.pirate_guild_boss_state
    set active_player_id = null,
        active_pirate_name = null,
        active_until = null,
        updated_at = now()
    where guild_id = p_guild_id
    returning * into v_state;

    return jsonb_build_object(
      'ok', true,
      'reward_granted', false,
      'boss_defeated', false,
      'boss_state', jsonb_build_object(
        'day_key', v_state.day_key,
        'current_boss_index', v_state.current_boss_index,
        'boss_hp', v_state.boss_hp,
        'boss_max_hp', v_state.boss_max_hp,
        'damage_by_player', v_state.damage_by_player,
        'active_player_id', v_state.active_player_id,
        'active_pirate_name', v_state.active_pirate_name,
        'active_until', v_state.active_until
      )
    );
  end if;

  v_new_hp := greatest(0, v_state.boss_hp - v_damage);
  v_defeated := v_new_hp <= 0;
  v_player_total := coalesce((v_state.damage_by_player ->> v_player_id)::numeric, 0) + v_damage;

  update public.pirate_guild_members
  set contribution = contribution + floor(v_damage),
      boss_damage = boss_damage + floor(v_damage),
      boss_participation_count = boss_participation_count + 1,
      boss_damage_day_key = v_day_key,
      player_snapshot = v_snapshot,
      updated_at = now()
  where guild_id = p_guild_id and player_id = v_player_id;

  if v_defeated then
    update public.pirate_guild_boss_state
    set current_boss_index = least(21, current_boss_index + 1),
        boss_hp = 0,
        boss_max_hp = 0,
        damage_by_player = jsonb_set(damage_by_player, array[v_player_id], to_jsonb(v_player_total), true),
        active_player_id = null,
        active_pirate_name = null,
        active_until = null,
        updated_at = now()
    where guild_id = p_guild_id
    returning * into v_state;

    update public.pirate_guilds
    set level = level + 1,
        experience = experience + 1,
        updated_at = now()
    where id = p_guild_id;
  else
    update public.pirate_guild_boss_state
    set boss_hp = v_new_hp,
        damage_by_player = jsonb_set(damage_by_player, array[v_player_id], to_jsonb(v_player_total), true),
        active_player_id = null,
        active_pirate_name = null,
        active_until = null,
        updated_at = now()
    where guild_id = p_guild_id
    returning * into v_state;
  end if;

  return jsonb_build_object(
    'ok', true,
    'reward_granted', true,
    'boss_defeated', v_defeated,
    'boss_state', jsonb_build_object(
      'day_key', v_state.day_key,
      'current_boss_index', v_state.current_boss_index,
      'boss_hp', v_state.boss_hp,
      'boss_max_hp', v_state.boss_max_hp,
      'damage_by_player', v_state.damage_by_player,
      'active_player_id', v_state.active_player_id,
      'active_pirate_name', v_state.active_pirate_name,
      'active_until', v_state.active_until
    )
  );
end;
$$;

revoke all on function public.get_pirate_guild_home(text) from public;
revoke all on function public.pirate_guild_full_message() from public;
revoke all on function public.pirate_guild_number_from_snapshot(jsonb, text) from public;
revoke all on function public.pirate_guild_log_security_event(uuid, text, text, text, jsonb, text) from public;
revoke all on function public.pirate_guild_validate_player_id(text) from public;
revoke all on function public.pirate_guild_normalize_snapshot(jsonb) from public;
revoke all on function public.pirate_guild_reset_daily_boss_damage(uuid, text) from public;
revoke all on function public.upsert_pirate_guild_profile(text, text, jsonb) from public;
revoke all on function public.create_pirate_guild(text, text, jsonb, text, text, text) from public;
revoke all on function public.join_pirate_guild(text, text, jsonb, uuid) from public;
revoke all on function public.update_pirate_guild_config(text, uuid, text, text, text) from public;
revoke all on function public.set_pirate_guild_role(text, uuid, text, text) from public;
revoke all on function public.kick_pirate_guild_member(text, uuid, text) from public;
revoke all on function public.decide_pirate_guild_application(text, uuid, text, boolean) from public;
revoke all on function public.upgrade_pirate_guild_bonus(text, uuid, text, integer) from public;
revoke all on function public.start_pirate_guild_boss_attempt(text, uuid, integer, numeric, jsonb, jsonb) from public;
revoke all on function public.finish_pirate_guild_boss_attempt(text, uuid, integer, numeric, numeric, jsonb) from public;

grant execute on function public.get_pirate_guild_home(text) to anon, authenticated;
grant execute on function public.pirate_guild_full_message() to anon, authenticated;
grant execute on function public.pirate_guild_reset_daily_boss_damage(uuid, text) to anon, authenticated;
grant execute on function public.upsert_pirate_guild_profile(text, text, jsonb) to anon, authenticated;
grant execute on function public.create_pirate_guild(text, text, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.join_pirate_guild(text, text, jsonb, uuid) to anon, authenticated;
grant execute on function public.update_pirate_guild_config(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.set_pirate_guild_role(text, uuid, text, text) to anon, authenticated;
grant execute on function public.kick_pirate_guild_member(text, uuid, text) to anon, authenticated;
grant execute on function public.decide_pirate_guild_application(text, uuid, text, boolean) to anon, authenticated;
grant execute on function public.upgrade_pirate_guild_bonus(text, uuid, text, integer) to anon, authenticated;
grant execute on function public.start_pirate_guild_boss_attempt(text, uuid, integer, numeric, jsonb, jsonb) to anon, authenticated;
grant execute on function public.finish_pirate_guild_boss_attempt(text, uuid, integer, numeric, numeric, jsonb) to anon, authenticated;
