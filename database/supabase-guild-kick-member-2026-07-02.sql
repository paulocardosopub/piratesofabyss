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

revoke all on function public.kick_pirate_guild_member(text, uuid, text) from public;
grant execute on function public.kick_pirate_guild_member(text, uuid, text) to anon, authenticated;
