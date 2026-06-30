create extension if not exists pgcrypto;

create table if not exists public.pirate_accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null check (char_length(trim(username)) between 3 and 24),
  username_key text not null unique check (char_length(trim(username_key)) between 3 and 24),
  email text not null default '' check (char_length(email) <= 120),
  password_salt text not null,
  password_hash text not null,
  password_iterations integer not null default 150000 check (password_iterations >= 100000),
  save_data jsonb,
  save_updated_at timestamptz,
  session_token text,
  session_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pirate_account_save_backups (
  id bigserial primary key,
  account_id uuid not null references public.pirate_accounts(id) on delete cascade,
  save_data jsonb not null,
  reason text not null default 'server-backup',
  created_at timestamptz not null default now()
);

alter table public.pirate_accounts enable row level security;
alter table public.pirate_account_save_backups enable row level security;

revoke all on public.pirate_accounts from anon, authenticated;
revoke all on public.pirate_account_save_backups from anon, authenticated;

create or replace function public.pirate_account_json_number(p_save jsonb, p_path text[])
returns numeric
language sql
immutable
as $$
  select case
    when coalesce(p_save #>> p_path, '') ~ '^-?[0-9]+(\.[0-9]+)?$'
      then (p_save #>> p_path)::numeric
    else 0
  end;
$$;

create or replace function public.pirate_account_save_score(p_save jsonb)
returns numeric
language sql
immutable
as $$
  select case
    when p_save is null then 0
    else
      greatest(0, public.pirate_account_json_number(p_save, array['pirateLevel']) - 1) * 6
      + greatest(0, public.pirate_account_json_number(p_save, array['regionIndex'])) * 5
      + greatest(0, public.pirate_account_json_number(p_save, array['unlockedRegions']) - 1) * 4
      + least(20, greatest(0, public.pirate_account_json_number(p_save, array['xp'])) / 100)
      + least(20, greatest(0, public.pirate_account_json_number(p_save, array['resources','ouro'])) / 1000)
      + greatest(0, public.pirate_account_json_number(p_save, array['pirateCoins'])) * 2
      + greatest(0, public.pirate_account_json_number(p_save, array['prestiges'])) * 20
      + greatest(0, coalesce(jsonb_array_length(case when jsonb_typeof(p_save -> 'ownedShips') = 'array' then p_save -> 'ownedShips' else '[0]'::jsonb end), 1) - 1) * 4
      + greatest(0, coalesce(jsonb_array_length(case when jsonb_typeof(p_save -> 'ownedPets') = 'array' then p_save -> 'ownedPets' else '[]'::jsonb end), 0)) * 3
      + least(30, greatest(0, public.pirate_account_json_number(p_save, array['lifetime','enemies'])) / 10)
      + least(20, greatest(0, public.pirate_account_json_number(p_save, array['lifetime','bosses'])) * 4)
      + case when coalesce(p_save ->> 'hasStarted', 'false') = 'true' then 8 else 0 end
      + case when coalesce(p_save ->> 'captainSelectedGender', '') <> '' then 3 else 0 end
  end;
$$;

create or replace function public.pirate_account_payload(p_account public.pirate_accounts, p_session_token text default null)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'account', jsonb_build_object(
      'id', p_account.id,
      'username', p_account.username,
      'username_key', p_account.username_key,
      'email', p_account.email,
      'save_updated_at', p_account.save_updated_at
    ),
    'session_token', p_session_token,
    'session_expires_at', p_account.session_expires_at,
    'save_data', p_account.save_data
  );
$$;

create or replace function public.get_pirate_account_challenge(p_username_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := lower(trim(coalesce(p_username_key, '')));
  v_account public.pirate_accounts%rowtype;
begin
  select * into v_account
  from public.pirate_accounts
  where username_key = v_key;

  if v_account.id is null then
    raise exception 'Conta nao encontrada.';
  end if;

  return jsonb_build_object(
    'id', v_account.id,
    'username', v_account.username,
    'username_key', v_account.username_key,
    'password_salt', v_account.password_salt,
    'password_iterations', v_account.password_iterations
  );
end;
$$;

create or replace function public.create_pirate_account(
  p_username text,
  p_username_key text,
  p_email text,
  p_password_salt text,
  p_password_hash text,
  p_password_iterations integer default 150000,
  p_save_data jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := trim(coalesce(p_username, ''));
  v_key text := lower(trim(coalesce(p_username_key, '')));
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_account public.pirate_accounts%rowtype;
begin
  if char_length(v_username) < 3 or char_length(v_username) > 24 then raise exception 'Informe um usuario com pelo menos 3 caracteres.'; end if;
  if char_length(v_key) < 3 or char_length(v_key) > 24 then raise exception 'Usuario invalido.'; end if;
  if coalesce(p_password_salt, '') = '' or coalesce(p_password_hash, '') = '' then raise exception 'Senha invalida.'; end if;

  insert into public.pirate_accounts (
    username,
    username_key,
    email,
    password_salt,
    password_hash,
    password_iterations,
    save_data,
    save_updated_at,
    session_token,
    session_expires_at
  )
  values (
    v_username,
    v_key,
    left(trim(coalesce(p_email, '')), 120),
    p_password_salt,
    p_password_hash,
    greatest(100000, coalesce(p_password_iterations, 150000)),
    p_save_data,
    case when p_save_data is null then null else now() end,
    v_token,
    now() + interval '90 days'
  )
  returning * into v_account;

  return public.pirate_account_payload(v_account, v_token);
exception
  when unique_violation then
    raise exception 'Esse usuario ja existe.';
end;
$$;

create or replace function public.login_pirate_account(
  p_username_key text,
  p_password_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key text := lower(trim(coalesce(p_username_key, '')));
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_account public.pirate_accounts%rowtype;
begin
  select * into v_account
  from public.pirate_accounts
  where username_key = v_key
  for update;

  if v_account.id is null then raise exception 'Conta nao encontrada.'; end if;
  if v_account.password_hash <> coalesce(p_password_hash, '') then raise exception 'Senha incorreta.'; end if;

  update public.pirate_accounts
  set session_token = v_token,
      session_expires_at = now() + interval '90 days',
      updated_at = now()
  where id = v_account.id
  returning * into v_account;

  return public.pirate_account_payload(v_account, v_token);
end;
$$;

create or replace function public.get_pirate_account_session(
  p_account_id uuid,
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.pirate_accounts%rowtype;
begin
  select * into v_account
  from public.pirate_accounts
  where id = p_account_id
    and session_token = p_session_token
    and session_expires_at > now();

  if v_account.id is null then raise exception 'Sessao expirada. Entre novamente.'; end if;

  return public.pirate_account_payload(v_account, p_session_token);
end;
$$;

create or replace function public.save_pirate_account_game(
  p_account_id uuid,
  p_session_token text,
  p_save_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.pirate_accounts%rowtype;
  v_existing_score numeric;
  v_incoming_score numeric;
begin
  if p_save_data is null then raise exception 'Save invalido.'; end if;

  select * into v_account
  from public.pirate_accounts
  where id = p_account_id
    and session_token = p_session_token
    and session_expires_at > now()
  for update;

  if v_account.id is null then raise exception 'Sessao expirada. Entre novamente.'; end if;

  v_existing_score := public.pirate_account_save_score(v_account.save_data);
  v_incoming_score := public.pirate_account_save_score(p_save_data);

  if v_existing_score >= 8 and (v_incoming_score <= 3 or (v_existing_score >= 20 and v_incoming_score < v_existing_score * 0.55)) then
    insert into public.pirate_account_save_backups (account_id, save_data, reason)
    values (v_account.id, p_save_data, 'blocked-empty-overwrite');
    return jsonb_build_object(
      'ok', true,
      'kept_existing', true,
      'save_data', v_account.save_data,
      'save_updated_at', v_account.save_updated_at
    );
  end if;

  if v_existing_score >= 4 and v_account.save_data is not null and v_account.save_data <> p_save_data then
    insert into public.pirate_account_save_backups (account_id, save_data, reason)
    values (v_account.id, v_account.save_data, 'before-save-replace');
  end if;

  update public.pirate_accounts
  set save_data = p_save_data,
      save_updated_at = now(),
      updated_at = now()
  where id = v_account.id
  returning * into v_account;

  return jsonb_build_object(
    'ok', true,
    'kept_existing', false,
    'save_data', v_account.save_data,
    'save_updated_at', v_account.save_updated_at
  );
end;
$$;

create or replace function public.update_pirate_account_email(
  p_account_id uuid,
  p_session_token text,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := left(trim(coalesce(p_email, '')), 120);
  v_account public.pirate_accounts%rowtype;
begin
  if v_email = '' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Informe um email valido.';
  end if;

  update public.pirate_accounts
  set email = v_email,
      updated_at = now()
  where id = p_account_id
    and session_token = p_session_token
    and session_expires_at > now()
  returning * into v_account;

  if v_account.id is null then raise exception 'Sessao expirada. Entre novamente.'; end if;

  return jsonb_build_object('ok', true, 'email', v_account.email);
end;
$$;

create or replace function public.clear_pirate_account_save(
  p_account_id uuid,
  p_session_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account public.pirate_accounts%rowtype;
begin
  select * into v_account
  from public.pirate_accounts
  where id = p_account_id
    and session_token = p_session_token
    and session_expires_at > now()
  for update;

  if v_account.id is null then raise exception 'Sessao expirada. Entre novamente.'; end if;

  if v_account.save_data is not null and public.pirate_account_save_score(v_account.save_data) >= 4 then
    insert into public.pirate_account_save_backups (account_id, save_data, reason)
    values (v_account.id, v_account.save_data, 'manual-clear');
  end if;

  update public.pirate_accounts
  set save_data = null,
      save_updated_at = null,
      updated_at = now()
  where id = v_account.id
  returning * into v_account;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.pirate_account_json_number(jsonb, text[]) from public;
revoke all on function public.pirate_account_save_score(jsonb) from public;
revoke all on function public.pirate_account_payload(public.pirate_accounts, text) from public;
revoke all on function public.get_pirate_account_challenge(text) from public;
revoke all on function public.create_pirate_account(text, text, text, text, text, integer, jsonb) from public;
revoke all on function public.login_pirate_account(text, text) from public;
revoke all on function public.get_pirate_account_session(uuid, text) from public;
revoke all on function public.save_pirate_account_game(uuid, text, jsonb) from public;
revoke all on function public.update_pirate_account_email(uuid, text, text) from public;
revoke all on function public.clear_pirate_account_save(uuid, text) from public;

grant execute on function public.get_pirate_account_challenge(text) to anon, authenticated;
grant execute on function public.create_pirate_account(text, text, text, text, text, integer, jsonb) to anon, authenticated;
grant execute on function public.login_pirate_account(text, text) to anon, authenticated;
grant execute on function public.get_pirate_account_session(uuid, text) to anon, authenticated;
grant execute on function public.save_pirate_account_game(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.update_pirate_account_email(uuid, text, text) to anon, authenticated;
grant execute on function public.clear_pirate_account_save(uuid, text) to anon, authenticated;
