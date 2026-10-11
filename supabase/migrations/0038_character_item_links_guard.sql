-- Migration 0038: quem pode vincular itens da campanha na ficha (opção T)
--
-- Aplicar manualmente no SQL Editor do Supabase (Luiz). Idempotente.
-- NÃO altera nem remove policies existentes: só adiciona 2 funções + 1 trigger.
--
-- O vínculo mora em characters.data->'inventoryList' (entradas com
-- "campaignItemId"). A policy de UPDATE de characters deixa qualquer
-- owner/editor salvar qualquer ficha da campanha; este trigger fecha só a parte
-- dos vínculos:
--   * Se as entradas vinculadas mudaram (campaignItemId, location, proficient,
--     isAttuned — incluindo vincular e desvincular), quem salva precisa ser
--     o mestre (owner) da campanha OU quem criou a ficha (created_by antigo).
--   * Cada campaignItemId novo precisa existir em items, no mesmo mundo da
--     campanha; item master_secret só o mestre vincula.
--   * auth.uid() nulo (service role / Edge Functions) passa.
--   * O resto da ficha (PV, notas, itens sem vínculo, quantidade) segue a
--     regra de hoje — o trigger não olha.
--
-- Rollback:
--   drop trigger if exists characters_guard_item_links on public.characters;
--   drop function if exists public.guard_character_item_links();
--   drop function if exists public.character_item_links(jsonb);

begin;

-- Retrato comparável dos vínculos de uma ficha (ordenado por id da entrada).
create or replace function public.character_item_links(p_data jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $$
	select coalesce(
		jsonb_agg(
			jsonb_build_object(
				'id', e->'id',
				'campaignItemId', e->'campaignItemId',
				'location', e->'location',
				'proficient', e->'proficient',
				'isAttuned', e->'isAttuned'
			)
			order by e->>'id', e->>'campaignItemId'
		),
		'[]'::jsonb
	)
	from jsonb_array_elements(
		case
			when jsonb_typeof(p_data->'inventoryList') = 'array'
				then p_data->'inventoryList'
			else '[]'::jsonb
		end
	) as e
	where jsonb_typeof(e) = 'object'
		and coalesce(e->>'campaignItemId', '') <> '';
$$;

create or replace function public.guard_character_item_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_old jsonb := '[]'::jsonb;
	v_new jsonb;
	v_role text;
	v_creator uuid;
	v_world uuid;
	v_item_id text;
begin
	if v_uid is null then
		return new;
	end if;

	if tg_op = 'UPDATE' then
		v_old := public.character_item_links(old.data);
	end if;
	v_new := public.character_item_links(new.data);

	if v_old = v_new then
		return new;
	end if;

	v_role := public.user_campaign_role(new.campaign_id);
	-- Dono da ficha = created_by ANTES do update (não dá para "assumir" a ficha
	-- e vincular no mesmo salvamento).
	v_creator := case when tg_op = 'UPDATE' then old.created_by else new.created_by end;

	if not (v_role = 'owner' or v_creator = v_uid) then
		raise exception 'Só o mestre ou quem criou a ficha pode vincular itens da campanha.'
			using errcode = '42501';
	end if;

	select c.world_id into v_world from public.campaigns c where c.id = new.campaign_id;

	for v_item_id in
		select distinct n->>'campaignItemId'
		from jsonb_array_elements(v_new) n
		where not exists (
			select 1 from jsonb_array_elements(v_old) o
			where o->>'campaignItemId' = n->>'campaignItemId'
		)
	loop
		if not exists (
			select 1
			from public.items i
			where i.id::text = v_item_id
				and i.world_id = v_world
				and (v_role = 'owner' or i.visibility <> 'master_secret')
		) then
			raise exception 'Item % não pertence ao mundo desta campanha.', v_item_id
				using errcode = '42501';
		end if;
	end loop;

	return new;
end;
$$;

revoke all on function public.guard_character_item_links() from public;

drop trigger if exists characters_guard_item_links on public.characters;
create trigger characters_guard_item_links
	before insert or update on public.characters
	for each row execute function public.guard_character_item_links();

commit;
