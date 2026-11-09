-- =============================================================================
-- Migration 0063: consumo de munição — RPC, ledger, trigger anti-LWW, resume
-- =============================================================================
-- Fatia F2. NÃO aplicada em produção nesta entrega: o Chefe aplica depois de
-- revisar o arquivo + SHA256. Não grava quantity de munição por save legado.
--
-- search_path: barra obrigatória do projeto é `SET search_path = public`
-- (mesmo padrão de 0050/0052/0056). O Chefe sugeriu string vazia; não deixamos
-- implícito. Objetos são qualificados com public. / auth. A divergência fica
-- documentada aqui: public é o search_path pinado, não um path aberto.
--
-- Bypass do trigger NÃO usa GUC/set_config (spoofável). A RPC DEFINER insere
-- uma linha em public._ammo_qty_write_gate na mesma transação; authenticated
-- não tem GRANT nessa tabela. Prova nos testes locais.
--
-- Limite D1 (explícito, sem afrouxar autorização): o trigger só preserva
-- quantity de entradas com o MESMO id que continuam na lista e cujo catálogo
-- (items + world_id da campanha + tipo munição) identifica ammo. Remover a
-- entrada e reinserir com outro id, ou mudar a categoria do item no catálogo,
-- permite reestocar. Consumo NÃO é infalsificável se um editor puder reestocar
-- por set_ammo_quantity, remoção/reinserção ou troca de categoria.
--
-- roll_dice (0052) NÃO é redefinida. complete_ammo_consumption_roll chama o
-- contrato atual (6 args) e grava o JSON no ledger. Fórmulas mescladas que
-- não cabem em XdY+Z falham no resume (22023), não no débito. F4 não deve
-- chamar roll_dice direto para este disparo — o resume é por consumption_id.
--
-- Quem consome: membership owner/editor, ou dono da ficha (user_id/created_by),
-- igual ao espírito de 0050 (gastar) + 0056 (vínculo). set_ammo_quantity
-- (reestocar) só owner/editor. Authz ANTES de replay/leitura do ledger.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catálogo: tipo munição (espelha itemCategoryKind, sem acento)
-- -----------------------------------------------------------------------------

create or replace function public._ammo_norm_type(p_type text)
returns text
language sql
immutable
set search_path = public
as $$
	select lower(btrim(translate(
		coalesce(p_type, ''),
		'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
		'AAAAAAAAAAEEEEEEEEIIIIIIIIOOOOOOOOOOUUUUUUUUCCNN'
	)));
$$;

create or replace function public._ammo_type_is_ammo(p_type text)
returns boolean
language sql
immutable
set search_path = public
as $$
	select public._ammo_norm_type(p_type) in ('municao', 'ammo')
		or public._ammo_norm_type(p_type) like 'municao %'
		or public._ammo_norm_type(p_type) like 'ammo %';
$$;

-- Origem da munição: linha de public.items no mesmo mundo da campanha.
-- Não confia em role/campaign/type mandados pelo cliente na ficha.
create or replace function public._ammo_catalog_item(p_item_id text, p_campaign_id uuid)
returns table(
	id uuid,
	item_type text,
	name text,
	data jsonb,
	world_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
	if p_item_id is null or btrim(p_item_id) = '' or p_campaign_id is null then
		return;
	end if;
	return query
	select i.id, i.item_type, i.name, i.data, i.world_id
	from public.items i
	inner join public.campaigns c on c.id = p_campaign_id
	where i.id::text = btrim(p_item_id)
		and i.world_id is not distinct from c.world_id;
end;
$$;

create or replace function public._ammo_catalog_is_ammo(p_item_id text, p_campaign_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_type text;
	v_data jsonb;
begin
	select coalesce(nullif(btrim(i.data->>'type'), ''), i.item_type), i.data
	into v_type, v_data
	from public._ammo_catalog_item(p_item_id, p_campaign_id) i
	limit 1;
	if v_type is null then
		return false;
	end if;
	return public._ammo_type_is_ammo(v_type);
end;
$$;

create or replace function public._ammo_conditions_text(p_ammo jsonb)
returns text
language sql
immutable
set search_path = public
as $$
	select coalesce(
		nullif(btrim(string_agg(
			trim(both from concat_ws(
				' — ',
				nullif(btrim(c->>'name'), ''),
				nullif(btrim(c->>'notes'), '')
			)),
			'; ' order by c->>'id'
		)), ''),
		''
	)
	from jsonb_array_elements(
		case
			when jsonb_typeof(p_ammo->'conditions') = 'array' then p_ammo->'conditions'
			else '[]'::jsonb
		end
	) as c
	where jsonb_typeof(c) = 'object';
$$;

create or replace function public._ammo_entry_quantity(p_entry jsonb)
returns int
language plpgsql
immutable
set search_path = public
as $$
declare
	v_num numeric;
begin
	if p_entry is null or jsonb_typeof(p_entry->'quantity') is distinct from 'number' then
		raise exception 'Quantidade de munição inválida.'
			using errcode = '22023';
	end if;
	v_num := (p_entry->>'quantity')::numeric;
	if v_num <> trunc(v_num) or v_num < 0 or v_num > 9999 then
		raise exception 'Quantidade de munição inválida.'
			using errcode = '22023';
	end if;
	return trunc(v_num)::int;
end;
$$;

create or replace function public._ammo_replace_entry_quantity(
	p_data jsonb,
	p_entry_id text,
	p_quantity int
)
returns jsonb
language sql
immutable
set search_path = public
as $$
	select jsonb_set(
		coalesce(p_data, '{}'::jsonb),
		'{inventoryList}',
		(
			select coalesce(jsonb_agg(
				case
					when e->>'id' is not distinct from p_entry_id
						then e || jsonb_build_object('quantity', p_quantity)
					else e
				end
				order by ord
			), '[]'::jsonb)
			from jsonb_array_elements(
				case
					when jsonb_typeof(p_data->'inventoryList') = 'array'
						then p_data->'inventoryList'
					else '[]'::jsonb
				end
			) with ordinality as t(e, ord)
		),
		true
	);
$$;

-- -----------------------------------------------------------------------------
-- Authz da ficha (antes de qualquer replay/leitura do ledger)
-- -----------------------------------------------------------------------------

create or replace function public._ammo_assert_logged_in()
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para usar munição.'
			using errcode = '42501';
	end if;
	return v_uid;
end;
$$;

-- p_restock: true = só owner/editor (set_ammo_quantity).
-- false = owner/editor ou dono da ficha (consumo / leitura / resume).
create or replace function public._ammo_assert_sheet_access(
	p_uid uuid,
	p_user_id uuid,
	p_created_by uuid,
	p_campaign_id uuid,
	p_restock boolean
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_role text;
begin
	if p_uid is null then
		raise exception 'Entre na sua conta para usar munição.'
			using errcode = '42501';
	end if;
	if p_campaign_id is null then
		raise exception 'Você não pode alterar a munição desta ficha.'
			using errcode = '42501';
	end if;
	v_role := public.user_campaign_role(p_campaign_id);
	if v_role in ('owner', 'editor') then
		return v_role;
	end if;
	if coalesce(p_restock, false) then
		raise exception 'Você não pode alterar a munição desta ficha.'
			using errcode = '42501';
	end if;
	if p_user_id is not distinct from p_uid or p_created_by is not distinct from p_uid then
		return 'sheet_owner';
	end if;
	raise exception 'Você não pode alterar a munição desta ficha.'
		using errcode = '42501';
end;
$$;

create or replace function public._ammo_lock_character(p_character_id uuid, p_campaign_id uuid)
returns table(
	id uuid,
	user_id uuid,
	created_by uuid,
	campaign_id uuid,
	data jsonb
)
language plpgsql
security definer
set search_path = public
as $$
begin
	if p_character_id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;
	return query
	select c.id, c.user_id, c.created_by, c.campaign_id, c.data
	from public.characters c
	where c.id = p_character_id
	for update;
end;
$$;

-- -----------------------------------------------------------------------------
-- Ledger + gate de escrita de quantity
-- -----------------------------------------------------------------------------

create table if not exists public._ammo_qty_write_gate (
	character_id uuid primary key
);

alter table public._ammo_qty_write_gate enable row level security;
revoke all on table public._ammo_qty_write_gate from public, anon, authenticated;

create table if not exists public.ammo_consumptions (
	consumption_id uuid primary key,
	user_id uuid not null,
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	character_id uuid not null references public.characters(id) on delete cascade,
	inventory_entry_id text not null,
	snapshot jsonb not null,
	roll jsonb,
	created_at timestamptz not null default now(),
	constraint ammo_consumptions_entry_id_check
		check (char_length(btrim(inventory_entry_id)) between 1 and 128),
	constraint ammo_consumptions_snapshot_object
		check (jsonb_typeof(snapshot) = 'object')
);

create index if not exists ammo_consumptions_character_created_idx
	on public.ammo_consumptions (character_id, created_at desc);
create index if not exists ammo_consumptions_campaign_idx
	on public.ammo_consumptions (campaign_id);

comment on table public.ammo_consumptions is
	'Ledger imutável de consumo de munição. consumption_id é o UUID do cliente/servidor para replay. roll preenche uma vez no resume. Sem escrita direta para anon/authenticated.';

alter table public.ammo_consumptions enable row level security;
revoke all on table public.ammo_consumptions from public, anon, authenticated;
grant select on table public.ammo_consumptions to authenticated;

drop policy if exists "ammo_consumptions_select_sheet_staff" on public.ammo_consumptions;
create policy "ammo_consumptions_select_sheet_staff"
	on public.ammo_consumptions
	for select
	to authenticated
	using (
		exists (
			select 1
			from public.characters c
			where c.id = ammo_consumptions.character_id
				and (
					c.user_id = auth.uid()
					or c.created_by = auth.uid()
				)
		)
		or public.user_campaign_role(ammo_consumptions.campaign_id) in ('owner', 'editor')
	);

-- Nenhuma policy INSERT/UPDATE/DELETE para anon ou authenticated: negação.
-- Sem USING (true).

create or replace function public._ammo_consumptions_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if old.consumption_id is distinct from new.consumption_id
		or old.user_id is distinct from new.user_id
		or old.campaign_id is distinct from new.campaign_id
		or old.character_id is distinct from new.character_id
		or old.inventory_entry_id is distinct from new.inventory_entry_id
		or old.snapshot is distinct from new.snapshot
		or old.created_at is distinct from new.created_at
	then
		raise exception 'O registro de consumo de munição é imutável.'
			using errcode = '42501';
	end if;
	if old.roll is not null and new.roll is distinct from old.roll then
		raise exception 'A rolagem deste consumo já foi registrada.'
			using errcode = '42501';
	end if;
	if old.roll is null and new.roll is not null
		and jsonb_typeof(new.roll) is distinct from 'object'
	then
		raise exception 'Rolagem inválida.'
			using errcode = '22023';
	end if;
	return new;
end;
$$;

drop trigger if exists ammo_consumptions_immutable on public.ammo_consumptions;
create trigger ammo_consumptions_immutable
	before update on public.ammo_consumptions
	for each row execute function public._ammo_consumptions_immutable();

create or replace function public._ammo_open_qty_write(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	insert into public._ammo_qty_write_gate(character_id)
	values (p_character_id)
	on conflict (character_id) do nothing;
end;
$$;

create or replace function public._ammo_close_qty_write(p_character_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	delete from public._ammo_qty_write_gate where character_id = p_character_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: save legado não repõe quantity de munição nas mesmas entradas
-- -----------------------------------------------------------------------------

create or replace function public.preserve_character_ammo_quantities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	v_old jsonb;
	v_new jsonb;
	v_entry jsonb;
	v_id text;
	v_item text;
begin
	if tg_op is distinct from 'UPDATE' then
		return new;
	end if;
	if exists (
		select 1 from public._ammo_qty_write_gate g where g.character_id = new.id
	) then
		return new;
	end if;
	if jsonb_typeof(old.data->'inventoryList') is distinct from 'array' then
		return new;
	end if;
	v_new := case
		when jsonb_typeof(new.data->'inventoryList') = 'array'
			then new.data->'inventoryList'
		else '[]'::jsonb
	end;
	for v_entry in
		select value from jsonb_array_elements(old.data->'inventoryList')
	loop
		if jsonb_typeof(v_entry) is distinct from 'object' then
			continue;
		end if;
		v_id := v_entry->>'id';
		v_item := nullif(btrim(coalesce(v_entry->>'campaignItemId', '')), '');
		if v_id is null or v_id = '' or v_item is null then
			continue;
		end if;
		if not public._ammo_catalog_is_ammo(v_item, new.campaign_id) then
			continue;
		end if;
		v_new := (
			select coalesce(jsonb_agg(
				case
					when n->>'id' is not distinct from v_id
						then n || jsonb_build_object('quantity', v_entry->'quantity')
					else n
				end
				order by ord
			), '[]'::jsonb)
			from jsonb_array_elements(v_new) with ordinality as t(n, ord)
		);
	end loop;
	new.data := jsonb_set(coalesce(new.data, '{}'::jsonb), '{inventoryList}', v_new, true);
	return new;
end;
$$;

drop trigger if exists characters_preserve_ammo_quantities on public.characters;
create trigger characters_preserve_ammo_quantities
	before update on public.characters
	for each row execute function public.preserve_character_ammo_quantities();

-- -----------------------------------------------------------------------------
-- RPCs públicas
-- -----------------------------------------------------------------------------

create or replace function public._ammo_find_entry(p_data jsonb, p_entry_id text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
	v jsonb;
begin
	if p_entry_id is null or btrim(p_entry_id) = '' or char_length(p_entry_id) > 128 then
		raise exception 'Entrada de inventário inválida.'
			using errcode = '22023';
	end if;
	if jsonb_typeof(p_data->'inventoryList') is distinct from 'array' then
		raise exception 'Munição não encontrada nesta ficha.'
			using errcode = 'P0002';
	end if;
	select e
	into v
	from jsonb_array_elements(p_data->'inventoryList') e
	where jsonb_typeof(e) = 'object'
		and e->>'id' is not distinct from p_entry_id
	limit 1;
	if v is null then
		raise exception 'Munição não encontrada nesta ficha.'
			using errcode = 'P0002';
	end if;
	return v;
end;
$$;

create or replace function public._ammo_require_catalog_ammo(
	p_entry jsonb,
	p_campaign_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_item_id text;
	v_item record;
	v_type text;
begin
	v_item_id := nullif(btrim(coalesce(p_entry->>'campaignItemId', '')), '');
	if v_item_id is null then
		raise exception 'Esta entrada não é munição do catálogo da campanha.'
			using errcode = '22023';
	end if;
	select i.* into v_item
	from public._ammo_catalog_item(v_item_id, p_campaign_id) i
	limit 1;
	if v_item.id is null then
		raise exception 'Esta entrada não é munição do catálogo da campanha.'
			using errcode = '22023';
	end if;
	v_type := coalesce(nullif(btrim(v_item.data->>'type'), ''), v_item.item_type);
	if not public._ammo_type_is_ammo(v_type) then
		raise exception 'Esta entrada não é munição do catálogo da campanha.'
			using errcode = '22023';
	end if;
	return jsonb_build_object(
		'itemId', v_item.id,
		'itemType', v_type,
		'itemName', v_item.name,
		'ammo', coalesce(v_item.data->'ammo', '{}'::jsonb)
	);
end;
$$;

create or replace function public._ammo_load_authorized(
	p_consumption_id uuid,
	p_campaign_id uuid,
	p_character_id uuid,
	p_inventory_entry_id text,
	p_restock boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid;
	v_sheet record;
	v_row public.ammo_consumptions%rowtype;
begin
	v_uid := public._ammo_assert_logged_in();
	if p_consumption_id is null or p_campaign_id is null or p_character_id is null then
		raise exception 'Consumo de munição inválido.'
			using errcode = '22023';
	end if;
	select * into v_sheet
	from public._ammo_lock_character(p_character_id, p_campaign_id);
	if v_sheet.id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;
	if v_sheet.campaign_id is distinct from p_campaign_id then
		raise exception 'Você não pode alterar a munição desta ficha.'
			using errcode = '42501';
	end if;
	perform public._ammo_assert_sheet_access(
		v_uid, v_sheet.user_id, v_sheet.created_by, v_sheet.campaign_id, p_restock
	);
	select * into v_row
	from public.ammo_consumptions a
	where a.consumption_id = p_consumption_id;
	if not found then
		return null;
	end if;
	if v_row.campaign_id is distinct from p_campaign_id
		or v_row.character_id is distinct from p_character_id
		or v_row.inventory_entry_id is distinct from p_inventory_entry_id
	then
		raise exception 'Este consumo de munição não pertence a esta ficha.'
			using errcode = '42501';
	end if;
	return to_jsonb(v_row);
end;
$$;

create or replace function public.consume_ammo(
	p_consumption_id uuid,
	p_campaign_id uuid,
	p_character_id uuid,
	p_inventory_entry_id text,
	p_merged_formula text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid;
	v_sheet record;
	v_existing public.ammo_consumptions%rowtype;
	v_entry jsonb;
	v_catalog jsonb;
	v_qty int;
	v_formula text;
	v_snapshot jsonb;
	v_new_data jsonb;
	v_qty_after int;
begin
	v_uid := public._ammo_assert_logged_in();
	if p_consumption_id is null or p_campaign_id is null or p_character_id is null then
		raise exception 'Consumo de munição inválido.'
			using errcode = '22023';
	end if;
	if p_inventory_entry_id is null or btrim(p_inventory_entry_id) = ''
		or char_length(p_inventory_entry_id) > 128
	then
		raise exception 'Entrada de inventário inválida.'
			using errcode = '22023';
	end if;
	if p_merged_formula is not null and char_length(p_merged_formula) > 200 then
		raise exception 'Fórmula inválida.'
			using errcode = '22023';
	end if;

	select * into v_sheet
	from public._ammo_lock_character(p_character_id, p_campaign_id);
	if v_sheet.id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;
	if v_sheet.campaign_id is distinct from p_campaign_id then
		raise exception 'Você não pode alterar a munição desta ficha.'
			using errcode = '42501';
	end if;
	perform public._ammo_assert_sheet_access(
		v_uid, v_sheet.user_id, v_sheet.created_by, v_sheet.campaign_id, false
	);

	select * into v_existing
	from public.ammo_consumptions a
	where a.consumption_id = p_consumption_id;
	if found then
		if v_existing.campaign_id is distinct from p_campaign_id
			or v_existing.character_id is distinct from p_character_id
			or v_existing.inventory_entry_id is distinct from btrim(p_inventory_entry_id)
		then
			raise exception 'Este consumo de munição não pertence a esta ficha.'
				using errcode = '42501';
		end if;
		return jsonb_build_object(
			'consumption_id', v_existing.consumption_id,
			'quantity', public._ammo_entry_quantity(
				public._ammo_find_entry(v_sheet.data, v_existing.inventory_entry_id)
			),
			'snapshot', v_existing.snapshot,
			'roll', v_existing.roll,
			'replayed', true
		);
	end if;

	v_entry := public._ammo_find_entry(v_sheet.data, btrim(p_inventory_entry_id));
	v_catalog := public._ammo_require_catalog_ammo(v_entry, p_campaign_id);
	v_qty := public._ammo_entry_quantity(v_entry);
	if v_qty < 1 then
		raise exception 'Estoque de munição esgotado.'
			using errcode = '22023';
	end if;
	v_qty_after := v_qty - 1;
	v_formula := nullif(btrim(coalesce(p_merged_formula, '')), '');
	v_snapshot := v_catalog || jsonb_build_object(
		'conditionsText', public._ammo_conditions_text(v_catalog->'ammo'),
		'mergedFormula', v_formula,
		'quantityBefore', v_qty,
		'quantityAfter', v_qty_after,
		'inventoryEntryId', btrim(p_inventory_entry_id)
	);
	v_new_data := public._ammo_replace_entry_quantity(
		v_sheet.data, btrim(p_inventory_entry_id), v_qty_after
	);

	insert into public.ammo_consumptions (
		consumption_id, user_id, campaign_id, character_id, inventory_entry_id, snapshot
	) values (
		p_consumption_id, v_uid, p_campaign_id, p_character_id,
		btrim(p_inventory_entry_id), v_snapshot
	);

	perform public._ammo_open_qty_write(p_character_id);
	update public.characters
	set data = v_new_data
	where id = p_character_id;
	perform public._ammo_close_qty_write(p_character_id);

	return jsonb_build_object(
		'consumption_id', p_consumption_id,
		'quantity', v_qty_after,
		'snapshot', v_snapshot,
		'roll', null,
		'replayed', false
	);
end;
$$;

create or replace function public.set_ammo_quantity(
	p_character_id uuid,
	p_campaign_id uuid,
	p_inventory_entry_id text,
	p_expected int,
	p_new int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid;
	v_sheet record;
	v_entry jsonb;
	v_qty int;
	v_new_data jsonb;
begin
	v_uid := public._ammo_assert_logged_in();
	if p_character_id is null or p_campaign_id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;
	if p_expected is null or p_new is null or p_new < 0 or p_new > 9999
		or p_expected < 0 or p_expected > 9999
	then
		raise exception 'Quantidade de munição inválida.'
			using errcode = '22023';
	end if;

	select * into v_sheet
	from public._ammo_lock_character(p_character_id, p_campaign_id);
	if v_sheet.id is null then
		raise exception 'Ficha não encontrada.'
			using errcode = 'P0002';
	end if;
	if v_sheet.campaign_id is distinct from p_campaign_id then
		raise exception 'Você não pode alterar a munição desta ficha.'
			using errcode = '42501';
	end if;
	perform public._ammo_assert_sheet_access(
		v_uid, v_sheet.user_id, v_sheet.created_by, v_sheet.campaign_id, true
	);

	v_entry := public._ammo_find_entry(v_sheet.data, p_inventory_entry_id);
	perform public._ammo_require_catalog_ammo(v_entry, p_campaign_id);
	v_qty := public._ammo_entry_quantity(v_entry);
	if v_qty is distinct from p_expected then
		raise exception 'A quantidade desta munição mudou. Recarregue e tente de novo.'
			using errcode = '40001';
	end if;

	v_new_data := public._ammo_replace_entry_quantity(
		v_sheet.data, btrim(p_inventory_entry_id), p_new
	);
	perform public._ammo_open_qty_write(p_character_id);
	update public.characters
	set data = v_new_data
	where id = p_character_id;
	perform public._ammo_close_qty_write(p_character_id);

	return jsonb_build_object('quantity', p_new);
end;
$$;

create or replace function public.get_ammo_consumption(
	p_consumption_id uuid,
	p_campaign_id uuid,
	p_character_id uuid,
	p_inventory_entry_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v jsonb;
	v_sheet record;
	v_qty int;
begin
	v := public._ammo_load_authorized(
		p_consumption_id, p_campaign_id, p_character_id, p_inventory_entry_id, false
	);
	if v is null then
		raise exception 'Consumo de munição não encontrado.'
			using errcode = 'P0002';
	end if;
	select * into v_sheet
	from public.characters c
	where c.id = p_character_id;
	begin
		v_qty := public._ammo_entry_quantity(
			public._ammo_find_entry(v_sheet.data, p_inventory_entry_id)
		);
	exception when others then
		v_qty := null;
	end;
	return jsonb_build_object(
		'consumption_id', (v->>'consumption_id')::uuid,
		'quantity', v_qty,
		'snapshot', v->'snapshot',
		'roll', v->'roll',
		'replayed', true
	);
end;
$$;

-- Resume de rolagem/feed: idempotente por consumption_id. Não altera quantity.
-- Preserva o contrato de public.roll_dice (6 argumentos). Não redefine roll_dice.
create or replace function public.complete_ammo_consumption_roll(
	p_consumption_id uuid,
	p_campaign_id uuid,
	p_character_id uuid,
	p_inventory_entry_id text,
	p_scene_id uuid default null,
	p_secret boolean default false,
	p_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v jsonb;
	v_roll jsonb;
	v_formula text;
begin
	v := public._ammo_load_authorized(
		p_consumption_id, p_campaign_id, p_character_id, p_inventory_entry_id, false
	);
	if v is null then
		raise exception 'Consumo de munição não encontrado.'
			using errcode = 'P0002';
	end if;
	perform 1
	from public.ammo_consumptions a
	where a.consumption_id = p_consumption_id
	for update;
	select to_jsonb(a) into v
	from public.ammo_consumptions a
	where a.consumption_id = p_consumption_id;
	if v->'roll' is not null and jsonb_typeof(v->'roll') = 'object' then
		return jsonb_build_object(
			'consumption_id', p_consumption_id,
			'roll', v->'roll',
			'replayed', true
		);
	end if;
	v_formula := nullif(btrim(coalesce(v->'snapshot'->>'mergedFormula', '')), '');
	if v_formula is null then
		raise exception 'Este consumo não tem fórmula de rolagem.'
			using errcode = '22023';
	end if;
	-- Contrato 0052 intacto: (campaign, scene, formula, secret, label, character).
	v_roll := public.roll_dice(
		p_campaign_id, p_scene_id, v_formula, coalesce(p_secret, false), p_label, p_character_id
	);
	update public.ammo_consumptions
	set roll = v_roll
	where consumption_id = p_consumption_id
		and roll is null;
	if not found then
		select a.roll into v_roll
		from public.ammo_consumptions a
		where a.consumption_id = p_consumption_id;
		return jsonb_build_object(
			'consumption_id', p_consumption_id,
			'roll', v_roll,
			'replayed', true
		);
	end if;
	return jsonb_build_object(
		'consumption_id', p_consumption_id,
		'roll', v_roll,
		'replayed', false
	);
end;
$$;

-- -----------------------------------------------------------------------------
-- EXECUTE: públicos só authenticated; helpers sem EXECUTE público
-- -----------------------------------------------------------------------------

revoke all on function public._ammo_norm_type(text) from public, anon, authenticated;
revoke all on function public._ammo_type_is_ammo(text) from public, anon, authenticated;
revoke all on function public._ammo_catalog_item(text, uuid) from public, anon, authenticated;
revoke all on function public._ammo_catalog_is_ammo(text, uuid) from public, anon, authenticated;
revoke all on function public._ammo_conditions_text(jsonb) from public, anon, authenticated;
revoke all on function public._ammo_entry_quantity(jsonb) from public, anon, authenticated;
revoke all on function public._ammo_replace_entry_quantity(jsonb, text, int) from public, anon, authenticated;
revoke all on function public._ammo_assert_logged_in() from public, anon, authenticated;
revoke all on function public._ammo_assert_sheet_access(uuid, uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public._ammo_lock_character(uuid, uuid) from public, anon, authenticated;
revoke all on function public._ammo_consumptions_immutable() from public, anon, authenticated;
revoke all on function public._ammo_open_qty_write(uuid) from public, anon, authenticated;
revoke all on function public._ammo_close_qty_write(uuid) from public, anon, authenticated;
revoke all on function public.preserve_character_ammo_quantities() from public, anon, authenticated;
revoke all on function public._ammo_find_entry(jsonb, text) from public, anon, authenticated;
revoke all on function public._ammo_require_catalog_ammo(jsonb, uuid) from public, anon, authenticated;
revoke all on function public._ammo_load_authorized(uuid, uuid, uuid, text, boolean) from public, anon, authenticated;

revoke all on function public.consume_ammo(uuid, uuid, uuid, text, text) from public, anon;
revoke all on function public.set_ammo_quantity(uuid, uuid, text, int, int) from public, anon;
revoke all on function public.get_ammo_consumption(uuid, uuid, uuid, text) from public, anon;
revoke all on function public.complete_ammo_consumption_roll(uuid, uuid, uuid, text, uuid, boolean, text) from public, anon;

grant execute on function public.consume_ammo(uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.set_ammo_quantity(uuid, uuid, text, int, int) to authenticated;
grant execute on function public.get_ammo_consumption(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.complete_ammo_consumption_roll(uuid, uuid, uuid, text, uuid, boolean, text) to authenticated;
