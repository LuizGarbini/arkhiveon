-- 0059: contrato de ownership, autorização e criação de campanha.

-- SOMENTE Postgres local descartável arkhiveon. Transação termina em ROLLBACK.

-- Pré-requisito: migrations até 0059. Não aponta para staging/produção.

-- Uso: psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/0059_transfer_campaign_ownership.test.sql

--

-- Cada request varia JWT e role de cliente e explicitamente exige sucesso ou negação;

-- asserts pós-transação cobrem papéis, owner_id, grants e contexto privado.



-- 0059: prova local de duas contas e autorização de transferência de mestre.

-- SOMENTE Docker descartável arkhiveon. Esta transação faz ROLLBACK.

begin;

do $$

begin

 if coalesce(inet_server_addr(),'127.0.0.1'::inet) <> '127.0.0.1'::inet or inet_server_port() <> 5432 or current_database() <> 'postgres' or exists(select 1 from public.characters limit 1) then

  raise exception '0059: teste exige localhost arkhiveon, DB postgres vazio; remoto TCP recusado';

 end if;

end $$;

do $$ begin if exists(select 1 from auth.users where id::text like '00000000-0000-0000-0000-0000000000%') then raise exception 'IDs sintéticos repetidos: use banco local vazio'; end if; end $$;

insert into auth.users(id,email) values

	('00000000-0000-0000-0000-0000000000a1', 'owner-a@f1.local'),

	('00000000-0000-0000-0000-0000000000e1', 'editor-a@f1.local'),

	('00000000-0000-0000-0000-0000000000f1', 'viewer-a@f1.local'),

	('00000000-0000-0000-0000-0000000000c1', 'outsider@f1.local'),

	('00000000-0000-0000-0000-0000000000b1', 'owner-b@f1.local'),

	('00000000-0000-0000-0000-0000000000d1', 'new-owner@f1.local');

insert into auth.identities(user_id,id,provider,provider_id,identity_data,last_sign_in_at,created_at,updated_at)

select id,id,'email',id::text,'{}'::jsonb,now(),now(),now() from auth.users;

insert into public.worlds(id,owner_user_id,name) values

	('10000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a1', 'Mundo A'),

	('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b1', 'Mundo B'),

	('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c1', 'Mundo C');

insert into public.campaigns(id,owner_id,name,world_id) values

	('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Campanha A','10000000-0000-0000-0000-0000000000a1'),

	('20000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b1','Campanha B','10000000-0000-0000-0000-0000000000b1');

insert into public.memberships(campaign_id,user_id,role) values

	('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1','editor'),

	('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1','viewer');





create temp table _expect(n integer primary key, description text, allowed boolean, value text);

create temp table _actual(n integer, state text, message text, value text);

insert into _expect values

(1,'Conta A transfere a editor da campanha',true,'1'),

(2,'Ex-owner não transfere depois do handoff',false,null),

(3,'Conta B transfere a viewer da campanha',true,'1'),

(4,'Editor não-owner é recusado',false,null),

(5,'Outsider com UUID conhecido é recusado',false,null),

(6,'Mestre de outra campanha é recusado',false,null),

(7,'Alvo só membro de outra campanha é recusado',false,null),

(8,'Alvo inexistente não vira membro',false,null),

(9,'Anon não executa RPC',false,null),

(10,'Self-transfer é sucesso no-op, uma row',true,'1'),

(11,'Owner não muda campaigns.owner_id direto',false,null),

(12,'Owner não cria owner por INSERT',false,null),

(13,'Owner não cria owner por UPDATE',false,null),

(14,'Owner não faz self-leave',false,null),

(15,'Owner ainda muda nome permitido',true,'Nome editado'),

(16,'Owner ainda altera editor/viewer',true,'editor'),

(17,'GUC forjado não vira autorização',false,null),

(18,'Aceite de invite só cria viewer',true,'accepted'),

(19,'Convite não rebaixa membership pré-existente',true,'accepted'),

(20,'Invite role owner é recusado pela CHECK',false,null),

(21,'Nova campanha cria único owner pelo trigger',true,'20000000-0000-0000-0000-0000000000c1'),

(22,'Retry de criação com conflict não duplica owner',true,null),

(23,'Client futuro skip owner insert mantém owner',true,'20000000-0000-0000-0000-0000000000c2'),

(24,'Owner estrangeiro não usa caminho inicial p/ nova conta',false,null),

(25,'Join por link não rebaixa membership owner',true,'owner'),

(26,'Owner pode remover member não-root',true,null),

(27,'Member não-owner pode sair',true,null),

(28,'Retry inicial sem ON CONFLICT é no-op e mantém invariante',true,null),

(29,'Helper interno não é executável por cliente',false,null),

(30,'Aceitar outro convite cria somente viewer na outra campanha',true,'accepted');



create function pg_temp.request(p_n integer, p_uid text, p_email text, p_sql text)

returns void language plpgsql security invoker as $f$

declare expected_allowed boolean; expected_state text; expected_value text;

    value text; rows_affected bigint;

begin

 select e.allowed, coalesce(e.value,'∅') into expected_allowed,expected_value from _expect e where e.n=p_n;

 perform set_config('request.jwt.claims',case when p_uid is null then '{"role":"anon"}' else json_build_object('sub',p_uid,'email',p_email,'role','authenticated')::text end,true);

 perform set_config('request.jwt.claim.sub',coalesce(p_uid,''),true);

 execute format('set local role %I',case when p_uid is null then 'anon' else 'authenticated' end);

 perform set_config('request.jwt.claim.sub',coalesce(p_uid,''),true);

 begin

  execute p_sql into value;

  get diagnostics rows_affected=row_count;

  reset role;

  insert into _actual values(p_n,'PERMITIDO',null,coalesce(value,'∅'));

  if not expected_allowed then raise exception '0059: caso % deveria ser negado',p_n; end if;

 exception when others then

  reset role;

  if SQLSTATE='P0001' and SQLERRM like '0059: caso %' then raise; end if;

  insert into _actual values(p_n,SQLSTATE,SQLERRM,coalesce(value,'∅'));

  if expected_allowed then raise exception '0059: caso % falhou (%): %',p_n,SQLSTATE,SQLERRM; end if;

 end;

end $f$;



select pg_temp.request(1,'00000000-0000-0000-0000-0000000000a1','owner-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1')$q$);

select pg_temp.request(2,'00000000-0000-0000-0000-0000000000a1','owner-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1')$q$);

select pg_temp.request(3,'00000000-0000-0000-0000-0000000000e1','editor-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1')$q$);

select pg_temp.request(4,'00000000-0000-0000-0000-0000000000e1','editor-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1')$q$);

select pg_temp.request(5,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1')$q$);

select pg_temp.request(6,'00000000-0000-0000-0000-0000000000b1','owner-b@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1')$q$);

select pg_temp.request(7,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1')$q$);

select pg_temp.request(8,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000d1')$q$);

select pg_temp.request(9,null,null,$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1')$q$);

select pg_temp.request(10,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1')$q$);

select pg_temp.request(11,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.campaigns set owner_id='00000000-0000-0000-0000-0000000000a1' where id='20000000-0000-0000-0000-0000000000a1' returning owner_id::text$q$);

select pg_temp.request(12,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','owner') returning role$q$);

select pg_temp.request(13,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.memberships set role='owner' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e1' returning role$q$);

select pg_temp.request(14,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$delete from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000f1' returning id::text$q$);

select pg_temp.request(15,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.campaigns set name='Nome editado' where id='20000000-0000-0000-0000-0000000000a1' returning name$q$);

select pg_temp.request(16,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.memberships set role='editor' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e1' returning role$q$);

-- Forged operation marker alone cannot grant owner role.



select set_config('arkhiveon.ownership_operation_id',gen_random_uuid()::text,true);

select pg_temp.request(17,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.memberships set role='owner' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e1' returning role$q$);

insert into public.invites(id,campaign_id,email,role,status,invited_by) values

 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','outsider@f1.local','viewer','pending','00000000-0000-0000-0000-0000000000f1'),

 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-0000000000a1','owner-a@f1.local','viewer','pending','00000000-0000-0000-0000-0000000000f1'),

 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-0000000000b1','outsider@f1.local','viewer','pending','00000000-0000-0000-0000-0000000000b1');

select pg_temp.request(18,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$update public.invites set status='accepted' where id='30000000-0000-0000-0000-000000000001' returning status$q$);

select pg_temp.request(19,'00000000-0000-0000-0000-0000000000a1','owner-a@f1.local',$q$update public.invites set status='accepted' where id='30000000-0000-0000-0000-000000000002' returning status$q$);

select pg_temp.request(20,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$insert into public.invites(campaign_id,email,role,invited_by) values('20000000-0000-0000-0000-0000000000a1','outsider@f1.local','owner','00000000-0000-0000-0000-0000000000f1') returning role$q$);

select pg_temp.request(21,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.campaigns(id,owner_id,name,world_id) values('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','Criada autenticada','10000000-0000-0000-0000-0000000000c1') returning id::text$q$);

select pg_temp.request(22,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','owner') on conflict (campaign_id,user_id) do nothing returning role$q$);

select pg_temp.request(23,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.campaigns(id,owner_id,name,world_id) values('20000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c1','Criada F2','10000000-0000-0000-0000-0000000000c1') returning id::text$q$);

select pg_temp.request(24,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d1','owner') on conflict (campaign_id,user_id) do nothing returning role$q$);

select pg_temp.request(25,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$select role from public.join_campaign_via_link('20000000-0000-0000-0000-0000000000a1')$q$);

select pg_temp.request(26,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$delete from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000b1' and user_id='00000000-0000-0000-0000-0000000000c1' returning id::text$q$);

do $$ begin if not exists(select 1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000c1' and role='viewer') then raise exception 'Invite não criou viewer'; end if; end $$;

select pg_temp.request(27,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$delete from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000c1' returning id::text$q$);

do $$ begin if exists(select 1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000c1' and role='viewer') then raise exception 'Viewer deveria ter saído'; end if; end $$;

select pg_temp.request(28,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','owner') returning role$q$);

select pg_temp.request(29,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$select private.can_repeat_initial_owner('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d1')::text$q$);





select pg_temp.request(30,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$update public.invites set status='accepted' where id='30000000-0000-0000-0000-000000000003' returning status$q$);



create temp table _assertions(n integer, description text, passed boolean);

insert into _assertions
select 1,'Owner antigo é editor',exists(select 1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000a1' and role='editor')
union all select 2,'Owner da campanha agora é B',owner_id='00000000-0000-0000-0000-0000000000f1' from public.campaigns where id='20000000-0000-0000-0000-0000000000a1'
union all select 3,'Alvo inexistente não entrou',not exists(select 1 from public.memberships where user_id='00000000-0000-0000-0000-0000000000d1')
union all select 4,'Campanha do outsider mantém owner',owner_id='00000000-0000-0000-0000-0000000000b1' from public.campaigns where id='20000000-0000-0000-0000-0000000000b1'
union all select 5,'Todas campanhas consistentes',not exists(select c.id from public.campaigns c left join public.memberships m on m.campaign_id=c.id group by c.id,c.owner_id having count(*) filter(where m.role='owner')<>1 or count(*) filter(where m.role='owner' and m.user_id=c.owner_id)<>1)
union all select 6,'Após tentativas não autorizadas B continua owner',owner_id='00000000-0000-0000-0000-0000000000f1' from public.campaigns where id='20000000-0000-0000-0000-0000000000a1'
union all select 7,'Nome válido editado',name='Nome editado' from public.campaigns where id='20000000-0000-0000-0000-0000000000a1'
union all select 8,'Convite da conta outsider era só viewer',exists(select 1 from public.invites i join public.memberships m on m.campaign_id=i.campaign_id and m.user_id='00000000-0000-0000-0000-0000000000f1' where i.id='30000000-0000-0000-0000-000000000001' and m.role='owner')
union all select 9,'Convite não demoveu ex-owner editor',role='editor' from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000a1'
union all select 10,'Clientes não podem usar schema privado',not has_schema_privilege('authenticated','private','usage') and not has_schema_privilege('anon','private','usage')
union all select 11,'RPC só autenticado',has_function_privilege('authenticated','public.transfer_campaign_ownership(uuid,uuid)','execute') and not has_function_privilege('anon','public.transfer_campaign_ownership(uuid,uuid)','execute') and not has_function_privilege('public','public.transfer_campaign_ownership(uuid,uuid)','execute')
union all select 12,'Grant owner_id revogado sem perder metadata',has_column_privilege('authenticated','public.campaigns','name','update') and not has_column_privilege('authenticated','public.campaigns','owner_id','update')
union all select 13,'Membership update fica só coluna role',has_column_privilege('authenticated','public.memberships','role','update') and not has_table_privilege('authenticated','public.memberships','update')
union all select 14,'RPC e helpers usam defs e search paths aprovados',exists(select 1 from pg_proc where oid='public.transfer_campaign_ownership(uuid,uuid)'::regprocedure and prosecdef and proconfig=array['search_path=public']) and exists(select 1 from pg_proc where oid='private.guard_campaign_owner_membership()'::regprocedure and prosecdef and proconfig=array['search_path=""'])
union all select 15,'Nenhuma autorização privada pendente',not exists(select 1 from private.campaign_ownership_operations)
union all select 16,'Criação normal tem uma membership owner',count(*)=1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000c1' and role='owner'
union all select 17,'Futuro client F2 preserva um owner sem INSERT redundante',count(*)=1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000c2' and role='owner'
union all select 18,'Viewer saiu sem rebaixar owner',not exists(select 1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000c1')
union all select 19,'Nenhum fluxo insert/update direto produziu owner extra',count(*)=1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and role='owner'
union all select 20,'Convite já aceito preserva papel do membro',status='accepted' from public.invites where id='30000000-0000-0000-0000-000000000002'
union all select 21,'O aceite junta só viewer sem mudar owner da outra campanha',owner_id='00000000-0000-0000-0000-0000000000b1' from public.campaigns where id='20000000-0000-0000-0000-0000000000b1';

select e.n,e.description,coalesce(a.state,'SEM RESULTADO') as estado,a.message as mensagem,

case when a.n is not null and e.allowed=(a.state='PERMITIDO') and (not e.allowed or e.value is null or a.value=e.value) then 'ok' else 'FALHOU' end as resultado

from _expect e left join _actual a using(n) order by e.n;

select n,description,case when passed then 'ok' else 'FALHOU' end as estado_final from _assertions order by n;

do $$ declare failures integer;

begin

 select count(*) into failures from _expect e join _actual a using(n) where e.allowed<>(a.state='PERMITIDO') or (e.allowed and e.value is not null and e.value<>a.value);

 failures:=failures+(select count(*) from _assertions where not passed) + (select 30-(select count(*) from _actual));

 if failures<>0 or (select count(*) from (select n from _actual except select n from _expect union select n from _expect except select n from _actual)x)>0 then raise exception '0059: % provas falharam',failures;end if;

 raise notice '0059: todos os 30 comportamentos e 21 invariantes passaram';

end $$;

rollback;
