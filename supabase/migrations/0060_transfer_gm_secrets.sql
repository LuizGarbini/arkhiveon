-- 0060 · Segredos do mestre acompanham a transferência da mesa.
-- Quem enviou uma imagem privada continua vendo-a mesmo depois de deixar de
-- ser mestre. Ao trocar campaigns.owner_id, a autoria desses segredos passa
-- para o novo mestre, na mesma transação. Imagem pública e conteúdo de outro
-- autor ficam onde estão.

begin;

create or replace function private.hand_campaign_gm_secrets()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
	if tg_op <> 'UPDATE' or new.owner_id is not distinct from old.owner_id then
		return new;
	end if;
	if old.owner_id is null or new.owner_id is null then
		return new;
	end if;

	update public.image_assets
	set created_by = new.owner_id
	where campaign_id = new.id
		and created_by = old.owner_id
		and is_private = true;

	update public.npcs
	set created_by = new.owner_id
	where created_by = old.owner_id
		and visibility = 'master_secret'
		and (
			(
				campaign_id = new.id
				and (cardinality(campaign_ids) = 0 or campaign_ids = array[new.id])
			)
			or (campaign_id is null and campaign_ids = array[new.id])
		);

	update public.items
	set created_by = new.owner_id
	where created_by = old.owner_id
		and visibility = 'master_secret'
		and (
			(
				campaign_id = new.id
				and (cardinality(campaign_ids) = 0 or campaign_ids = array[new.id])
			)
			or (campaign_id is null and campaign_ids = array[new.id])
		);

	update public.locations
	set created_by = new.owner_id
	where created_by = old.owner_id
		and visibility = 'master_secret'
		and (
			(
				campaign_id = new.id
				and (cardinality(campaign_ids) = 0 or campaign_ids = array[new.id])
			)
			or (campaign_id is null and campaign_ids = array[new.id])
		);

	update public.lores
	set created_by = new.owner_id
	where created_by = old.owner_id
		and visibility = 'master_secret'
		and (
			(
				campaign_id = new.id
				and (cardinality(campaign_ids) = 0 or campaign_ids = array[new.id])
			)
			or (campaign_id is null and campaign_ids = array[new.id])
		);

	update public.world_news
	set author_id = new.owner_id
	where author_id = old.owner_id
		and visibility = 'master_secret'
		and campaign_ids = array[new.id];

	return new;
end;
$function$;

revoke all on function private.hand_campaign_gm_secrets() from public, anon, authenticated;

drop trigger if exists campaigns_hand_gm_secrets on public.campaigns;
create trigger campaigns_hand_gm_secrets
	after update of owner_id on public.campaigns
	for each row
	execute function private.hand_campaign_gm_secrets();

commit;
