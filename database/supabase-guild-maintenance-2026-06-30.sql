-- Remove somente as Irmandades de teste criadas pelo Codex nesta rodada.
delete from public.pirate_guilds
where id in (
  '3641102c-6786-4d0b-849c-b3e3a7de54de',
  'b0e69435-216c-474a-95c6-04aac54d5df8'
)
and name in ('App mr001m4or57qo', 'Open mr001m4or57qo')
and description in ('Codex full app test', 'Codex open test');

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
  if v_actor_role not in ('king', 'quartermaster') then
    raise exception 'Apenas Rei Pirata e Intendente podem distribuir EXP da Irmandade.';
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

grant execute on function public.upgrade_pirate_guild_bonus(text, uuid, text, integer) to anon, authenticated;
