-- 0059: audit legacy; execute somente após migrations até 0058 num Postgres vazio.

-- O helper contém o bloco de auditoria da migration, sem LIMIT 1 ou reparo.

-- Cada fixture é desfeita; requer stack arkhiveon descartável local, nunca remoto.

begin;

do $$ begin if coalesce(inet_server_addr(),'127.0.0.1'::inet)<>'127.0.0.1'::inet or inet_server_port()<>5432 or exists(select 1 from public.campaigns) then raise exception '0059 legacy: requer Unix socket Docker local vazio';end if;end $$;

create function pg_temp.legacy_audit() returns void language plpgsql as $migration$
declare
	v_bad_count integer;
begin
	select count(*)::integer into v_bad_count
	from (
		select c.id
		from public.campaigns c
		left join public.memberships m on m.campaign_id = c.id
		group by c.id, c.owner_id
		having count(*) filter (where m.role = 'owner') <> 1
			or count(*) filter (
				where m.role = 'owner' and m.user_id = c.owner_id
			) <> 1
	) bad_campaigns;

	if v_bad_count <> 0 then
		raise exception '0059: % campanha(s) com owner membership legado; reparo manual necessário', v_bad_count
			using errcode = '23514';
	end if;

	if not exists (
		select 1
		from pg_catalog.pg_constraint
		where conrelid = 'public.memberships'::regclass
			and contype = 'u'
			and pg_get_constraintdef(pg_constraint.oid) like 'UNIQUE (campaign_id, user_id)%'
	) then
		raise exception '0059: UNIQUE(campaign_id,user_id) ausente; corrigir antes de aplicar'
			using errcode = '23514';
	end if;
end
$migration$;

savepoint fixture;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','legacy-a@f1.local'),('00000000-0000-0000-0000-0000000000b1','legacy-b@f1.local');
insert into public.worlds(id,owner_user_id,name) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Legacy');
insert into public.campaigns(id,owner_id,name,world_id) values ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Legacy','10000000-0000-0000-0000-0000000000a1');

do $$ begin begin perform pg_temp.legacy_audit(); if '23514'<>'00000' then raise exception 'missing: auditoria não recusou legado';end if;exception when check_violation then if SQLSTATE<>'23514' or SQLERRM not like '%reparo manual necessário%' then raise;end if;end; if to_regprocedure('public.transfer_campaign_ownership(uuid,uuid)') is not null or to_regclass('private.campaign_ownership_operations') is not null then raise exception 'missing: auditoria não pode alterar schema';end if;raise NOTICE '0059 legacy missing: estado 23514, Sem owner membership, auditoria correta';end $$;
rollback to fixture;

savepoint fixture;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','legacy-a@f1.local'),('00000000-0000-0000-0000-0000000000b1','legacy-b@f1.local');
insert into public.worlds(id,owner_user_id,name) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Legacy');
insert into public.campaigns(id,owner_id,name,world_id) values ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Legacy','10000000-0000-0000-0000-0000000000a1');

insert into public.memberships(campaign_id,user_id,role) values ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','owner'),('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','owner');

do $$ begin begin perform pg_temp.legacy_audit(); if '23514'<>'00000' then raise exception 'duplicate: auditoria não recusou legado';end if;exception when check_violation then if SQLSTATE<>'23514' or SQLERRM not like '%reparo manual necessário%' then raise;end if;end; if to_regprocedure('public.transfer_campaign_ownership(uuid,uuid)') is not null or to_regclass('private.campaign_ownership_operations') is not null then raise exception 'duplicate: auditoria não pode alterar schema';end if;raise NOTICE '0059 legacy duplicate: estado 23514, Dois owners legados, auditoria correta';end $$;
rollback to fixture;

savepoint fixture;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','legacy-a@f1.local'),('00000000-0000-0000-0000-0000000000b1','legacy-b@f1.local');
insert into public.worlds(id,owner_user_id,name) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Legacy');
insert into public.campaigns(id,owner_id,name,world_id) values ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Legacy','10000000-0000-0000-0000-0000000000a1');

insert into public.memberships(campaign_id,user_id,role) values ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','owner');

do $$ begin begin perform pg_temp.legacy_audit(); if '23514'<>'00000' then raise exception 'mismatch: auditoria não recusou legado';end if;exception when check_violation then if SQLSTATE<>'23514' or SQLERRM not like '%reparo manual necessário%' then raise;end if;end; if to_regprocedure('public.transfer_campaign_ownership(uuid,uuid)') is not null or to_regclass('private.campaign_ownership_operations') is not null then raise exception 'mismatch: auditoria não pode alterar schema';end if;raise NOTICE '0059 legacy mismatch: estado 23514, Owner membership não combina com campaign, auditoria correta';end $$;
rollback to fixture;

savepoint fixture;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','legacy-a@f1.local'),('00000000-0000-0000-0000-0000000000b1','legacy-b@f1.local');
insert into public.worlds(id,owner_user_id,name) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Legacy');
insert into public.campaigns(id,owner_id,name,world_id) values ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Legacy','10000000-0000-0000-0000-0000000000a1');

insert into public.memberships(campaign_id,user_id,role) values ('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','owner');

do $$ begin begin perform pg_temp.legacy_audit(); if '00000'<>'00000' then raise exception 'clean: auditoria não recusou legado';end if;exception when check_violation then if SQLSTATE<>'00000' or SQLERRM not like '%reparo manual necessário%' then raise;end if;end; if to_regprocedure('public.transfer_campaign_ownership(uuid,uuid)') is not null or to_regclass('private.campaign_ownership_operations') is not null then raise exception 'clean: auditoria não pode alterar schema';end if;raise NOTICE '0059 legacy clean: estado 00000, Uma campaign limpa, auditoria correta';end $$;
rollback to fixture;

do $$ begin if exists(select 1 from public.campaigns) or to_regprocedure('public.transfer_campaign_ownership(uuid,uuid)') is not null or to_regclass('private.campaign_ownership_operations') is not null then raise exception '0059 legacy: fixture não desfeita';end if;raise notice '0059 legacy: 4 cenários passaram; 3 recusaram legado, clean aceito, nada reparado';end $$;

rollback;
