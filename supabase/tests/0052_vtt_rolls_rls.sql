-- Teste da migration 0052: rolagem no servidor, chat e sessão do feed.
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0052 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0052_vtt_rolls_rls.sql
--
-- gm   00000000-0000-0000-0000-0000000000a1  owner de A
-- ed   00000000-0000-0000-0000-0000000000e1  editor de A
-- pl   00000000-0000-0000-0000-0000000000f1  viewer de A
-- out  00000000-0000-0000-0000-0000000000b1  owner de B, fora de A

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1)
		or exists (select 1 from public.campaigns limit 1) then
		raise exception 'Banco tem dados: rode este teste só em Postgres descartável.';
	end if;
end $$;

insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'gm@teste.local'),
	('00000000-0000-0000-0000-0000000000e1', 'editor@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'jogador@teste.local'),
	('00000000-0000-0000-0000-0000000000b1', 'fora@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A'),
	('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Mundo B');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha A', '10000000-0000-0000-0000-0000000000a1', 20),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Campanha B', '10000000-0000-0000-0000-0000000000b1', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer'),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'owner');

insert into public.characters (id, campaign_id, name, user_id, created_by) values
	('30000000-0000-0000-0000-0000000000f1', '20000000-0000-0000-0000-0000000000a1', 'Ficha do jogador',
		'00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f1'),
	('30000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Ficha do mestre',
		'00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1'),
	('30000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 'Ficha de fora',
		'00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1');

insert into public.vtt_scenes (id, campaign_id, name, is_active) values
	('40000000-0000-0000-0000-0000000000a1', '20000000-0000-0000-0000-0000000000a1', 'Caverna', true),
	('40000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b1', 'Torre', true);

create temp table _res (
	n integer generated always as identity,
	cenario text,
	esperado text,
	obtido text
);
create temp table _ids (k text primary key, v text);
grant all on _res to authenticated, anon;
grant all on _ids to authenticated, anon;

create function pg_temp.as_user_text(p_uid text, p_sql text)
returns text language plpgsql as $f$
declare
	v text;
begin
	perform set_config('request.jwt.claim.sub', p_uid, true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_uid, 'role', 'authenticated')::text,
		true
	);
	perform set_config('role', 'authenticated', true);
	begin
		execute p_sql into v;
	exception when others then
		perform set_config('request.jwt.claim.sub', '', true);
		perform set_config('request.jwt.claims', '{}', true);
		perform set_config('role', 'postgres', true);
		return 'negado (' || sqlstate || ': ' || sqlerrm || ')';
	end;
	perform set_config('request.jwt.claim.sub', '', true);
	perform set_config('request.jwt.claims', '{}', true);
	perform set_config('role', 'postgres', true);
	return coalesce(v, 'sem-linha');
end $f$;

create function pg_temp.as_user(p_uid text, p_sql text)
returns text language plpgsql as $f$
declare
	n bigint;
begin
	perform set_config('request.jwt.claim.sub', p_uid, true);
	perform set_config(
		'request.jwt.claims',
		json_build_object('sub', p_uid, 'role', 'authenticated')::text,
		true
	);
	perform set_config('role', 'authenticated', true);
	begin
		execute p_sql;
		get diagnostics n = row_count;
	exception when others then
		perform set_config('request.jwt.claim.sub', '', true);
		perform set_config('request.jwt.claims', '{}', true);
		perform set_config('role', 'postgres', true);
		return 'negado (' || sqlstate || ': ' || sqlerrm || ')';
	end;
	perform set_config('request.jwt.claim.sub', '', true);
	perform set_config('request.jwt.claims', '{}', true);
	perform set_config('role', 'postgres', true);
	return case when n = 0 then 'negado (0 linhas)' else 'permitido' end;
end $f$;

create function pg_temp.as_anon(p_sql text)
returns text language plpgsql as $f$
declare
	v text;
begin
	perform set_config('request.jwt.claim.sub', '', true);
	perform set_config('request.jwt.claims', '{"role":"anon"}', true);
	perform set_config('role', 'anon', true);
	begin
		execute p_sql into v;
	exception when others then
		perform set_config('request.jwt.claim.sub', '', true);
		perform set_config('request.jwt.claims', '{}', true);
		perform set_config('role', 'postgres', true);
		return 'negado (' || sqlstate || ': ' || sqlerrm || ')';
	end;
	perform set_config('request.jwt.claim.sub', '', true);
	perform set_config('request.jwt.claims', '{}', true);
	perform set_config('role', 'postgres', true);
	return coalesce(v, 'sem-linha');
end $f$;

create function pg_temp.is_uuid(p text)
returns boolean language sql as $f$
	select coalesce(p, '') ~ '^[0-9a-f-]{36}$'
$f$;

create function pg_temp.safe_uuid(p text)
returns uuid language plpgsql as $f$
begin
	if not pg_temp.is_uuid(p) then
		return null;
	end if;
	return p::uuid;
end $f$;

-- O total gravado é a soma dos dados gerados no servidor, não um valor do cliente.
create function pg_temp.roll_ok(p_id uuid, p_secret boolean, p_author uuid)
returns boolean language sql as $f$
	select exists (
		select 1
		from public.vtt_rolls r
		join public.vtt_roll_results s on s.roll_id = r.id
		where r.id = p_id
			and r.kind = 'roll'
			and r.is_secret = p_secret
			and r.author_id = p_author
			and r.message is null
			and (
				(p_secret and r.formula is null)
				or (not p_secret and r.formula = s.details->>'formula')
			)
			and s.details->>'formula' is not null
			and (s.details->>'count')::int = jsonb_array_length(s.details->'rolls')
			and s.total = coalesce((
				select sum(d.value::int)
				from jsonb_array_elements_text(s.details->'rolls') as d(value)
			), 0) + (s.details->>'modifier')::int
			and not exists (
				select 1
				from jsonb_array_elements_text(s.details->'rolls') as d(value)
				where d.value::int < 1
					or d.value::int > (s.details->>'faces')::int
			)
			and r.session_id = (
				select c.current_feed_session_id
				from public.campaigns c
				where c.id = r.campaign_id
			)
	)
$f$;

insert into _ids (k, v) values (
	'normal',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000a1',
			'2d6+3',
			false,
			null,
			null
		)->>'id'$q$
	)
);
insert into _ids (k, v) values (
	's1',
	(select current_feed_session_id::text
		from public.campaigns
		where id = '20000000-0000-0000-0000-0000000000a1')
);

insert into _res (cenario, esperado, obtido)
select
	'mestre: rolagem normal fecha com os dados do servidor',
	'ok',
	case
		when pg_temp.is_uuid((select v from _ids where k = 'normal'))
			and pg_temp.roll_ok(
				(select pg_temp.safe_uuid(v) from _ids where k = 'normal'),
				false,
				'00000000-0000-0000-0000-0000000000a1'
			)
			and (select formula from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'normal')) = '2d6+3'
		then 'ok'
		else 'falhou'
	end;

insert into _res (cenario, esperado, obtido)
select
	'primeira rolagem abre a sessão corrente',
	'ok',
	case
		when pg_temp.is_uuid((select v from _ids where k = 's1'))
			and (select session_id::text from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'normal'))
				= (select v from _ids where k = 's1')
		then 'ok'
		else 'falhou'
	end;

insert into _ids (k, v) values (
	'secret',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000a1',
			'1d20+5',
			true,
			'Percepção',
			null
		)->>'id'$q$
	)
);

insert into _res (cenario, esperado, obtido)
select
	'mestre: rolagem secreta grava o total só no resultado',
	'ok',
	case
		when pg_temp.is_uuid((select v from _ids where k = 'secret'))
			and pg_temp.roll_ok(
				(select pg_temp.safe_uuid(v) from _ids where k = 'secret'),
				true,
				'00000000-0000-0000-0000-0000000000a1'
			)
		then 'ok'
		else 'falhou'
	end;

insert into _res (cenario, esperado, obtido)
select
	'jogador vê a linha secreta sem fórmula',
	'sem-formula|Percepção',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select case
			when formula is null and is_secret and label = 'Percepção' then 'sem-formula|Percepção'
			else coalesce(formula, 'sem-formula') || '|' || coalesce(label, '')
		end
		from public.vtt_rolls
		where id = (select pg_temp.safe_uuid(v) from _ids where k = 'secret')$q$
	);

insert into _res (cenario, esperado, obtido)
select
	'jogador lê 0 linhas do resultado secreto',
	'0',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select count(*)::text from public.vtt_roll_results
		where roll_id = (select pg_temp.safe_uuid(v) from _ids where k = 'secret')$q$
	);

insert into _res (cenario, esperado, obtido)
select
	'mestre lê o resultado secreto',
	'1',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select count(*)::text from public.vtt_roll_results
		where roll_id = (select pg_temp.safe_uuid(v) from _ids where k = 'secret')$q$
	);

insert into _res (cenario, esperado, obtido)
select
	'jogador lê o total da rolagem pública',
	(select total::text from public.vtt_roll_results where roll_id = (select pg_temp.safe_uuid(v) from _ids where k = 'normal')),
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select total::text from public.vtt_roll_results
		where roll_id = (select pg_temp.safe_uuid(v) from _ids where k = 'normal')$q$
	);

insert into _res (cenario, esperado, obtido) values (
	'jogador não rola em segredo',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000a1',
			'1d20',
			true,
			null,
			null
		)->>'id'$q$
	)
);

insert into _ids (k, v) values (
	'editor_secret',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000e1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			null,
			'1d6',
			true,
			null,
			null
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select
	'editor rola em segredo',
	'ok',
	case
		when pg_temp.roll_ok(
			(select pg_temp.safe_uuid(v) from _ids where k = 'editor_secret'),
			true,
			'00000000-0000-0000-0000-0000000000e1'
		)
		then 'ok'
		else 'falhou'
	end;

insert into _res (cenario, esperado, obtido)
select
	'jogador continua sem ver resultado secreto (mestre e editor)',
	'0',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select count(*)::text
		from public.vtt_roll_results
		where roll_id in (
			(select pg_temp.safe_uuid(v) from _ids where k = 'secret'),
			(select pg_temp.safe_uuid(v) from _ids where k = 'editor_secret')
		)$q$
	);

insert into _ids (k, v) values (
	'char_player',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000a1',
			'1d20',
			false,
			null,
			'30000000-0000-0000-0000-0000000000f1'
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select
	'jogador rola pela própria ficha',
	'ok',
	case
		when pg_temp.roll_ok(
			(select pg_temp.safe_uuid(v) from _ids where k = 'char_player'),
			false,
			'00000000-0000-0000-0000-0000000000f1'
		)
			and (select character_id from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'char_player'))
				= '30000000-0000-0000-0000-0000000000f1'
		then 'ok'
		else 'falhou'
	end;

insert into _res (cenario, esperado, obtido) values (
	'jogador não rola pela ficha do mestre',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000a1',
			'1d20',
			false,
			null,
			'30000000-0000-0000-0000-0000000000a1'
		)->>'id'$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'jogador não rola pela ficha de outra campanha',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000a1',
			'1d20',
			false,
			null,
			'30000000-0000-0000-0000-0000000000b1'
		)->>'id'$q$
	)
);

insert into _ids (k, v) values (
	'sem_ficha',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000a1',
			'1d4',
			false,
			null
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select
	'jogador rola sem ficha',
	'ok',
	case
		when pg_temp.roll_ok(
			(select pg_temp.safe_uuid(v) from _ids where k = 'sem_ficha'),
			false,
			'00000000-0000-0000-0000-0000000000f1'
		)
			and (select character_id from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'sem_ficha')) is null
		then 'ok'
		else 'falhou'
	end;

insert into _ids (k, v) values (
	'gm_char',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			null,
			'1d8',
			false,
			null,
			'30000000-0000-0000-0000-0000000000f1'
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select
	'mestre rola pela ficha do jogador',
	'ok',
	case
		when pg_temp.roll_ok(
			(select pg_temp.safe_uuid(v) from _ids where k = 'gm_char'),
			false,
			'00000000-0000-0000-0000-0000000000a1'
		)
		then 'ok'
		else 'falhou'
	end;

insert into _ids (k, v) values (
	'canon',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			null,
			'  2D6 + 0 ',
			false,
			null,
			null
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select
	'servidor guarda a fórmula canônica',
	'2d6',
	(select formula from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'canon'));

insert into _ids (k, v) values (
	'd20',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			null,
			'd20',
			false,
			null,
			null
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select 'd20 vira 1d20', '1d20',
	(select formula from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'd20'));

insert into _ids (k, v) values (
	'cem',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1', null, '100d2', false, null, null
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select '100 dados ainda é rolagem do servidor', 'ok',
	case when pg_temp.roll_ok(
		(select pg_temp.safe_uuid(v) from _ids where k = 'cem'),
		false,
		'00000000-0000-0000-0000-0000000000a1'
	) then 'ok' else 'falhou' end;

insert into _res (cenario, esperado, obtido)
select '1d1000 é aceito', 'ok',
	case when pg_temp.is_uuid(pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1', null, '1d1000', false, null, null
		)->>'id'$q$
	)) then 'ok' else 'falhou' end;

insert into _ids (k, v) values (
	'modneg',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1', null, '1d20-1', false, null, null
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select 'modificador negativo entra na conta', '1d20-1',
	(select s.details->>'formula'
		from public.vtt_roll_results s
		where s.roll_id = (select pg_temp.safe_uuid(v) from _ids where k = 'modneg'));

insert into _res (cenario, esperado, obtido) values
	('101 dados é recusado', 'negado', pg_temp.as_user_text('00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice('20000000-0000-0000-0000-0000000000a1', null, '101d6', false, null, null)->>'id'$q$)),
	('1d1 é recusado', 'negado', pg_temp.as_user_text('00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice('20000000-0000-0000-0000-0000000000a1', null, '1d1', false, null, null)->>'id'$q$)),
	('1d1001 é recusado', 'negado', pg_temp.as_user_text('00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice('20000000-0000-0000-0000-0000000000a1', null, '1d1001', false, null, null)->>'id'$q$)),
	('2d6+1d4 é recusado', 'negado', pg_temp.as_user_text('00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice('20000000-0000-0000-0000-0000000000a1', null, '2d6+1d4', false, null, null)->>'id'$q$)),
	('fórmula vazia é recusada', 'negado', pg_temp.as_user_text('00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice('20000000-0000-0000-0000-0000000000a1', null, '   ', false, null, null)->>'id'$q$)),
	('modificador enorme é recusado', 'negado', pg_temp.as_user_text('00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice('20000000-0000-0000-0000-0000000000a1', null, '1d20+1000001', false, null, null)->>'id'$q$)),
	('não existe parâmetro de total', 'negado', pg_temp.as_user_text('00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice('20000000-0000-0000-0000-0000000000a1', null, '1d20', false, null, null, 18)->>'id'$q$)),
	('cena de outra campanha é recusada', 'negado', pg_temp.as_user_text('00000000-0000-0000-0000-0000000000a1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000b1',
			'1d20', false, null, null
		)->>'id'$q$));

insert into _res (cenario, esperado, obtido)
select 'total do cliente não substitui o do servidor', 'ok',
	case
		when pg_temp.roll_ok(
			(select pg_temp.safe_uuid(v) from _ids where k = 'normal'),
			false,
			'00000000-0000-0000-0000-0000000000a1'
		)
			and (select total from public.vtt_roll_results where roll_id = (select pg_temp.safe_uuid(v) from _ids where k = 'normal')) between 5 and 15
		then 'ok'
		else 'falhou'
	end;

insert into _res (cenario, esperado, obtido) values (
	'jogador não insere rolagem direto',
	'negado',
	pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000f1',
		$q$insert into public.vtt_rolls (campaign_id, session_id, author_id, kind, formula, is_secret)
		values (
			'20000000-0000-0000-0000-0000000000a1',
			(select pg_temp.safe_uuid(v) from _ids where k = 's1'),
			'00000000-0000-0000-0000-0000000000a1',
			'roll',
			'1d20',
			false
		)$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'jogador não insere resultado direto',
	'negado',
	pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000f1',
		$q$insert into public.vtt_roll_results (roll_id, total, details)
		values (
			(select pg_temp.safe_uuid(v) from _ids where k = 'normal'),
			999,
			'{"formula":"1d20","count":1,"faces":20,"modifier":0,"rolls":[20]}'::jsonb
		)$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'mestre não insere resultado direto',
	'negado',
	pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$insert into public.vtt_roll_results (roll_id, total, details)
		values (
			(select pg_temp.safe_uuid(v) from _ids where k = 'secret'),
			999,
			'{"formula":"1d20","count":1,"faces":20,"modifier":0,"rolls":[20]}'::jsonb
		)$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'ninguém reescreve a fórmula da rolagem secreta',
	'negado',
	pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$update public.vtt_rolls set formula = '1d20'
		where id = (select pg_temp.safe_uuid(v) from _ids where k = 'secret')$q$
	)
);

insert into _res (cenario, esperado, obtido)
select 'fórmula secreta continua nula', 'sem-formula',
	(select case when formula is null then 'sem-formula' else formula end
		from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'secret'));

insert into _res (cenario, esperado, obtido) values (
	'mestre não apaga o feed',
	'negado',
	pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$delete from public.vtt_rolls
		where campaign_id = '20000000-0000-0000-0000-0000000000a1'$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'jogador não posta chat como outra pessoa',
	'negado',
	pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000f1',
		$q$insert into public.vtt_rolls (campaign_id, session_id, author_id, kind, message, is_secret)
		values (
			'20000000-0000-0000-0000-0000000000a1',
			(select pg_temp.safe_uuid(v) from _ids where k = 's1'),
			'00000000-0000-0000-0000-0000000000a1',
			'chat',
			'falsificado',
			false
		)$q$
	)
);

insert into _ids (k, v) values (
	'chat_player',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.post_table_message(
			'20000000-0000-0000-0000-0000000000a1',
			'40000000-0000-0000-0000-0000000000a1',
			'Olá mesa',
			'30000000-0000-0000-0000-0000000000f1'
		)::text$q$
	)
);
insert into _res (cenario, esperado, obtido)
select 'chat do jogador fica com o autor certo', 'ok',
	case
		when (select author_id = '00000000-0000-0000-0000-0000000000f1'
				and kind = 'chat' and formula is null and is_secret = false
				and message = 'Olá mesa'
				and character_id = '30000000-0000-0000-0000-0000000000f1'
				and session_id = (select pg_temp.safe_uuid(v) from _ids where k = 's1')
			from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'chat_player'))
		then 'ok'
		else 'falhou'
	end;

insert into _res (cenario, esperado, obtido)
select 'chat não gera linha de resultado', '0',
	(select count(*)::text from public.vtt_roll_results
		where roll_id = (select pg_temp.safe_uuid(v) from _ids where k = 'chat_player'));

insert into _res (cenario, esperado, obtido)
select 'editor posta no chat', 'ok',
	case when pg_temp.is_uuid(pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000e1',
		$q$select public.post_table_message(
			'20000000-0000-0000-0000-0000000000a1', null, 'do editor', null
		)::text$q$
	)) then 'ok' else 'falhou' end;

insert into _res (cenario, esperado, obtido)
select 'mestre posta no chat', 'ok',
	case when pg_temp.is_uuid(pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.post_table_message(
			'20000000-0000-0000-0000-0000000000a1', null, 'do mestre', null
		)::text$q$
	)) then 'ok' else 'falhou' end;

insert into _res (cenario, esperado, obtido) values (
	'quem está fora não posta na campanha',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000b1',
		$q$select public.post_table_message(
			'20000000-0000-0000-0000-0000000000a1', null, 'invasão', null
		)::text$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'mensagem vazia é recusada',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.post_table_message(
			'20000000-0000-0000-0000-0000000000a1', null, '   ', null
		)::text$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'quem está fora não vê o feed',
	'0',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000b1',
		$q$select count(*)::text from public.vtt_rolls
		where campaign_id = '20000000-0000-0000-0000-0000000000a1'$q$
	)
);

insert into _ids (k, v) values (
	'roll_b',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000b1',
		$q$select public.roll_dice(
			'20000000-0000-0000-0000-0000000000b1',
			'40000000-0000-0000-0000-0000000000b1',
			'1d20', false, null, null
		)->>'id'$q$
	)
);
insert into _res (cenario, esperado, obtido)
select 'dono da outra campanha rola na mesa dele', 'ok',
	case when pg_temp.roll_ok(
		(select pg_temp.safe_uuid(v) from _ids where k = 'roll_b'),
		false,
		'00000000-0000-0000-0000-0000000000b1'
	) then 'ok' else 'falhou' end;

insert into _res (cenario, esperado, obtido) values (
	'jogador da campanha A não vê a rolagem da campanha B',
	'0',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select count(*)::text from public.vtt_rolls
		where id = (select pg_temp.safe_uuid(v) from _ids where k = 'roll_b')$q$
	)
);

insert into _res (cenario, esperado, obtido) values
	('anon não executa roll_dice', 'false',
		has_function_privilege('anon', 'public.roll_dice(uuid,uuid,text,boolean,text,uuid)', 'execute')::text),
	('anon não executa post_table_message', 'false',
		has_function_privilege('anon', 'public.post_table_message(uuid,uuid,text,uuid)', 'execute')::text),
	('anon não executa start_feed_session', 'false',
		has_function_privilege('anon', 'public.start_feed_session(uuid)', 'execute')::text),
	('public não executa roll_dice', 'false',
		has_function_privilege('public', 'public.roll_dice(uuid,uuid,text,boolean,text,uuid)', 'execute')::text),
	('authenticated executa roll_dice', 'true',
		has_function_privilege('authenticated', 'public.roll_dice(uuid,uuid,text,boolean,text,uuid)', 'execute')::text);

insert into _res (cenario, esperado, obtido) values (
	'anon não chama a rolagem',
	'negado',
	pg_temp.as_anon($q$select public.roll_dice(
		'20000000-0000-0000-0000-0000000000a1', null, '1d20', false, null, null
	)->>'id'$q$)
);

insert into _res (cenario, esperado, obtido) values (
	'anon não lê o feed',
	'negado',
	pg_temp.as_anon($q$select count(*)::text from public.vtt_rolls$q$)
);

insert into _res (cenario, esperado, obtido) values (
	'jogador não inicia a sessão',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.start_feed_session('20000000-0000-0000-0000-0000000000a1')::text$q$
	)
);

insert into _res (cenario, esperado, obtido)
select 'ponteiro continua na primeira sessão',
	(select v from _ids where k = 's1'),
	(select current_feed_session_id::text from public.campaigns
		where id = '20000000-0000-0000-0000-0000000000a1');

insert into _res (cenario, esperado, obtido) values (
	'quem está fora não inicia a sessão',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000b1',
		$q$select public.start_feed_session('20000000-0000-0000-0000-0000000000a1')::text$q$
	)
);

insert into _ids (k, v) values (
	's2',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000e1',
		$q$select public.start_feed_session('20000000-0000-0000-0000-0000000000a1')::text$q$
	)
);
insert into _res (cenario, esperado, obtido)
select 'editor abre outra sessão', 'ok',
	case
		when pg_temp.is_uuid((select v from _ids where k = 's2'))
			and (select v from _ids where k = 's2') <> (select v from _ids where k = 's1')
			and (select current_feed_session_id::text from public.campaigns
				where id = '20000000-0000-0000-0000-0000000000a1')
				= (select v from _ids where k = 's2')
		then 'ok'
		else 'falhou'
	end;

insert into _ids (k, v) values (
	'old_n',
	(select count(*)::text from public.vtt_rolls
		where session_id = (select pg_temp.safe_uuid(v) from _ids where k = 's1'))
);

insert into _res (cenario, esperado, obtido) values (
	'jogador não vê a sessão anterior',
	'0',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select count(*)::text from public.vtt_rolls
		where session_id = (select pg_temp.safe_uuid(v) from _ids where k = 's1')$q$
	)
);

insert into _res (cenario, esperado, obtido)
select 'jogador não vê resultado público da sessão anterior', '0',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select count(*)::text from public.vtt_roll_results
		where roll_id = (select pg_temp.safe_uuid(v) from _ids where k = 'normal')$q$
	);

insert into _res (cenario, esperado, obtido)
select 'mestre ainda vê o histórico',
	(select v from _ids where k = 'old_n'),
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select count(*)::text from public.vtt_rolls
		where session_id = (select pg_temp.safe_uuid(v) from _ids where k = 's1')$q$
	);

insert into _ids (k, v) values (
	's3',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000a1',
		$q$select public.start_feed_session('20000000-0000-0000-0000-0000000000a1')::text$q$
	)
);
insert into _res (cenario, esperado, obtido)
select 'mestre abre outra sessão', 'ok',
	case
		when pg_temp.is_uuid((select v from _ids where k = 's3'))
			and (select v from _ids where k = 's3') <> (select v from _ids where k = 's2')
		then 'ok'
		else 'falhou'
	end;

insert into _ids (k, v) values (
	'chat_new',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.post_table_message(
			'20000000-0000-0000-0000-0000000000a1', null, 'só a sessão nova', null
		)::text$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'jogador só vê o que entrou na sessão nova',
	'1',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select count(*)::text from public.vtt_rolls$q$
	)
);

insert into _res (cenario, esperado, obtido)
select 'a mensagem nova está na sessão corrente, não na anterior', 'ok',
	case
		when (select session_id::text from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'chat_new'))
			= (select current_feed_session_id::text from public.campaigns
				where id = '20000000-0000-0000-0000-0000000000a1')
			and (select session_id::text from public.vtt_rolls where id = (select pg_temp.safe_uuid(v) from _ids where k = 'chat_new'))
				<> (select v from _ids where k = 's1')
		then 'ok'
		else 'falhou'
	end;

insert into _res (cenario, esperado, obtido)
select 'linhas antigas continuam no banco',
	(select v from _ids where k = 'old_n'),
	(select count(*)::text from public.vtt_rolls
		where session_id = (select pg_temp.safe_uuid(v) from _ids where k = 's1'));

insert into _res (cenario, esperado, obtido) values (
	'mestre não aponta o feed de volta no UPDATE',
	'negado',
	pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$update public.campaigns
		set current_feed_session_id = (select pg_temp.safe_uuid(v) from _ids where k = 's1')
		where id = '20000000-0000-0000-0000-0000000000a1'$q$
	)
);

insert into _res (cenario, esperado, obtido)
select 'ponteiro não voltou para a sessão anterior', 'ok',
	case
		when (select current_feed_session_id::text from public.campaigns
			where id = '20000000-0000-0000-0000-0000000000a1')
			<> (select v from _ids where k = 's1')
		then 'ok'
		else 'falhou'
	end;

insert into _res (cenario, esperado, obtido) values (
	'mestre ainda renomeia a campanha',
	'permitido',
	pg_temp.as_user(
		'00000000-0000-0000-0000-0000000000a1',
		$q$update public.campaigns set name = 'Campanha A2'
		where id = '20000000-0000-0000-0000-0000000000a1'$q$
	)
);

insert into _res (cenario, esperado, obtido)
select 'feed público não tem coluna de total nem details', '0',
	(select count(*)::text from information_schema.columns
		where table_schema = 'public' and table_name = 'vtt_rolls'
			and column_name in ('total', 'details'));

insert into _res (cenario, esperado, obtido)
select 'realtime publica só vtt_rolls', '1',
	(select count(*)::text from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'vtt_rolls');

insert into _res (cenario, esperado, obtido)
select 'realtime não publica o resultado', '0',
	(select count(*)::text from pg_publication_tables
		where pubname = 'supabase_realtime' and schemaname = 'public'
			and tablename in ('vtt_roll_results', 'vtt_feed_sessions'));

insert into _res (cenario, esperado, obtido)
select 'policies sem using true', '0',
	(select count(*)::text from pg_policies
		where schemaname = 'public'
			and tablename in ('vtt_rolls', 'vtt_roll_results', 'vtt_feed_sessions')
			and (qual = 'true' or with_check = 'true'));

insert into _res (cenario, esperado, obtido)
select 'sem policy de escrita no feed, no resultado ou na sessão', '0',
	(select count(*)::text from pg_policies
		where schemaname = 'public'
			and tablename in ('vtt_rolls', 'vtt_roll_results', 'vtt_feed_sessions')
			and cmd <> 'SELECT');

insert into _res (cenario, esperado, obtido)
select 'RLS ligada nas três tabelas', '3',
	(select count(*)::text from pg_class c
		join pg_namespace n on n.oid = c.relnamespace
		where n.nspname = 'public'
			and c.relname in ('vtt_rolls', 'vtt_roll_results', 'vtt_feed_sessions')
			and c.relrowsecurity);

insert into _res (cenario, esperado, obtido)
select 'authenticated não insere nem apaga o feed', 'false',
	(
		has_table_privilege('authenticated', 'public.vtt_rolls', 'insert')
		or has_table_privilege('authenticated', 'public.vtt_rolls', 'update')
		or has_table_privilege('authenticated', 'public.vtt_rolls', 'delete')
		or has_table_privilege('authenticated', 'public.vtt_roll_results', 'insert')
		or has_table_privilege('authenticated', 'public.vtt_roll_results', 'update')
		or has_table_privilege('authenticated', 'public.vtt_roll_results', 'delete')
		or has_table_privilege('anon', 'public.vtt_rolls', 'select')
	)::text;

insert into _ids (k, v) values (
	'pointer',
	(select current_feed_session_id::text from public.campaigns
		where id = '20000000-0000-0000-0000-0000000000a1')
);

insert into _res (cenario, esperado, obtido) values (
	'jogador não executa o parser interno',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.parse_dice_formula('1d20')::text$q$
	)
);

insert into _res (cenario, esperado, obtido) values (
	'jogador não abre sessão pelo helper interno',
	'negado',
	pg_temp.as_user_text(
		'00000000-0000-0000-0000-0000000000f1',
		$q$select public.vtt_open_feed_session(
			'20000000-0000-0000-0000-0000000000a1',
			'00000000-0000-0000-0000-0000000000f1',
			true
		)::text$q$
	)
);

insert into _res (cenario, esperado, obtido)
select 'helper interno não mudou o ponteiro',
	(select v from _ids where k = 'pointer'),
	(select current_feed_session_id::text from public.campaigns
		where id = '20000000-0000-0000-0000-0000000000a1');

create function pg_temp.try_delete_b()
returns text language plpgsql as $f$
begin
	delete from public.campaigns where id = '20000000-0000-0000-0000-0000000000b1';
	if exists (select 1 from public.vtt_rolls where campaign_id = '20000000-0000-0000-0000-0000000000b1')
		or exists (select 1 from public.vtt_feed_sessions where campaign_id = '20000000-0000-0000-0000-0000000000b1') then
		return 'sobrou';
	end if;
	return 'ok';
exception when others then
	return 'negado (' || sqlstate || ': ' || sqlerrm || ')';
end $f$;

insert into _res (cenario, esperado, obtido)
select 'apagar a campanha não trava no ponteiro da sessão', 'ok', pg_temp.try_delete_b();

select n, cenario, esperado, obtido,
	case
		when obtido is not null and obtido like esperado || '%' then 'ok'
		else 'FALHOU'
	end as status
from _res
order by n;

do $$
begin
	if exists (
		select 1 from _res
		where obtido is null or obtido not like esperado || '%'
	) then
		raise exception '0052: há cenário que falhou';
	end if;
	raise notice '0052: todos os cenários passaram';
end $$;

rollback;
