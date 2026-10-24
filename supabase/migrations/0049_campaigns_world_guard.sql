-- =============================================================================
-- Migration 0049: campanha só entra em mundo do próprio mestre (ou de co-mestre)
-- =============================================================================
-- Problema: a policy de INSERT de campaigns só exige owner_id = auth.uid(), e a
-- de UPDATE só exige ser owner da campanha. Nenhuma confere world_id. Quem sabe o
-- UUID de um mundo alheio podia criar uma campanha nele ou mover uma campanha
-- sua para lá (a 0036 ainda copia o world_id para image_assets).
--
-- Correção: trigger BEFORE INSERT / BEFORE UPDATE OF world_id. Só quando o
-- world_id muda (ou no INSERT), o novo world_id precisa ser:
--   - null; ou
--   - um mundo do próprio usuário (worlds.owner_user_id = auth.uid()); ou
--   - um mundo onde o usuário já é owner ou editor de alguma campanha
--     (co-mestre, ex.: "QA Designer (teste)" e "RISE OF TIAMAT" em faerun).
-- Não amplia acesso: só bloqueia. Sem auth.uid() (service_role, postgres,
-- migrations) o trigger não interfere. Linhas existentes não são revalidadas.
-- NÃO APLICADA. Merge e aplicação só pelo Luiz.

create or replace function public.can_attach_campaign_to_world(p_world_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select p_world_id is null
		or exists (
			select 1 from public.worlds w
			where w.id = p_world_id and w.owner_user_id = auth.uid()
		)
		or exists (
			select 1
			from public.memberships m
			join public.campaigns c on c.id = m.campaign_id
			where c.world_id = p_world_id
				and m.user_id = auth.uid()
				and m.role in ('owner', 'editor')
		);
$$;

revoke all on function public.can_attach_campaign_to_world(uuid) from public, anon;
grant execute on function public.can_attach_campaign_to_world(uuid) to authenticated;

create or replace function public.campaigns_world_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is null then
		return new;
	end if;
	if tg_op = 'UPDATE' and new.world_id is not distinct from old.world_id then
		return new;
	end if;
	if not public.can_attach_campaign_to_world(new.world_id) then
		raise exception 'Você só pode ligar a campanha a um mundo seu ou de uma campanha em que é mestre.'
			using errcode = '42501';
	end if;
	return new;
end;
$$;

revoke all on function public.campaigns_world_guard() from public, anon, authenticated;

drop trigger if exists campaigns_world_guard on public.campaigns;
create trigger campaigns_world_guard
before insert or update of world_id on public.campaigns
for each row execute function public.campaigns_world_guard();
