create extension if not exists pgcrypto;

create table if not exists public.pirate_pvp_rooms (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'waiting' check (status in ('waiting', 'ready', 'fighting', 'finished', 'expired')),
  host_player_id text not null,
  host_pirate_name text not null,
  host_snapshot jsonb not null default '{}'::jsonb,
  host_ready boolean not null default false,
  guest_player_id text,
  guest_pirate_name text,
  guest_snapshot jsonb not null default '{}'::jsonb,
  guest_ready boolean not null default false,
  starts_at timestamptz,
  battle_state jsonb not null default '{}'::jsonb,
  winner_player_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pirate_pvp_rooms_status_idx
  on public.pirate_pvp_rooms (status, updated_at desc);

create index if not exists pirate_pvp_rooms_players_idx
  on public.pirate_pvp_rooms (host_player_id, guest_player_id, updated_at desc);

alter table public.pirate_pvp_rooms enable row level security;
revoke all on public.pirate_pvp_rooms from anon, authenticated;

create or replace function public.pirate_pvp_validate_player_id(p_player_id text)
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

create or replace function public.pirate_pvp_number(p_snapshot jsonb, p_path text[])
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_snapshot #>> p_path, '') ~ '^[0-9]+(\.[0-9]+)?$'
      then (p_snapshot #>> p_path)::numeric
    else 0
  end;
$$;

create or replace function public.pirate_pvp_snapshot_hp(p_snapshot jsonb)
returns numeric
language sql
immutable
as $$
  select least(
    1000000000000000::numeric,
    greatest(
      1,
      floor(greatest(
        public.pirate_pvp_number(p_snapshot, array['combat','max_hp']),
        public.pirate_pvp_number(p_snapshot, array['ship','max_hp']),
        public.pirate_pvp_number(p_snapshot, array['max_hp'])
      ) * 10)
    )
  );
$$;

create or replace function public.pirate_pvp_snapshot_current_hp(p_snapshot jsonb)
returns numeric
language sql
immutable
as $$
  select least(
    public.pirate_pvp_snapshot_hp(p_snapshot),
    greatest(
      1,
      floor(greatest(
        public.pirate_pvp_number(p_snapshot, array['combat','current_hp']),
        public.pirate_pvp_number(p_snapshot, array['ship','current_hp']),
        public.pirate_pvp_number(p_snapshot, array['current_hp']),
        public.pirate_pvp_snapshot_hp(p_snapshot) / 10
      ) * 10)
    )
  );
$$;

create or replace function public.pirate_pvp_snapshot_damage(p_snapshot jsonb)
returns numeric
language sql
immutable
as $$
  select least(
    1000000000000000::numeric,
    greatest(
      1,
      floor(greatest(
        public.pirate_pvp_number(p_snapshot, array['combat','damage']),
        public.pirate_pvp_number(p_snapshot, array['ship','damage']),
        public.pirate_pvp_number(p_snapshot, array['damage'])
      ))
    )
  );
$$;

create or replace function public.pirate_pvp_snapshot_pet_damage(p_snapshot jsonb)
returns numeric
language sql
immutable
as $$
  select least(
    1000000000000000::numeric,
    greatest(
      0,
      floor(greatest(
        public.pirate_pvp_number(p_snapshot, array['pet','damage']),
        public.pirate_pvp_number(p_snapshot, array['pet','dps'])
      ))
    )
  );
$$;

create or replace function public.pirate_pvp_build_battle_state(p_host_snapshot jsonb, p_guest_snapshot jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  v_host_max_hp numeric := public.pirate_pvp_snapshot_hp(p_host_snapshot);
  v_guest_max_hp numeric := public.pirate_pvp_snapshot_hp(p_guest_snapshot);
begin
  return jsonb_build_object(
    'host_hp', v_host_max_hp,
    'host_max_hp', v_host_max_hp,
    'guest_hp', v_guest_max_hp,
    'guest_max_hp', v_guest_max_hp,
    'host_damage_done', 0,
    'guest_damage_done', 0,
    'host_action_seq', 0,
    'guest_action_seq', 0,
    'updated_at', now()
  );
end;
$$;

create or replace function public.pirate_pvp_room_json(p_room public.pirate_pvp_rooms)
returns jsonb
language sql
stable
as $$
  select to_jsonb(p_room) || jsonb_build_object('server_now', now());
$$;

create or replace function public.pirate_pvp_cleanup()
returns void
language sql
security definer
set search_path = public
as $$
  update public.pirate_pvp_rooms
  set status = 'expired',
      updated_at = now()
  where status in ('waiting', 'ready')
    and updated_at < now() - interval '20 minutes';
$$;

create or replace function public.get_pirate_pvp_rooms(p_player_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_current jsonb;
begin
  perform public.pirate_pvp_cleanup();

  select public.pirate_pvp_room_json(r)
    into v_current
  from public.pirate_pvp_rooms r
  where r.status in ('waiting', 'ready', 'fighting')
    and (r.host_player_id = v_player_id or r.guest_player_id = v_player_id)
  order by r.updated_at desc
  limit 1;

  return jsonb_build_object(
    'current_room', v_current,
    'rooms',
    coalesce((
      select jsonb_agg(public.pirate_pvp_room_json(r) order by r.updated_at desc)
      from (
        select *
        from public.pirate_pvp_rooms
        where status = 'waiting'
          and guest_player_id is null
          and host_player_id <> v_player_id
          and updated_at > now() - interval '20 minutes'
        order by updated_at desc
        limit 40
      ) r
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_pirate_pvp_room(
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
  v_name text := left(trim(coalesce(p_pirate_name, 'Pirata')), 32);
  v_error text := public.pirate_pvp_validate_player_id(p_player_id);
  v_room public.pirate_pvp_rooms%rowtype;
  v_snapshot jsonb := case when jsonb_typeof(p_player_snapshot) = 'object' then p_player_snapshot else '{}'::jsonb end;
begin
  if v_error is not null then raise exception 'player_id invalido'; end if;
  if char_length(v_name) < 3 then raise exception 'nome invalido'; end if;

  perform public.pirate_pvp_cleanup();

  update public.pirate_pvp_rooms
  set status = 'expired',
      updated_at = now()
  where status in ('waiting', 'ready')
    and (host_player_id = v_player_id or guest_player_id = v_player_id);

  insert into public.pirate_pvp_rooms (host_player_id, host_pirate_name, host_snapshot)
  values (v_player_id, v_name, v_snapshot)
  returning * into v_room;

  return public.pirate_pvp_room_json(v_room);
end;
$$;

create or replace function public.join_pirate_pvp_room(
  p_room_id uuid,
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
  v_name text := left(trim(coalesce(p_pirate_name, 'Pirata')), 32);
  v_error text := public.pirate_pvp_validate_player_id(p_player_id);
  v_room public.pirate_pvp_rooms%rowtype;
  v_snapshot jsonb := case when jsonb_typeof(p_player_snapshot) = 'object' then p_player_snapshot else '{}'::jsonb end;
begin
  if v_error is not null then raise exception 'player_id invalido'; end if;
  if char_length(v_name) < 3 then raise exception 'nome invalido'; end if;

  perform public.pirate_pvp_cleanup();

  select * into v_room
  from public.pirate_pvp_rooms
  where id = p_room_id
  for update;

  if v_room.id is null then raise exception 'sala nao encontrada'; end if;
  if v_room.status <> 'waiting' then raise exception 'sala indisponivel'; end if;
  if v_room.host_player_id = v_player_id then raise exception 'voce ja e o anfitriao'; end if;
  if v_room.guest_player_id is not null then raise exception 'sala cheia'; end if;

  update public.pirate_pvp_rooms
  set status = 'expired',
      updated_at = now()
  where id <> p_room_id
    and status in ('waiting', 'ready')
    and (host_player_id = v_player_id or guest_player_id = v_player_id);

  update public.pirate_pvp_rooms
  set status = 'ready',
      guest_player_id = v_player_id,
      guest_pirate_name = v_name,
      guest_snapshot = v_snapshot,
      host_ready = false,
      guest_ready = false,
      updated_at = now()
  where id = p_room_id
  returning * into v_room;

  return public.pirate_pvp_room_json(v_room);
end;
$$;

create or replace function public.set_pirate_pvp_room_ready(
  p_room_id uuid,
  p_player_id text,
  p_pirate_name text,
  p_player_snapshot jsonb,
  p_ready boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_name text := left(trim(coalesce(p_pirate_name, 'Pirata')), 32);
  v_room public.pirate_pvp_rooms%rowtype;
  v_snapshot jsonb := case when jsonb_typeof(p_player_snapshot) = 'object' then p_player_snapshot else '{}'::jsonb end;
begin
  select * into v_room
  from public.pirate_pvp_rooms
  where id = p_room_id
  for update;

  if v_room.id is null then raise exception 'sala nao encontrada'; end if;
  if v_room.status not in ('waiting', 'ready') then raise exception 'sala ja iniciou'; end if;
  if v_room.guest_player_id is null then raise exception 'aguardando adversario'; end if;

  if v_room.host_player_id = v_player_id then
    update public.pirate_pvp_rooms
    set host_ready = coalesce(p_ready, false),
        host_pirate_name = v_name,
        host_snapshot = v_snapshot,
        status = 'ready',
        updated_at = now()
    where id = p_room_id
    returning * into v_room;
  elsif v_room.guest_player_id = v_player_id then
    update public.pirate_pvp_rooms
    set guest_ready = coalesce(p_ready, false),
        guest_pirate_name = v_name,
        guest_snapshot = v_snapshot,
        status = 'ready',
        updated_at = now()
    where id = p_room_id
    returning * into v_room;
  else
    raise exception 'jogador fora da sala';
  end if;

  if v_room.host_ready and v_room.guest_ready then
    update public.pirate_pvp_rooms
    set status = 'fighting',
        starts_at = now() + interval '10 seconds',
        battle_state = public.pirate_pvp_build_battle_state(host_snapshot, guest_snapshot),
        updated_at = now()
    where id = p_room_id
    returning * into v_room;
  end if;

  return public.pirate_pvp_room_json(v_room);
end;
$$;

create or replace function public.get_pirate_pvp_room(
  p_room_id uuid,
  p_player_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_room public.pirate_pvp_rooms%rowtype;
begin
  select * into v_room
  from public.pirate_pvp_rooms
  where id = p_room_id
    and (host_player_id = v_player_id or guest_player_id = v_player_id);

  if v_room.id is null then raise exception 'sala nao encontrada'; end if;
  return public.pirate_pvp_room_json(v_room);
end;
$$;

create or replace function public.attack_pirate_pvp_room(
  p_room_id uuid,
  p_player_id text,
  p_action_seq integer,
  p_damage numeric,
  p_player_snapshot jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_room public.pirate_pvp_rooms%rowtype;
  v_actor_side text;
  v_target_side text;
  v_seq_key text;
  v_target_hp_key text;
  v_damage_key text;
  v_current_seq integer;
  v_target_hp numeric;
  v_actor_snapshot jsonb;
  v_damage numeric;
  v_new_hp numeric;
  v_done numeric;
  v_state jsonb;
begin
  select * into v_room
  from public.pirate_pvp_rooms
  where id = p_room_id
  for update;

  if v_room.id is null then raise exception 'sala nao encontrada'; end if;
  if v_room.status <> 'fighting' then raise exception 'batalha nao ativa'; end if;
  if v_room.starts_at is not null and v_room.starts_at > now() then raise exception 'batalha ainda nao iniciou'; end if;

  if v_room.host_player_id = v_player_id then
    v_actor_side := 'host';
    v_target_side := 'guest';
    v_actor_snapshot := case when jsonb_typeof(p_player_snapshot) = 'object' then p_player_snapshot else v_room.host_snapshot end;
  elsif v_room.guest_player_id = v_player_id then
    v_actor_side := 'guest';
    v_target_side := 'host';
    v_actor_snapshot := case when jsonb_typeof(p_player_snapshot) = 'object' then p_player_snapshot else v_room.guest_snapshot end;
  else
    raise exception 'jogador fora da sala';
  end if;

  v_state := coalesce(v_room.battle_state, '{}'::jsonb);
  v_seq_key := v_actor_side || '_action_seq';
  v_target_hp_key := v_target_side || '_hp';
  v_damage_key := v_actor_side || '_damage_done';
  v_current_seq := coalesce((v_state ->> v_seq_key)::integer, 0);
  if coalesce(p_action_seq, 0) <= v_current_seq then
    return public.pirate_pvp_room_json(v_room);
  end if;

  v_target_hp := greatest(0, coalesce((v_state ->> v_target_hp_key)::numeric, 0));
  v_damage := least(
    greatest(
      1,
      public.pirate_pvp_snapshot_damage(v_actor_snapshot) * 2.5,
      public.pirate_pvp_snapshot_pet_damage(v_actor_snapshot) * 2.5
    ),
    greatest(1, floor(coalesce(p_damage, 1)))
  );
  v_new_hp := greatest(0, v_target_hp - v_damage);
  v_done := coalesce((v_state ->> v_damage_key)::numeric, 0) + v_damage;

  v_state := jsonb_set(v_state, array[v_target_hp_key], to_jsonb(v_new_hp), true);
  v_state := jsonb_set(v_state, array[v_seq_key], to_jsonb(coalesce(p_action_seq, v_current_seq + 1)), true);
  v_state := jsonb_set(v_state, array[v_damage_key], to_jsonb(v_done), true);
  v_state := jsonb_set(v_state, array['updated_at'], to_jsonb(now()), true);

  if v_actor_side = 'host' then
    update public.pirate_pvp_rooms
    set host_snapshot = v_actor_snapshot,
        battle_state = v_state,
        status = case when v_new_hp <= 0 then 'finished' else status end,
        winner_player_id = case when v_new_hp <= 0 then v_player_id else winner_player_id end,
        updated_at = now()
    where id = p_room_id
    returning * into v_room;
  else
    update public.pirate_pvp_rooms
    set guest_snapshot = v_actor_snapshot,
        battle_state = v_state,
        status = case when v_new_hp <= 0 then 'finished' else status end,
        winner_player_id = case when v_new_hp <= 0 then v_player_id else winner_player_id end,
        updated_at = now()
    where id = p_room_id
    returning * into v_room;
  end if;

  return public.pirate_pvp_room_json(v_room);
end;
$$;

create or replace function public.leave_pirate_pvp_room(
  p_room_id uuid,
  p_player_id text,
  p_surrender boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id text := trim(coalesce(p_player_id, ''));
  v_room public.pirate_pvp_rooms%rowtype;
  v_winner text;
begin
  select * into v_room
  from public.pirate_pvp_rooms
  where id = p_room_id
  for update;

  if v_room.id is null then raise exception 'sala nao encontrada'; end if;
  if v_room.host_player_id <> v_player_id and v_room.guest_player_id <> v_player_id then raise exception 'jogador fora da sala'; end if;

  if v_room.status in ('waiting', 'ready') then
    if v_room.host_player_id = v_player_id then
      update public.pirate_pvp_rooms
      set status = 'expired',
          updated_at = now()
      where id = p_room_id
      returning * into v_room;
    else
      update public.pirate_pvp_rooms
      set status = 'waiting',
          guest_player_id = null,
          guest_pirate_name = null,
          guest_snapshot = '{}'::jsonb,
          host_ready = false,
          guest_ready = false,
          updated_at = now()
      where id = p_room_id
      returning * into v_room;
    end if;
  elsif v_room.status = 'fighting' and coalesce(p_surrender, false) then
    v_winner := case when v_room.host_player_id = v_player_id then v_room.guest_player_id else v_room.host_player_id end;
    update public.pirate_pvp_rooms
    set status = 'finished',
        winner_player_id = v_winner,
        updated_at = now()
    where id = p_room_id
    returning * into v_room;
  end if;

  return public.pirate_pvp_room_json(v_room);
end;
$$;

revoke all on function public.pirate_pvp_validate_player_id(text) from public;
revoke all on function public.pirate_pvp_number(jsonb, text[]) from public;
revoke all on function public.pirate_pvp_snapshot_hp(jsonb) from public;
revoke all on function public.pirate_pvp_snapshot_current_hp(jsonb) from public;
revoke all on function public.pirate_pvp_snapshot_damage(jsonb) from public;
revoke all on function public.pirate_pvp_snapshot_pet_damage(jsonb) from public;
revoke all on function public.pirate_pvp_build_battle_state(jsonb, jsonb) from public;
revoke all on function public.pirate_pvp_room_json(public.pirate_pvp_rooms) from public;
revoke all on function public.pirate_pvp_cleanup() from public;
revoke all on function public.get_pirate_pvp_rooms(text) from public;
revoke all on function public.create_pirate_pvp_room(text, text, jsonb) from public;
revoke all on function public.join_pirate_pvp_room(uuid, text, text, jsonb) from public;
revoke all on function public.set_pirate_pvp_room_ready(uuid, text, text, jsonb, boolean) from public;
revoke all on function public.get_pirate_pvp_room(uuid, text) from public;
revoke all on function public.attack_pirate_pvp_room(uuid, text, integer, numeric, jsonb) from public;
revoke all on function public.leave_pirate_pvp_room(uuid, text, boolean) from public;

grant execute on function public.get_pirate_pvp_rooms(text) to anon, authenticated;
grant execute on function public.create_pirate_pvp_room(text, text, jsonb) to anon, authenticated;
grant execute on function public.join_pirate_pvp_room(uuid, text, text, jsonb) to anon, authenticated;
grant execute on function public.set_pirate_pvp_room_ready(uuid, text, text, jsonb, boolean) to anon, authenticated;
grant execute on function public.get_pirate_pvp_room(uuid, text) to anon, authenticated;
grant execute on function public.attack_pirate_pvp_room(uuid, text, integer, numeric, jsonb) to anon, authenticated;
grant execute on function public.leave_pirate_pvp_room(uuid, text, boolean) to anon, authenticated;
