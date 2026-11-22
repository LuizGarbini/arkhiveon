-- Rollback 0085: FK volta a CASCADE e a coluna a NOT NULL.
-- Só funciona se nenhuma linha ficou com uploaded_by nulo (o bloco recusa).
do $$
begin
	if exists (select 1 from public.campaign_library_files where uploaded_by is null) then
		raise exception 'rollback 0085 recusado: há linhas com uploaded_by nulo'
			using errcode = '23502';
	end if;
end;
$$;

alter table public.campaign_library_files
	drop constraint if exists campaign_library_files_uploaded_by_fkey;

alter table public.campaign_library_files
	add constraint campaign_library_files_uploaded_by_fkey
	foreign key (uploaded_by) references auth.users(id) on delete cascade;

alter table public.campaign_library_files
	alter column uploaded_by set not null;
