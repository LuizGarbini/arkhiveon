-- 0073 · Portas na mesa (VTT).
--
-- Uma porta é um segmento de parede (vtt_walls) com kind = 'door' e um estado:
-- is_open = false (fechada, bloqueia a visão e o movimento, como parede) ou
-- true (aberta, deixa ver e passar). O mestre desenha e apaga portas como
-- paredes (a policy de INSERT/UPDATE/DELETE continua só dele). Quem abre e
-- fecha é qualquer participante da campanha, pela função toggle_wall_door:
-- jogador não ganha escrita na tabela, só neste campo, só em porta.
--
-- toggle_wall_door(p_wall_id, p_open):
--   · só portas (kind = 'door'); parede comum leva exception (22023).
--   · mestre/co-mestre (owner/editor) em qualquer cena; jogador (viewer) só na
--     cena ativa (a mesma regra de leitura das cenas); não membro: 42501.
--   · auth.uid() nulo: 28000. p_open nulo: 22023. Porta inexistente: P0002.
--   · o UPDATE sai no Realtime de vtt_walls (0065), então os outros clientes
--     recarregam as paredes e veem a porta abrir.
--
-- is_open só existe em porta (constraint), e kind passa a aceitar 'wall'/'door'.
--
-- Rollback:
--   drop function if exists public.toggle_wall_door(uuid, boolean);
--   alter table public.vtt_walls drop constraint if exists vtt_walls_open_only_doors;
--   alter table public.vtt_walls drop constraint if exists vtt_walls_kind_check;
--   (apague as portas antes: delete from public.vtt_walls where kind = 'door';)
--   alter table public.vtt_walls add constraint vtt_walls_kind_check check (kind in ('wall'));
--   alter table public.vtt_walls drop column if exists is_open;

begin;

alter table public.vtt_walls
	add column if not exists is_open boolean not null default false;

-- Troca o check do kind (a 0046 aceitava só 'wall'), seja qual for o nome dele.
do $$
declare
	c text;
begin
	for c in
		select conname
		from pg_constraint
		where conrelid = 'public.vtt_walls'::regclass
			and contype = 'c'
			and pg_get_constraintdef(oid) like '%kind%'
	loop
		execute format('alter table public.vtt_walls drop constraint %I', c);
	end loop;
end;
$$;

alter table public.vtt_walls
	add constraint vtt_walls_kind_check check (kind in ('wall', 'door'));

alter table public.vtt_walls
	drop constraint if exists vtt_walls_open_only_doors;
alter table public.vtt_walls
	add constraint vtt_walls_open_only_doors check (is_open = false or kind = 'door');

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
		raise exception 'Entre na sua conta para abrir portas.'
			using errcode = '28000';
	end if;

	if p_wall_id is null or p_open is null then
		raise exception 'Porta inválida.'
			using errcode = '22023';
	end if;

	select w.scene_id, w.kind
	into v_scene, v_kind
	from public.vtt_walls w
	where w.id = p_wall_id
	for update;

	if not found then
		raise exception 'Porta não encontrada.'
			using errcode = 'P0002';
	end if;

	if v_kind is distinct from 'door' then
		raise exception 'Só portas podem ser abertas ou fechadas.'
			using errcode = '22023';
	end if;

	v_role := public.user_scene_campaign_role(v_scene);
	if v_role is null then
		raise exception 'Só membros da campanha podem abrir portas.'
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
