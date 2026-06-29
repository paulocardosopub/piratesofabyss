create extension if not exists pgcrypto;

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
  player_snapshot jsonb not null default '{}'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (guild_id, player_id),
  unique (player_id)
);

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

alter table public.pirate_guilds enable row level security;
alter table public.pirate_guild_members enable row level security;
alter table public.pirate_guild_applications enable row level security;
alter table public.pirate_guild_boss_state enable row level security;
alter table public.pirate_guild_boss_cooldowns enable row level security;

revoke all on public.pirate_guilds from anon, authenticated;
revoke all on public.pirate_guild_members from anon, authenticated;
revoke all on public.pirate_guild_applications from anon, authenticated;
revoke all on public.pirate_guild_boss_state from anon, authenticated;
revoke all on public.pirate_guild_boss_cooldowns from anon, authenticated;

create or replace function public.pirate_guild_day_key(p_now timestamptz default now())
returns text
language sql
stable
as $$
  select ((timezone('America/Sao_Paulo', p_now) - interval '12 hours')::date)::text;
$$;

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
    select last_attempt_at + interval '10 minutes'
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
begin
  update public.pirate_guild_members
  set pirate_name = trim(coalesce(p_pirate_name, pirate_name)),
      player_snapshot = coalesce(p_player_snapshot, '{}'::jsonb),
      updated_at = now()
  where player_id = trim(coalesce(p_player_id, ''));

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
begin
  if length(v_player_id) < 8 then raise exception 'player_id invalido'; end if;
  if char_length(v_name) < 3 or char_length(v_name) > 32 then raise exception 'nome invalido'; end if;
  if exists (select 1 from public.pirate_guild_members where player_id = v_player_id) then
    raise exception 'jogador ja esta em uma irmandade';
  end if;

  insert into public.pirate_guilds (name, description, entry_mode, created_by)
  values (v_name, left(trim(coalesce(p_description, '')), 180), case when p_entry_mode = 'application' then 'application' else 'open' end, v_player_id)
  returning id into v_guild_id;

  insert into public.pirate_guild_members (guild_id, player_id, pirate_name, role, player_snapshot)
  values (v_guild_id, v_player_id, trim(coalesce(p_pirate_name, 'Pirata sem nome')), 'king', coalesce(p_player_snapshot, '{}'::jsonb));

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
begin
  if exists (select 1 from public.pirate_guild_members where player_id = v_player_id) then
    raise exception 'jogador ja esta em uma irmandade';
  end if;

  select * into v_guild from public.pirate_guilds where id = p_guild_id;
  if v_guild.id is null then raise exception 'irmandade nao encontrada'; end if;

  if v_guild.entry_mode = 'open' then
    insert into public.pirate_guild_members (guild_id, player_id, pirate_name, role, player_snapshot)
    values (p_guild_id, v_player_id, trim(coalesce(p_pirate_name, 'Pirata sem nome')), 'member', coalesce(p_player_snapshot, '{}'::jsonb));
    delete from public.pirate_guild_applications where player_id = v_player_id;
    return jsonb_build_object('ok', true, 'status', 'joined');
  end if;

  insert into public.pirate_guild_applications (guild_id, player_id, pirate_name, player_snapshot)
  values (p_guild_id, v_player_id, trim(coalesce(p_pirate_name, 'Pirata sem nome')), coalesce(p_player_snapshot, '{}'::jsonb))
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
  v_current_level integer;
  v_expected_cost integer;
  v_next_level integer;
begin
  if p_upgrade_key not in ('damage', 'hp', 'xp') then raise exception 'melhoria invalida'; end if;
  if not exists (select 1 from public.pirate_guild_members where guild_id = p_guild_id and player_id = trim(coalesce(p_player_id, ''))) then
    raise exception 'jogador fora da irmandade';
  end if;

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
begin
  if p_boss_index < 0 or p_boss_index > 20 then raise exception 'boss invalido'; end if;
  if p_boss_max_hp <= 0 then raise exception 'hp invalido'; end if;

  select * into v_member
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = v_player_id;
  if v_member.player_id is null then raise exception 'jogador fora da irmandade'; end if;

  select last_attempt_at + interval '10 minutes'
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

  insert into public.pirate_guild_boss_cooldowns (guild_id, player_id, last_attempt_at)
  values (p_guild_id, v_player_id, now())
  on conflict (guild_id, player_id) do update
  set last_attempt_at = excluded.last_attempt_at;

  update public.pirate_guild_members
  set player_snapshot = coalesce(p_player_snapshot, player_snapshot),
      updated_at = now()
  where guild_id = p_guild_id and player_id = v_player_id;

  return jsonb_build_object(
    'ok', true,
    'boss_state', jsonb_build_object(
      'day_key', v_state.day_key,
      'current_boss_index', v_state.current_boss_index,
      'boss_hp', v_state.boss_hp,
      'boss_max_hp', v_state.boss_max_hp,
      'damage_by_player', v_state.damage_by_player,
      'cooldown_until', now() + interval '10 minutes'
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
begin
  if v_damage <= 0 then raise exception 'dano invalido'; end if;
  if p_boss_index < 0 or p_boss_index > 20 then raise exception 'boss invalido'; end if;

  select * into v_member
  from public.pirate_guild_members
  where guild_id = p_guild_id and player_id = v_player_id;
  if v_member.player_id is null then raise exception 'jogador fora da irmandade'; end if;

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
        updated_at = now()
    where guild_id = p_guild_id
    returning * into v_state;
  end if;

  if v_state.current_boss_index <> p_boss_index then raise exception 'boss desatualizado'; end if;

  v_new_hp := greatest(0, v_state.boss_hp - v_damage);
  v_defeated := v_new_hp <= 0;
  v_player_total := coalesce((v_state.damage_by_player ->> v_player_id)::numeric, 0) + v_damage;

  update public.pirate_guild_members
  set contribution = contribution + floor(v_damage),
      boss_damage = boss_damage + floor(v_damage),
      boss_participation_count = boss_participation_count + 1,
      player_snapshot = coalesce(p_player_snapshot, player_snapshot),
      updated_at = now()
  where guild_id = p_guild_id and player_id = v_player_id;

  if v_defeated then
    update public.pirate_guild_boss_state
    set current_boss_index = least(21, current_boss_index + 1),
        boss_hp = 0,
        boss_max_hp = 0,
        damage_by_player = jsonb_set(damage_by_player, array[v_player_id], to_jsonb(v_player_total), true),
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
      'damage_by_player', v_state.damage_by_player
    )
  );
end;
$$;

revoke all on function public.get_pirate_guild_home(text) from public;
revoke all on function public.upsert_pirate_guild_profile(text, text, jsonb) from public;
revoke all on function public.create_pirate_guild(text, text, jsonb, text, text, text) from public;
revoke all on function public.join_pirate_guild(text, text, jsonb, uuid) from public;
revoke all on function public.update_pirate_guild_config(text, uuid, text, text, text) from public;
revoke all on function public.set_pirate_guild_role(text, uuid, text, text) from public;
revoke all on function public.decide_pirate_guild_application(text, uuid, text, boolean) from public;
revoke all on function public.upgrade_pirate_guild_bonus(text, uuid, text, integer) from public;
revoke all on function public.start_pirate_guild_boss_attempt(text, uuid, integer, numeric, jsonb, jsonb) from public;
revoke all on function public.finish_pirate_guild_boss_attempt(text, uuid, integer, numeric, numeric, jsonb) from public;

grant execute on function public.get_pirate_guild_home(text) to anon, authenticated;
grant execute on function public.upsert_pirate_guild_profile(text, text, jsonb) to anon, authenticated;
grant execute on function public.create_pirate_guild(text, text, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.join_pirate_guild(text, text, jsonb, uuid) to anon, authenticated;
grant execute on function public.update_pirate_guild_config(text, uuid, text, text, text) to anon, authenticated;
grant execute on function public.set_pirate_guild_role(text, uuid, text, text) to anon, authenticated;
grant execute on function public.decide_pirate_guild_application(text, uuid, text, boolean) to anon, authenticated;
grant execute on function public.upgrade_pirate_guild_bonus(text, uuid, text, integer) to anon, authenticated;
grant execute on function public.start_pirate_guild_boss_attempt(text, uuid, integer, numeric, jsonb, jsonb) to anon, authenticated;
grant execute on function public.finish_pirate_guild_boss_attempt(text, uuid, integer, numeric, numeric, jsonb) to anon, authenticated;
