-- ANTES DE APLICAR: rode a consulta só-leitura abaixo na prod; ela precisa voltar VAZIA (o índice único falharia):
-- select campaign_id, count(*) from public.vtt_scenes where is_active group by campaign_id having count(*) > 1;

-- =============================================================================
-- Migration 0053: publicar cena num passo só
-- =============================================================================
-- publish_scene desativa as outras cenas da campanha e ativa a escolhida na
-- mesma transação. Só owner ou editor. Cena inexistente e quem não é membro
-- recebem o mesmo 42501 ("sem permissão"), sem revelar se a cena existe.
-- O SELECT ... FOR UPDATE em campaigns serializa duas publicações concorrentes;
-- o índice único é a rede de segurança.
-- NÃO APLICADA. Merge e aplicação só pelo Luiz.

create or replace function public.publish_scene(p_scene_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_campaign_id uuid;
	v_seen uuid;
	v_role text;
	v_updated int;
begin
	if auth.uid() is null then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	select s.campaign_id
	into v_campaign_id
	from public.vtt_scenes s
	where s.id = p_scene_id;

	if v_campaign_id is null then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	-- Trava a campanha: duas publicações não intercalam o par de updates.
	perform 1
	from public.campaigns
	where id = v_campaign_id
	for update;

	if not found then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	-- A cena pode ter sumido, ou mudado de campanha, enquanto esperávamos o lock.
	select s.campaign_id
	into v_seen
	from public.vtt_scenes s
	where s.id = p_scene_id;

	if v_seen is distinct from v_campaign_id then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	v_role := public.user_campaign_role(v_campaign_id);
	-- NULL (não-membro) não cai em NOT IN: em PL/pgSQL isso seria falso.
	if v_role is null or v_role not in ('owner', 'editor') then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	update public.vtt_scenes
	set is_active = false
	where campaign_id = v_campaign_id
		and id <> p_scene_id
		and is_active;

	update public.vtt_scenes
	set is_active = true
	where id = p_scene_id
		and campaign_id = v_campaign_id;

	get diagnostics v_updated = row_count;
	if v_updated <> 1 then
		raise exception 'sem permissão' using errcode = '42501';
	end if;

	return p_scene_id;
end;
$$;

revoke all on function public.publish_scene(uuid) from public, anon;
grant execute on function public.publish_scene(uuid) to authenticated;

-- Uma cena ativa por campanha. Falha se a consulta do topo não voltar vazia.
create unique index if not exists vtt_scenes_one_active_per_campaign
	on public.vtt_scenes (campaign_id)
	where is_active;
