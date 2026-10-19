-- R1 (imagens privadas no R2): em qual bucket está o objeto de cada asset.
--
-- 'public'  = bucket `arkhiveon` (URL pública, como hoje)
-- 'private' = bucket `arkhiveon-private` (sem acesso público; leitura só por
--             URL assinada emitida pela Edge Function `image-r2`)
--
-- Default 'public': nada muda hoje. As linhas só passam a 'private' pela
-- função (R2, service role) ou pelo script de migração (R5).
--
-- RLS: SELECT continua em "World members can view image assets"
-- (`can_view_image_asset`), que é o que a `image-r2` usa para decidir quem
-- recebe URL. Nenhuma policy nova. Para o cliente não marcar um asset como
-- privado sem o objeto ter sido movido (ou o contrário), o trigger abaixo
-- impede que usuário autenticado grave `storage_bucket` diferente de 'public'
-- no INSERT ou o altere no UPDATE. Service role / SQL do painel (sem
-- auth.uid()) continuam livres.
--
-- Teste: supabase/tests/0045_image_assets_storage_bucket.sql

begin;

alter table public.image_assets
	add column if not exists storage_bucket text not null default 'public';

alter table public.image_assets
	drop constraint if exists image_assets_storage_bucket_check;
alter table public.image_assets
	add constraint image_assets_storage_bucket_check
	check (storage_bucket in ('public', 'private'));

create or replace function public.guard_image_asset_storage_bucket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is null then
		return new;
	end if;
	if tg_op = 'INSERT' and new.storage_bucket <> 'public' then
		raise exception 'Bucket da imagem é definido pelo servidor.' using errcode = '42501';
	end if;
	if tg_op = 'UPDATE' and new.storage_bucket is distinct from old.storage_bucket then
		raise exception 'Bucket da imagem é definido pelo servidor.' using errcode = '42501';
	end if;
	return new;
end;
$$;

drop trigger if exists guard_image_asset_storage_bucket on public.image_assets;
create trigger guard_image_asset_storage_bucket
	before insert or update on public.image_assets
	for each row execute function public.guard_image_asset_storage_bucket();

commit;
