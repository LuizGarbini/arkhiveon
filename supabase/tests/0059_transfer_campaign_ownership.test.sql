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

	('00000000-0000-0000-0000-0000000000d1', 'new-owner@f1.local'),
	('00000000-0000-0000-0000-0000000000e8', 'nonowner-editor@f1.local'),
	('00000000-0000-0000-0000-0000000000b7', 'other-campaign-member@f1.local');

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

	('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1','viewer'),
	('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e8','editor'),
	('20000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000b7','viewer');





create temp table _expect(n integer primary key, description text, allowed boolean, value text, expected_state text, expected_message text);
create temp table _actual(n integer primary key, state text, message text, value text, db_role text, jwt_uid uuid);
insert into _expect(n,description,allowed,value,expected_state,expected_message) values
(1,'A transfere a editor',true,'1','00000',null),
(2,'Ex-owner não transfere',false,null,'42501','transferência de mestre não permitida'),
(3,'Conta B transfere a viewer',true,'1','00000',null),
(4,'Editor realmente não-owner é recusado',false,null,'42501','transferência de mestre não permitida'),
(5,'Outsider real é recusado',false,null,'42501','transferência de mestre não permitida'),
(6,'Mestre outra campanha é recusado',false,null,'42501','transferência de mestre não permitida'),
(7,'Caller não-owner alvo campanha alheia',false,null,'42501','transferência de mestre não permitida'),
(8,'Alvo inexistente com caller não-owner',false,null,'42501','transferência de mestre não permitida'),
(9,'Anon não executa RPC',false,null,'42501','permission denied for function transfer_campaign_ownership'),
(10,'Self-transfer consistente uma row',true,'1','00000',null),
(11,'Owner não muda campaigns.owner_id',false,null,'42501','permission denied for table campaigns'),
(12,'Owner não cria owner por INSERT',false,null,'42501','transferência de mestre não permitida'),
(13,'Owner não cria owner por UPDATE',false,null,'42501','transferência de mestre não permitida'),
(14,'Owner não self-leave',false,null,'42501','transferência de mestre não permitida'),
(15,'Owner muda nome permitido',true,'Nome editado','00000',null),
(16,'Owner altera editor/viewer',true,'editor','00000',null),
(17,'GUC forjado não autoriza',false,null,'42501','transferência de mestre não permitida'),
(18,'C aceita e se torna viewer',true,'accepted','00000',null),
(19,'Ex-owner editor aceita e não é rebaixado',true,'accepted','00000',null),
(20,'Invite role owner negado pela CHECK',false,null,'23514','new row for relation "invites" violates check constraint "invites_role_check"'),
(21,'Nova campanha cria único owner',true,'20000000-0000-0000-0000-0000000000c1','00000',null),
(22,'Retry inicial com conflito zero-write',true,'∅','00000',null),
(23,'Client F2 preserva owner',true,'20000000-0000-0000-0000-0000000000c2','00000',null),
(24,'Owner estrangeiro não inicializa owner',false,null,'42501','transferência de mestre não permitida'),
(25,'Join não rebaixa owner',true,'owner','00000',null),
(26,'Owner remove não-root',true,null,'00000',null),
(27,'Non-owner sai',true,null,'00000',null),
(28,'Retry trigger retorna 0 writes sem conflito',true,'0','00000',null),
(29,'Helper existente privado negado',false,null,'42501','permission denied for schema private'),
(30,'Outro convite cria somente viewer',true,'accepted','00000',null),
(31,'Accept de owner não promove nem demove',true,'accepted','00000',null),
(32,'Self editor com campaigns.owner_id=A exige invariante',false,null,'23514','ownership invariant violated'),
(33,'Self viewer com owner membership diferente exige invariante',false,null,'23514','ownership invariant violated');

create function pg_temp.request(p_n integer, p_uid text, p_email text, p_sql text)
returns void language plpgsql security invoker as $f$
declare value text; rows_affected bigint; expected_allowed boolean; actual_role text; actual_uid uuid; target_role text; target_claims text;
begin
 select e.allowed into expected_allowed from _expect e where e.n=p_n;
 target_role:=case when p_uid is null then 'anon' else 'authenticated' end;
 target_claims:=case when p_uid is null then '{"role":"anon"}' else json_build_object('sub',p_uid,'email',p_email,'role','authenticated')::text end;
 perform set_config('request.jwt.claims',target_claims,true);
 perform set_config('request.jwt.claim.sub',coalesce(p_uid,''),true);
 execute format('set local role %I',target_role);
 begin
  actual_role:=current_user; actual_uid:=auth.uid();
  if actual_uid::text is distinct from p_uid or actual_role<>target_role then
   raise exception 'ERRTESTASSERT: wrong JWT/role for %',p_n;
  end if;
  execute p_sql into value;
  get diagnostics rows_affected=row_count;
  if p_n=28 then value:=rows_affected::text; end if;
  if p_n in (22,28) and rows_affected<>0 then raise exception 'ERRTESTASSERT: compatibility writes %',p_n; end if;
  reset role;
  if not expected_allowed then raise exception 'ERRTESTASSERT: case % should deny',p_n; end if;
  insert into _actual values(p_n,'00000',null,coalesce(value,'∅'),actual_role,actual_uid);
 exception when others then
  reset role;
  if SQLSTATE='P0001' and SQLERRM like 'ERRTESTASSERT:%' then raise; end if;
  if expected_allowed then raise exception 'ERRTESTASSERT: case % allowed failed: %/%',p_n,SQLSTATE,SQLERRM; end if;
  insert into _actual values(p_n,SQLSTATE,SQLERRM,coalesce(value,'∅'),actual_role,actual_uid);
 end;
 reset role;
end $f$;

-- Fixture pós-deploy somente: o trigger é restaurado antes de chamar request JWT.
alter table public.memberships disable trigger campaigns_guard_owner_membership;
update public.memberships set role='editor' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000a1';
alter table public.memberships enable trigger campaigns_guard_owner_membership;
select pg_temp.request(32,'00000000-0000-0000-0000-0000000000a1','owner-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1')$q$);
alter table public.memberships disable trigger campaigns_guard_owner_membership;
update public.memberships set role='viewer' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000a1';
update public.memberships set role='owner' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e1';
alter table public.memberships enable trigger campaigns_guard_owner_membership;
select pg_temp.request(33,'00000000-0000-0000-0000-0000000000a1','owner-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1')$q$);
alter table public.memberships disable trigger campaigns_guard_owner_membership;
update public.memberships set role='editor' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e1';
update public.memberships set role='owner' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000a1';
alter table public.memberships enable trigger campaigns_guard_owner_membership;

select pg_temp.request(1,'00000000-0000-0000-0000-0000000000a1','owner-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1')$q$);

select pg_temp.request(2,'00000000-0000-0000-0000-0000000000a1','owner-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1')$q$);

select pg_temp.request(3,'00000000-0000-0000-0000-0000000000e1','editor-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1')$q$);

do $$ begin if not exists(select 1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e8' and role='editor') then raise exception 'ERRTESTASSERT: actor 4 is owner/nonmember'; end if; end $$;
select pg_temp.request(4,'00000000-0000-0000-0000-0000000000e8','nonowner-editor@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1')$q$);

do $$ begin if exists(select 1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000c1') then raise exception 'ERRTESTASSERT: case5 already member'; end if; end $$;
select pg_temp.request(5,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1')$q$);

select pg_temp.request(6,'00000000-0000-0000-0000-0000000000b1','owner-b@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1')$q$);

do $$ begin if not exists(select 1 from public.memberships m where m.campaign_id='20000000-0000-0000-0000-0000000000b1' and m.user_id='00000000-0000-0000-0000-0000000000b7' and m.role='viewer') or (select owner_id from public.campaigns where id='20000000-0000-0000-0000-0000000000a1')='00000000-0000-0000-0000-0000000000b7' then raise exception 'ERRTESTASSERT: wrong actor 7'; end if; end $$;
select pg_temp.request(7,'00000000-0000-0000-0000-0000000000b7','other-campaign-member@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1')$q$);

select pg_temp.request(8,'00000000-0000-0000-0000-0000000000b7','other-campaign-member@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000d1')$q$);

select pg_temp.request(9,null,null,$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1')$q$);




select pg_temp.request(10,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$select count(*)::text from public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000f1')$q$);

select pg_temp.request(11,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.campaigns set owner_id='00000000-0000-0000-0000-0000000000a1' where id='20000000-0000-0000-0000-0000000000a1' returning owner_id::text$q$);

select pg_temp.request(12,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000c1','owner') returning role$q$);

select pg_temp.request(13,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.memberships set role='owner' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e1' returning role$q$);

select pg_temp.request(14,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$delete from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000f1' returning id::text$q$);

select pg_temp.request(15,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.campaigns set name='Nome editado' where id='20000000-0000-0000-0000-0000000000a1' returning name$q$);

select pg_temp.request(16,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.memberships set role='editor' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e1' returning role$q$);
create temp table _self_campaign_before as select id,owner_id,updated_at,xmin::text as before_xmin,to_jsonb(c) as row_before from public.campaigns c where id='20000000-0000-0000-0000-0000000000a1';
create temp table _self_members_before as select id,campaign_id,user_id,role,xmin::text as before_xmin,to_jsonb(m) as row_before from public.memberships m where campaign_id='20000000-0000-0000-0000-0000000000a1';
create temp table _self_counts_before as select (select count(*)::bigint from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1') member_count,(select count(*)::bigint from private.campaign_ownership_operations) ledger_count;


-- Forged operation marker alone cannot grant owner role.



select set_config('arkhiveon.ownership_operation_id',gen_random_uuid()::text,true);

select pg_temp.request(17,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$update public.memberships set role='owner' where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000e1' returning role$q$);

insert into public.invites(id,campaign_id,email,role,status,invited_by) values

 ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-0000000000a1','outsider@f1.local','viewer','pending','00000000-0000-0000-0000-0000000000f1'),

 ('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-0000000000a1','owner-a@f1.local','viewer','pending','00000000-0000-0000-0000-0000000000f1'),

 ('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-0000000000b1','outsider@f1.local','viewer','pending','00000000-0000-0000-0000-0000000000b1'),
 ('30000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-0000000000b1','owner-b@f1.local','viewer','pending','00000000-0000-0000-0000-0000000000b1');

select pg_temp.request(18,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$update public.invites set status='accepted' where id='30000000-0000-0000-0000-000000000001' returning status$q$);
create temp table _accepted_recipient as select m.user_id,m.role,m.campaign_id,m.xmin::text as before_xmin from public.memberships m where m.campaign_id='20000000-0000-0000-0000-0000000000a1' and m.user_id='00000000-0000-0000-0000-0000000000c1';
select 'INVITE_RECIPIENT after case18' as proof,* from _accepted_recipient;

select pg_temp.request(19,'00000000-0000-0000-0000-0000000000a1','owner-a@f1.local',$q$update public.invites set status='accepted' where id='30000000-0000-0000-0000-000000000002' returning status$q$);

select pg_temp.request(20,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$insert into public.invites(campaign_id,email,role,invited_by) values('20000000-0000-0000-0000-0000000000a1','outsider@f1.local','owner','00000000-0000-0000-0000-0000000000f1') returning role$q$);

select pg_temp.request(21,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.campaigns(id,owner_id,name,world_id) values('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','Criada autenticada','10000000-0000-0000-0000-0000000000c1') returning id::text$q$);




create temp table _create_campaign_before as select id,owner_id,updated_at,xmin::text as before_xmin,to_jsonb(c) as row_before from public.campaigns c where id='20000000-0000-0000-0000-0000000000c1';
create temp table _create_member_before as select id,campaign_id,user_id,role,xmin::text as before_xmin,to_jsonb(m) as row_before from public.memberships m where campaign_id='20000000-0000-0000-0000-0000000000c1';
create temp table _create_counts_before as select (select count(*)::bigint from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000c1') member_count,(select count(*)::bigint from private.campaign_ownership_operations) ledger_count;
select pg_temp.request(22,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','owner') on conflict (campaign_id,user_id) do nothing returning role$q$);

select pg_temp.request(23,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.campaigns(id,owner_id,name,world_id) values('20000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000c1','Criada F2','10000000-0000-0000-0000-0000000000c1') returning id::text$q$);

select pg_temp.request(24,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d1','owner') on conflict (campaign_id,user_id) do nothing returning role$q$);

select pg_temp.request(25,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$select role from public.join_campaign_via_link('20000000-0000-0000-0000-0000000000a1')$q$);

select pg_temp.request(26,'00000000-0000-0000-0000-0000000000f1','viewer-a@f1.local',$q$delete from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000b1' and user_id='00000000-0000-0000-0000-0000000000c1' returning id::text$q$);

do $$ begin if not exists(select 1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000c1' and role='viewer') then raise exception 'Invite não criou viewer'; end if; end $$;

select pg_temp.request(27,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$delete from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000c1' returning id::text$q$);

do $$ begin if exists(select 1 from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000c1' and role='viewer') then raise exception 'Viewer deveria ter saído'; end if; end $$;

create temp table _initial_retry_before as select (select xmin::text from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000c1') as membership_xmin,(select count(*) from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000c1') as member_count,(select xmin::text from public.campaigns where id='20000000-0000-0000-0000-0000000000c1') as campaign_xmin,(select updated_at from public.campaigns where id='20000000-0000-0000-0000-0000000000c1') campaign_updated_at;
select pg_temp.request(28,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000c1','owner') returning role$q$);

select pg_temp.request(31,'00000000-0000-0000-0000-0000000000b1','owner-b@f1.local',$q$update public.invites set status='accepted' where id='30000000-0000-0000-0000-000000000004' returning status$q$);

select pg_temp.request(29,'00000000-0000-0000-0000-0000000000c1','outsider@f1.local',$q$select private.ensure_campaign_owner_membership('20000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000d1')::text$q$);





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
union all select 8,'Recipiente C1 ficou viewer no aceite e saiu apenas após self-leave',(select role::text from _accepted_recipient where user_id='00000000-0000-0000-0000-0000000000c1')='viewer' and exists(select 1 from public.invites i join public.memberships m on m.campaign_id=i.campaign_id and m.user_id='00000000-0000-0000-0000-0000000000c1' where i.id='30000000-0000-0000-0000-000000000003' and m.role='viewer')
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

select n,description,case when passed then 'ok' else 'FALHOU' end as estado_final from _assertions order by n;
select e.n,e.description,a.state,a.message,a.db_role,a.jwt_uid,a.value,case when a.state=e.expected_state and (a.state='00000' or e.expected_message=a.message) then 'ok' else 'FALHOU' end as exact_denial from _expect e join _actual a using(n) order by e.n;

do $$ begin
 if exists(select 1 from _expect e full join _actual a using(n) where e.n is null or a.n is null or a.state is distinct from e.expected_state or coalesce(a.message,'') is distinct from coalesce(e.expected_message,'') or a.db_role<>case when e.n=9 then 'anon' else 'authenticated' end) then
  raise exception 'ERRTESTASSERT: exact SQLSTATE/message or actual role failed';
 end if;
 if (select count(*) from _actual)<>33 or (select count(*) from _assertions where not passed)>0 or exists(select 1 from _expect e join _actual a using(n) where e.value is not null and a.value<>e.value) then raise exception 'ERRTESTASSERT: request/final state failed'; end if;
end $$;

do $$ begin
 if not exists(select 1 from _accepted_recipient a join public.invites i on i.id='30000000-0000-0000-0000-000000000001' where a.role='viewer' and a.user_id='00000000-0000-0000-0000-0000000000c1' and i.status='accepted') then raise exception 'ERRTESTASSERT: recipient C not viewer/accepted'; end if;
 if (select role from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1' and user_id='00000000-0000-0000-0000-0000000000a1')<>'editor' then raise exception 'ERRTESTASSERT: prior owner acceptance demoted'; end if;
 if (select role from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000b1' and user_id='00000000-0000-0000-0000-0000000000b1')<>'owner'
  or (select owner_id from public.campaigns where id='20000000-0000-0000-0000-0000000000b1')<>'00000000-0000-0000-0000-0000000000b1'
  or (select count(*) from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000b1' and role='owner')<>1 then raise exception 'ERRTESTASSERT: actual owner promoted/demoted by invite'; end if;
end $$;

-- Evidência persistida dos campos comparados; estes SELECTs não são a única asserção.
select 'ZERO_WRITE_SELF' as test,n,value as rpc_rows,state from _actual where n=10;
select 'CAMPAIGN before/after id+updated_at+xmin' as test,b.id,b.owner_id as before_owner,c.owner_id as after_owner,b.updated_at as before_updated_at,c.updated_at as after_updated_at,b.before_xmin,c.xmin::text as after_xmin from _self_campaign_before b join public.campaigns c using(id);
select 'MEMBERS before/after campaign+user+xmin' as test,b.id,b.campaign_id as before_campaign_id,m.campaign_id as after_campaign_id,b.user_id,b.before_xmin,m.xmin::text as after_xmin from _self_members_before b join public.memberships m using(id) order by b.id;
select 'MEMBERS count' as test,(select count(*) from _self_members_before) before_count,(select count(*) from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1') after_count;
select 'RETRY_ROW_COUNTS' as test,n,value,state from _actual where n in (22,28);
select 'RETRY campaign/owner before/after' as test,_initial_retry_before.*,c.xmin::text current_xmin,c.updated_at current_updated_at from _initial_retry_before join public.campaigns c on c.id='20000000-0000-0000-0000-0000000000c1';

do $$ begin
 if not exists(select 1 from _actual where n=10 and state='00000' and value='1' and db_role='authenticated') then raise exception 'ERRTESTASSERT: self success one row/actual authenticated absent'; end if;
 if not exists(select 1 from _self_campaign_before b join public.campaigns c using(id)
  where b.owner_id=c.owner_id and b.updated_at=c.updated_at and b.before_xmin=c.xmin::text and b.row_before=to_jsonb(c)) then raise exception 'ERRTESTASSERT: self campaign write'; end if;
 if (select count(*) from _self_members_before)<>(select count(*) from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000a1') then raise exception 'ERRTESTASSERT: self membership count'; end if;
 if exists(select 1 from public.memberships m where m.campaign_id='20000000-0000-0000-0000-0000000000a1' and not exists(
  select 1 from _self_members_before b where b.id=m.id and b.campaign_id=m.campaign_id and b.user_id=m.user_id and b.role=m.role and b.before_xmin=m.xmin::text and b.row_before=to_jsonb(m)
 )) then raise exception 'ERRTESTASSERT: membership xmin/tuple changed in self window'; end if;
 if (select ledger_count from _self_counts_before)<>(select count(*) from private.campaign_ownership_operations) then raise exception 'ERRTESTASSERT: ledger self write'; end if;
 raise notice 'ZERO_WRITE self: 1 row; campaign updated_at+xmin; membership before/after xmin; counts preserved';
end $$;

do $$ begin
 if (select count(*) from _create_member_before)<>(select count(*) from public.memberships where campaign_id='20000000-0000-0000-0000-0000000000c1') then raise exception 'ERRTESTASSERT: compat member count'; end if;
 if exists(select 1 from public.memberships m where m.campaign_id='20000000-0000-0000-0000-0000000000c1' and not exists(
  select 1 from _create_member_before b where b.id=m.id and b.user_id=m.user_id and b.campaign_id=m.campaign_id and b.role=m.role and b.before_xmin=m.xmin::text and b.row_before=to_jsonb(m)
 )) then raise exception 'ERRTESTASSERT: compat membership xmin/tuple change'; end if;
 if not exists(select 1 from _create_campaign_before b join public.campaigns c using(id)
  where b.owner_id=c.owner_id and b.updated_at=c.updated_at and b.before_xmin=c.xmin::text and b.row_before=to_jsonb(c)) then raise exception 'ERRTESTASSERT: compat campaign write'; end if;
 if (select ledger_count from _create_counts_before)<>(select count(*) from private.campaign_ownership_operations) then raise exception 'ERRTESTASSERT: compat ledger count'; end if;
 if (select value from _actual where n=28)<>'0' or (select value from _actual where n=22)<>'∅' then raise exception 'ERRTESTASSERT: compatibility write count'; end if;
 if not exists(select 1 from _initial_retry_before b join public.memberships m on m.campaign_id='20000000-0000-0000-0000-0000000000c1' join public.campaigns c on c.id=m.campaign_id
  where b.membership_xmin=m.xmin::text and b.campaign_xmin=c.xmin::text and b.campaign_updated_at=c.updated_at and b.member_count=1) then raise exception 'ERRTESTASSERT: immediate retry snapshot mismatch'; end if;
 raise notice 'ZERO_WRITE cases22+28: row_count=0, tuple xmin, complete membership counts and ledger unchanged';
end $$;

do $$ begin raise notice '0059 strict: 33 real JWT/roles, exact SQLSTATE/message and no-op evidence'; end $$;

rollback;
