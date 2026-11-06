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
create function pg_temp.fail_atomic() returns trigger language plpgsql as $$ begin raise exception 'falha injetada target' using errcode='XX005'; end $$;
create trigger inject before update on public.memberships for each row when (new.user_id='00000000-0000-0000-0000-0000000000e1') execute function pg_temp.fail_atomic();
set local role authenticated;
set local request.jwt.claims='{"sub":"00000000-0000-0000-0000-0000000000a1","email":"a@f1.local","role":"authenticated"}';
do $$begin
 begin perform public.transfer_campaign_ownership('20000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000e1');raise exception 'falha omitida';
 exception when others then if SQLSTATE<>'XX005' then raise;end if;end;
 raise notice '0059: rollback - erro XX005 intencional ocorreu';
end $$;
do $$begin if (select count(*) filter(where user_id='00000000-0000-0000-0000-0000000000a1' and role='owner') from public.memberships)<>1 then raise exception 'antecessor não preservado';end if;end $$;
reset role;
do $$begin if exists(select 1 from ((select * from public.memberships except select * from _before) union (select * from _before except select * from public.memberships))t) then raise exception 'rollback rows changed';end if; raise notice '0059: atomicidade preservou todas memberships e não deixou token privado';end $$;
rollback;
