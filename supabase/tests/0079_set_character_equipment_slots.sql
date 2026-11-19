-- Teste da 0079: slots novos de set_character_equipment.
-- SÓ Postgres local descartável. Tudo numa transação com ROLLBACK no fim.
-- Não usa supabase db push, link, nem projeto remoto.
--
-- O mesmo arquivo cobre a função nova e a função restaurada pelo rollback:
-- se o corpo contém 'earring', exige os cenários (1)–(4);
-- se não contém, exige o (5): slots novos voltam a ser 22023 e os 10 antigos seguem.
--
-- Contas sintéticas. A saída é uma linha PASS por subcaso. Falha = RAISE.
-- Uso: docker exec -i supabase_db_arkhiveon psql -U postgres -d postgres -v ON_ERROR_STOP=1 < este arquivo

\pset pager off
\pset tuples_only on
\pset format unaligned

begin;

do $$
begin
	if exists (select 1 from public.campaigns) then
		raise exception 'Banco tem campanhas: rode este teste só em Postgres local descartável.';
	end if;
	if to_regprocedure('public.set_character_equipment(uuid, jsonb)') is null then
		raise exception 'Função set_character_equipment(uuid, jsonb) não existe.';
	end if;
end $$;

insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'mestre@example.invalid'),
	('00000000-0000-0000-0000-0000000000f1', 'dono@example.invalid'),
	('00000000-0000-0000-0000-0000000000d1', 'membro@example.invalid'),
	('00000000-0000-0000-0000-0000000000c1', 'outsider@example.invalid');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo teste');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha teste', '10000000-0000-0000-0000-0000000000a1', 20);

-- O trigger da 0059 já cria a membership de mestre. Aqui só entram o dono da
-- ficha e outro membro, os dois como viewer.
insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 'viewer');

insert into public.characters (id, campaign_id, name, user_id, created_by, data) values
	('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000a1', 'Ficha teste',
	 '00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1',
	 '{"marker":"keep","inventoryList":[{"id":"inv-1","name":"Peca","quantity":1,"location":"backpack"}]}');

create temp table case_results (
	ord integer generated always as identity,
	line text not null
);

create function pg_temp.record_pass(p_line text) returns void
language plpgsql as $$
begin
	insert into pg_temp.case_results (line) values ('PASS ' || p_line);
end $$;

create function pg_temp.reset_sheet() returns void
language sql as $$
	update public.characters
	set data = '{"marker":"keep","inventoryList":[{"id":"inv-1","name":"Peca","quantity":1,"location":"backpack"}]}'::jsonb
	where id = '30000000-0000-0000-0000-0000000000f1';
$$;

create function pg_temp.entry() returns jsonb
language sql as $$
	select e
	from public.characters c,
		lateral jsonb_array_elements(c.data->'inventoryList') e
	where c.id = '30000000-0000-0000-0000-0000000000f1'
		and e->>'id' = 'inv-1';
$$;

create function pg_temp.assert_equipped(p_slot text) returns void
language plpgsql as $$
declare
	d jsonb;
	e jsonb;
begin
	select data into d
	from public.characters
	where id = '30000000-0000-0000-0000-0000000000f1';
	e := pg_temp.entry();
	if d->>'marker' is distinct from 'keep'
		or e->>'name' is distinct from 'Peca'
		or e->>'quantity' is distinct from '1'
		or e->>'location' is distinct from 'equipped'
		or e->>'slot' is distinct from p_slot
	then
		raise exception 'equipar em % alterou a ficha além do slot', p_slot;
	end if;
end $$;

create function pg_temp.assert_untouched() returns void
language plpgsql as $$
declare
	d jsonb;
	e jsonb;
begin
	select data into d
	from public.characters
	where id = '30000000-0000-0000-0000-0000000000f1';
	e := pg_temp.entry();
	if d->>'marker' is distinct from 'keep'
		or e->>'name' is distinct from 'Peca'
		or e->>'quantity' is distinct from '1'
		or e->>'location' is distinct from 'backpack'
		or nullif(e->>'slot', '') is not null
	then
		raise exception 'uma recusa gravou equipamento na ficha';
	end if;
end $$;

create function pg_temp.as_user(p_uid text, p_slot text) returns text
language plpgsql as $$
declare
	v_state text;
	v_changes jsonb;
begin
	if p_uid is null then
		perform set_config('request.jwt.claims', '{"role":"authenticated"}', true);
		perform set_config('request.jwt.claim.sub', '', true);
	else
		perform set_config(
			'request.jwt.claims',
			json_build_object('sub', p_uid, 'role', 'authenticated')::text,
			true
		);
		perform set_config('request.jwt.claim.sub', p_uid, true);
	end if;
	perform set_config('request.jwt.claim.role', 'authenticated', true);
	perform set_config('role', 'authenticated', true);
	v_changes := jsonb_build_array(
		jsonb_build_object('id', 'inv-1', 'location', 'equipped', 'slot', p_slot)
	);
	begin
		perform public.set_character_equipment(
			'30000000-0000-0000-0000-0000000000f1',
			v_changes
		);
		perform set_config('role', 'postgres', true);
		return 'permitido';
	exception when others then
		get stacked diagnostics v_state = returned_sqlstate;
		perform set_config('role', 'postgres', true);
		return 'negado ' || v_state;
	end;
end $$;

create function pg_temp.assert_shape() returns void
language plpgsql as $$
declare
	v_definer boolean;
	v_config text[];
	v_args text;
begin
	select p.prosecdef, p.proconfig, pg_get_function_identity_arguments(p.oid)
	into v_definer, v_config, v_args
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	where n.nspname = 'public'
		and p.proname = 'set_character_equipment';
	if v_args is distinct from 'p_character_id uuid, p_changes jsonb' then
		raise exception 'assinatura mudou: %', v_args;
	end if;
	if v_definer is not true then
		raise exception 'SECURITY DEFINER sumiu';
	end if;
	if not (v_config @> array['search_path=public']) then
		raise exception 'search_path mudou';
	end if;
	if has_function_privilege('anon', 'public.set_character_equipment(uuid,jsonb)', 'execute')
		or has_function_privilege('public', 'public.set_character_equipment(uuid,jsonb)', 'execute')
	then
		raise exception 'anon ou public ganhou EXECUTE';
	end if;
	if not has_function_privilege('authenticated', 'public.set_character_equipment(uuid,jsonb)', 'execute') then
		raise exception 'authenticated perdeu EXECUTE';
	end if;
end $$;

do $$
declare
	v_def text := pg_get_functiondef('public.set_character_equipment(uuid, jsonb)'::regprocedure);
	v_new boolean := position('''earring''' in v_def) > 0;
	v_slot text;
	v_got text;
	v_owner constant text := '00000000-0000-0000-0000-0000000000f1';
	v_member constant text := '00000000-0000-0000-0000-0000000000d1';
	v_out constant text := '00000000-0000-0000-0000-0000000000c1';
	v_new_slots constant text[] := array[
		'earring', 'bracelet', 'belt', 'bracers', 'ring3', 'ring4'
	];
	v_old_slots constant text[] := array[
		'head', 'neck', 'cloak', 'hands', 'ring1', 'ring2',
		'mainHand', 'offHand', 'armor', 'feet'
	];
begin
	perform pg_temp.assert_shape();
	perform pg_temp.record_pass('assinatura, security definer, search_path e grants iguais');

	if v_new then
		foreach v_slot in array v_new_slots loop
			perform pg_temp.reset_sheet();
			v_got := pg_temp.as_user(v_owner, v_slot);
			if v_got is distinct from 'permitido' then
				raise exception 'dono deveria equipar em % e veio %', v_slot, v_got;
			end if;
			perform pg_temp.assert_equipped(v_slot);
			perform pg_temp.record_pass('1 dono equipa ' || v_slot);
		end loop;

		perform pg_temp.reset_sheet();
		v_got := pg_temp.as_user(v_member, 'earring');
		if v_got is distinct from 'negado 42501' then
			raise exception 'membro deveria ser negado e veio %', v_got;
		end if;
		perform pg_temp.assert_untouched();
		perform pg_temp.record_pass('2 membro da campanha que nao e dono: negado 42501');

		perform pg_temp.reset_sheet();
		v_got := pg_temp.as_user(v_out, 'earring');
		if v_got is distinct from 'negado 42501' then
			raise exception 'outsider deveria ser negado e veio %', v_got;
		end if;
		perform pg_temp.assert_untouched();
		perform pg_temp.record_pass('2 outsider: negado 42501');

		perform pg_temp.reset_sheet();
		v_got := pg_temp.as_user(v_owner, 'tiara');
		if v_got is distinct from 'negado 22023' then
			raise exception 'slot invalido deveria ser 22023 e veio %', v_got;
		end if;
		perform pg_temp.assert_untouched();
		perform pg_temp.record_pass('3 slot invalido: 22023');

		foreach v_slot in array v_old_slots loop
			perform pg_temp.reset_sheet();
			v_got := pg_temp.as_user(v_owner, v_slot);
			if v_got is distinct from 'permitido' then
				raise exception 'slot antigo % deveria continuar e veio %', v_slot, v_got;
			end if;
			perform pg_temp.assert_equipped(v_slot);
			perform pg_temp.record_pass('4 slot antigo ' || v_slot);
		end loop;
	else
		foreach v_slot in array v_new_slots loop
			perform pg_temp.reset_sheet();
			v_got := pg_temp.as_user(v_owner, v_slot);
			if v_got is distinct from 'negado 22023' then
				raise exception 'depois do rollback % deveria ser 22023 e veio %', v_slot, v_got;
			end if;
			perform pg_temp.assert_untouched();
			perform pg_temp.record_pass('5 rollback rejeita ' || v_slot || ' com 22023');
		end loop;

		foreach v_slot in array v_old_slots loop
			perform pg_temp.reset_sheet();
			v_got := pg_temp.as_user(v_owner, v_slot);
			if v_got is distinct from 'permitido' then
				raise exception 'depois do rollback o slot antigo % veio %', v_slot, v_got;
			end if;
			perform pg_temp.assert_equipped(v_slot);
			perform pg_temp.record_pass('5 rollback mantem slot antigo ' || v_slot);
		end loop;
	end if;
end $$;

select line from pg_temp.case_results order by ord;

rollback;
