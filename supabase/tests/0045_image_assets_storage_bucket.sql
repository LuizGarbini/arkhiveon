-- Teste da migration 0045 + regra de acesso da Edge Function `image-r2` (sign).
--
-- RODAR SÓ EM POSTGRES LOCAL/DESCARTÁVEL. Tudo numa transação com ROLLBACK.
-- Pré-requisito: migrations até a 0045 aplicadas.
-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0045_image_assets_storage_bucket.sql
-- Saída: tabela cenário/esperado/obtido e "0045: todos os cenários passaram".
--
-- A `image-r2` lê `image_assets` com o JWT do usuário e só assina linhas com
-- storage_bucket = 'private' e storage_key preenchida. Os cenários 1–8 rodam
-- exatamente esse SELECT como cada usuário.

begin;

do $$
begin
	if exists (select 1 from public.characters limit 1) then
		raise exception 'Banco tem fichas: rode este teste só em Postgres descartável.';
	end if;
end $$;

-- OA dono da campanha A, GM co-mestre (owner) de A, ED editor de A,
-- VA jogador de A, PB jogador da campanha B (mesmo dono de A, outro mundo).
insert into auth.users (id, email) values
	('00000000-0000-0000-0000-0000000000a1', 'oa@teste.local'),
	('00000000-0000-0000-0000-0000000000a2', 'gm@teste.local'),
	('00000000-0000-0000-0000-0000000000e1', 'ed@teste.local'),
	('00000000-0000-0000-0000-0000000000f1', 'va@teste.local'),
	('00000000-0000-0000-0000-0000000000b2', 'pb@teste.local');

insert into public.worlds (id, owner_user_id, name) values
	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A'),
	('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Mundo B');

insert into public.campaigns (id, owner_id, name, world_id, member_limit) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Campanha A', '10000000-0000-0000-0000-0000000000a1', 20),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Campanha B', '10000000-0000-0000-0000-0000000000b1', 20);

insert into public.memberships (campaign_id, user_id, role) values
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 'owner'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'editor'),
	('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000f1', 'viewer'),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
	('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'viewer')
on conflict do nothing;

-- Linhas como postgres (o "servidor": R2/R5 é que gravam 'private').
insert into public.image_assets (id, campaign_id, created_by, name, url, storage_key, storage_bucket, is_private) values
	('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'privada', '',
	 '00000000-0000-0000-0000-0000000000a1/npcs/1760000000000-11111111-1111-4111-8111-111111111111.webp', 'private', true),
	('a0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'publica',
	 'https://pub.test/00000000-0000-0000-0000-0000000000a1/1760000000001-22222222-2222-4222-8222-222222222222.webp',
	 '00000000-0000-0000-0000-0000000000a1/1760000000001-22222222-2222-4222-8222-222222222222.webp', 'public', false);

create temp table _res (n int, cenario text, esperado text, obtido text);
grant all on _res to authenticated, anon;

create function pg_temp.as_user(p_uid text, p_sql text)
returns text language plpgsql as $f$
declare v text; n bigint;
begin
	begin
		if p_uid is null then
			perform set_config('request.jwt.claims', '{"role":"anon"}', true);
			perform set_config('role', 'anon', true);
		else
			perform set_config('request.jwt.claims',
				json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
			perform set_config('role', 'authenticated', true);
		end if;
		execute p_sql into v;
		get diagnostics n = row_count;
		raise exception using errcode = 'P0099',
			message = case when n = 0 then 'bloqueado' else 'ok:' || coalesce(v, '') end;
	exception
		when sqlstate 'P0099' then
			perform set_config('role', 'postgres', true);
			return sqlerrm;
		when others then
			perform set_config('role', 'postgres', true);
			return 'bloqueado';
	end;
end $f$;

-- O mesmo SELECT da image-r2 (o que volta é o que recebe URL assinada).
create function pg_temp.sign_sql(p_ids text)
returns text language sql as $f$
	select format($q$
		select coalesce(string_agg(name, ',' order by name), '') from public.image_assets
		where id = any(%L::uuid[]) and storage_bucket = 'private' and storage_key is not null
		having count(*) > 0
	$q$, p_ids)
$f$;

insert into _res values
(1, 'anon pede a privada', 'bloqueado', pg_temp.as_user(null,
	pg_temp.sign_sql('{a0000000-0000-0000-0000-000000000001}'))),
(2, 'jogador da campanha B (mesmo dono) pede a privada de A', 'bloqueado', pg_temp.as_user('00000000-0000-0000-0000-0000000000b2',
	pg_temp.sign_sql('{a0000000-0000-0000-0000-000000000001}'))),
(3, 'viewer de A pede a privada', 'bloqueado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	pg_temp.sign_sql('{a0000000-0000-0000-0000-000000000001}'))),
(4, 'editor de A pede a privada', 'bloqueado', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1',
	pg_temp.sign_sql('{a0000000-0000-0000-0000-000000000001}'))),
(5, 'dono de A pede a privada', 'ok:privada', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	pg_temp.sign_sql('{a0000000-0000-0000-0000-000000000001}'))),
(6, 'GM (co-mestre owner) de A pede a privada', 'ok:privada', pg_temp.as_user('00000000-0000-0000-0000-0000000000a2',
	pg_temp.sign_sql('{a0000000-0000-0000-0000-000000000001}'))),
(7, 'viewer de A pede a pública (fica com a url pública, sem assinatura)', 'bloqueado', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	pg_temp.sign_sql('{a0000000-0000-0000-0000-000000000002}'))),
(8, 'dono pede id inexistente (= resposta do negado)', 'bloqueado', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	pg_temp.sign_sql('{a0000000-0000-0000-0000-0000000000ff}')));

-- Membro continua vendo a linha pública (url) pelo RLS de sempre.
insert into _res values
(9, 'viewer de A lê a linha pública (url)', 'ok:publica', pg_temp.as_user('00000000-0000-0000-0000-0000000000f1',
	$q$select name from public.image_assets where id = 'a0000000-0000-0000-0000-000000000002'$q$));

-- Trigger: cliente não escolhe o bucket.
insert into _res values
(10, 'editor insere asset já como private', 'bloqueado', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1',
	$q$insert into public.image_assets (campaign_id, created_by, name, url, storage_bucket, is_private)
	   values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'x', 'https://pub.test/x.webp', 'private', false)
	   returning storage_bucket$q$)),
(11, 'editor insere asset público (default)', 'ok:public', pg_temp.as_user('00000000-0000-0000-0000-0000000000e1',
	$q$insert into public.image_assets (campaign_id, created_by, name, url, is_private)
	   values ('20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', 'y', 'https://pub.test/y.webp', false)
	   returning storage_bucket$q$)),
(12, 'dono troca storage_bucket da pública para private', 'bloqueado', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$update public.image_assets set storage_bucket = 'private' where id = 'a0000000-0000-0000-0000-000000000002' returning storage_bucket$q$)),
(13, 'dono renomeia a privada (bucket intacto)', 'ok:private', pg_temp.as_user('00000000-0000-0000-0000-0000000000a1',
	$q$update public.image_assets set name = 'renomeada' where id = 'a0000000-0000-0000-0000-000000000001' returning storage_bucket$q$));

-- Servidor (sem auth.uid(), como service role / script R5) pode mover.
do $$
begin
	update public.image_assets set storage_bucket = 'private'
	where id = 'a0000000-0000-0000-0000-000000000002';
	insert into _res values (14, 'servidor (sem JWT) move para private', 'ok', 'ok');
exception when others then
	insert into _res values (14, 'servidor (sem JWT) move para private', 'ok', 'bloqueado');
end $$;

do $$
begin
	update public.image_assets set storage_bucket = 'outro'
	where id = 'a0000000-0000-0000-0000-000000000002';
	insert into _res values (15, 'valor fora de public/private', 'bloqueado', 'ok');
exception when check_violation then
	insert into _res values (15, 'valor fora de public/private', 'bloqueado', 'bloqueado');
end $$;

select n, cenario, esperado, obtido,
	case when esperado = obtido then 'ok' else 'FALHOU' end as resultado
from _res order by n;

do $$
declare v int;
begin
	select count(*) into v from _res where esperado <> obtido;
	if v > 0 then
		raise exception '0045: % cenário(s) falharam', v;
	end if;
	raise notice '0045: todos os cenários passaram';
end $$;

rollback;
