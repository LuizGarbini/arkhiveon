-- 0076 · Janelas na mesa (VTT).
--
-- Uma janela é um segmento de parede (vtt_walls) com kind = 'window' e o mesmo
-- estado da porta: is_open = false (fechada: bloqueia a visão) ou true (aberta:
-- deixa ver o que há do outro lado). Diferente da porta, a janela NUNCA deixa um
-- jogador passar, aberta ou fechada: isso é regra do cliente (a checagem de
-- movimento); o mestre move o token para o outro lado quando a janela permite.
--
-- O mestre desenha e apaga janelas como paredes (a policy de escrita da
-- tabela continua só dele). Quem abre e fecha é qualquer participante da
-- campanha, pela mesma função das portas, toggle_wall_door, que agora aceita
-- kind 'door' e 'window' (parede comum continua levando 22023).
--
-- Rollback:
--   (apague as janelas antes: delete from public.vtt_walls where kind = 'window';)
--   alter table public.vtt_walls drop constraint if exists vtt_walls_open_only_doors;
--   alter table public.vtt_walls drop constraint if exists vtt_walls_kind_check;
--   alter table public.vtt_walls add constraint vtt_walls_kind_check check (kind in ('wall', 'door'));
--   alter table public.vtt_walls add constraint vtt_walls_open_only_doors check (is_open = false or kind = 'door');
--   e recrie toggle_wall_door com a versão da 0073.

begin;

alter table public.vtt_walls
	drop constraint if exists vtt_walls_kind_check;
alter table public.vtt_walls
	add constraint vtt_walls_kind_check check (kind in ('wall', 'door', 'window'));

alter table public.vtt_walls
	drop constraint if exists vtt_walls_open_only_doors;
alter table public.vtt_walls
	add constraint vtt_walls_open_only_doors
	check (is_open = false or kind in ('door', 'window'));

create or replace function public.toggle_wall_door(
	p_wall_id uuid,
	p_open boolean
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_scene uuid;
	v_kind text;
	v_role text;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para abrir portas e janelas.'
			using errcode = '28000';
	end if;

	if p_wall_id is null or p_open is null then
		raise exception 'Porta ou janela inválida.'
			using errcode = '22023';
	end if;

	select w.scene_id, w.kind
	into v_scene, v_kind
	from public.vtt_walls w
	where w.id = p_wall_id
	for update;

	if not found then
		raise exception 'Porta ou janela não encontrada.'
			using errcode = 'P0002';
	end if;

	if v_kind is null or v_kind not in ('door', 'window') then
		raise exception 'Só portas e janelas podem ser abertas ou fechadas.'
			using errcode = '22023';
	end if;

	v_role := public.user_scene_campaign_role(v_scene);
	if v_role is null then
		raise exception 'Só membros da campanha podem abrir portas e janelas.'
			using errcode = '42501';
	end if;
	if v_role is distinct from 'owner' and v_role is distinct from 'editor' then
		if not exists (
			select 1 from public.vtt_scenes s
			where s.id = v_scene and s.is_active = true
		) then
			raise exception 'Esta cena não está em jogo.'
				using errcode = '42501';
		end if;
	end if;

	update public.vtt_walls
	set is_open = p_open
	where id = p_wall_id;

	return p_open;
end;
$$;

revoke all on function public.toggle_wall_door(uuid, boolean) from public, anon;
grant execute on function public.toggle_wall_door(uuid, boolean) to authenticated;

commit;
