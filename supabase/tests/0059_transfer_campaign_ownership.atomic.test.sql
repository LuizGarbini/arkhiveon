-- 0059: falha no segundo UPDATE deve reverter o primeiro (transação isolada).
-- Só Docker supabase_db_arkhiveon, banco vazio. ROLLBACK ao final; nunca remoto.
-- Somente transação local. Conta A é owner via migrations normais, B viewer.
begin;
select set_config('arkhiveon.ownership_operation_id','',true);
do $$ begin if exists(select 1 from public.campaigns) or exists(select 1 from auth.users) then raise exception '0059 atomic: apenas banco local vazio'; end if; end $$;
insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a1','a@f1.local'),('00000000-0000-0000-0000-0000000000e1','b@f1.local');
insert into public.worlds(id,owner_user_id,name) values ('10000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Mundo');
insert into public.campaigns(id,owner_id,name,world_id) values('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000a1','Campanha','10000000-0000-0000-0000-0000000000a1');
insert into public.memberships(campaign_id,user_id,role) values('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1','viewer');
create temp table _before as select * from public.memberships;
create temp table _before_campaigns as select id,owner_id,updated_at,xmin::text as before_xmin,to_jsonb(c) as row_before from public.campaigns c;
create temp table _before_ledger as select * from private.campaign_ownership_operations;
create function pg_temp.fail_atomic() returns trigger language plpgsql as $$ begin raise exception 'falha injetada target' using errcode='XX005'; end $$;
create trigger inject before update on public.memberships for each row when (new.user_id='00000000-0000-0000-0000-0000000000e1') execute function pg_temp.fail_atomic();
do $$ begin if inet_server_addr() is not null or inet_server_port() is not null then raise exception '0059 atomic: requer Unix socket Docker local'; end if; end $$;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a1';
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","email":"a@f1.local","role":"authenticated"}';
do $$begin
 if current_user<>'authenticated' or auth.uid()<>'00000000-0000-0000-0000-0000000000a1' then raise exception 'ERRTESTASSERT: atomic run as postgres/not A'; end if;
 begin perform public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1');raise exception 'falha omitida';
 exception when others then if SQLSTATE<>'XX005' or SQLERRM<>'falha injetada target' then raise exception 'WRONG_SQLSTATE %/%',SQLSTATE,SQLERRM;end if;end;
 raise notice '0059: rollback - erro XX005 intencional ocorreu';
end $$;
do $$begin if (select count(*) filter(where user_id='00000000-0000-0000-0000-0000000000a1' and role='owner') from public.memberships)<>1 then raise exception 'antecessor não preservado';end if;end $$;
do $$ begin raise notice 'ROLLBACK caller % JWT % SQLSTATE XX005 message falha injetada target',current_user,auth.uid(); end $$;
reset role;
do $$begin
 if exists(select 1 from ((select * from public.memberships except select * from _before) union (select * from _before except select * from public.memberships))t) then raise exception 'rollback rows changed';end if;
 if not exists(select 1 from _before_campaigns b join public.campaigns c using(id)
  where b.owner_id=c.owner_id and b.updated_at=c.updated_at and b.before_xmin=c.xmin::text and b.row_before=to_jsonb(c) and c.owner_id='00000000-0000-0000-0000-0000000000a1') then
  raise exception 'ERRTESTASSERT: rollback campaign owner/updated_at/xmin changed';
 end if;
 if (select count(*) from private.campaign_ownership_operations)<>(select count(*) from _before_ledger) then raise exception 'ERRTESTASSERT: ledger write survived'; end if;
 raise notice 'ROLLBACK campaign owner=% preserved with updated_at/xmin; members/ledger preserved',(select owner_id from public.campaigns where id='20000000-0000-0000-0000-0000000000a1');
end $$;
rollback;
