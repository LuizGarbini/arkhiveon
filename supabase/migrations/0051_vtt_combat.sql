-- 0051: combatentes da mesa (VTT), ordem de iniciativa.
-- NÃO APLICADA. Merge e aplicação só pelo Luiz.
--
-- Uma linha por token na cena. Iniciativa entre -50 e 100, inclusive
-- (INITIATIVE_MIN / INITIATIVE_MAX em src/lib/vtt/combat.ts); null = ainda
-- sem valor. O token tem de ser da mesma cena: o mestre da campanha A não
-- prende um token da campanha B.
--
-- SELECT: owner/editor veem todas as linhas da cena. Viewer só se a cena
-- está ativa e o token está visível (layer <> 'gm' e is_hidden = false).
-- INSERT / UPDATE / DELETE: só owner/editor.
--
-- Papel: EXISTS em public.memberships via vtt_scenes (0023/0043). A 0035
-- usa user_scene_campaign_role, mas esta tabela entra no supabase_realtime
-- e o Realtime descarta evento de policy que chama helper customizado. A
-- leitura é a mesma do helper: memberships.role de auth.uid() na campanha
-- da cena. Nunca USING (true). Policies só TO authenticated.

create table if not exists public.vtt_combatants (
	id uuid primary key default gen_random_uuid(),
	scene_id uuid not null references public.vtt_scenes(id) on delete cascade,
	token_id uuid not null references public.vtt_tokens(id) on delete cascade,
	initiative integer null,
	dex integer null,
	sort_key integer not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint vtt_combatants_scene_id_token_id_key unique (scene_id, token_id),
	constraint vtt_combatants_initiative_check check (
		initiative is null or initiative between -50 and 100
	)
);

create index if not exists vtt_combatants_scene_id_idx
	on public.vtt_combatants(scene_id);

-- Integridade, não permissão: a policy de INSERT só olha a cena. Sem isto,
-- o mestre de A grava scene_id de A com token_id de B.
create or replace function public.vtt_combatants_same_scene()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	if not exists (
		select 1
		from public.vtt_tokens as t
		where t.id = new.token_id
			and t.scene_id = new.scene_id
	) then
		raise exception 'O token não pertence à cena do combatente.'
			using errcode = '23514';
	end if;
	return new;
end;
$$;

revoke all on function public.vtt_combatants_same_scene() from public, anon, authenticated;

drop trigger if exists vtt_combatants_same_scene on public.vtt_combatants;
create trigger vtt_combatants_same_scene
before insert or update on public.vtt_combatants
for each row execute function public.vtt_combatants_same_scene();

drop trigger if exists vtt_combatants_set_updated_at on public.vtt_combatants;
create trigger vtt_combatants_set_updated_at
before update on public.vtt_combatants
for each row execute function public.set_updated_at();

-- Rodada e vez ficam na cena. null em combat_round = combate não iniciado.
-- O check admite null; valor presente é >= 1.
alter table public.vtt_scenes
	add column if not exists combat_round integer;

alter table public.vtt_scenes
	add column if not exists combat_turn_id uuid;

do $$
begin
	if not exists (
		select 1
		from pg_constraint
		where conname = 'vtt_scenes_combat_round_check'
			and conrelid = 'public.vtt_scenes'::regclass
	) then
		alter table public.vtt_scenes
			add constraint vtt_scenes_combat_round_check
			check (combat_round is null or combat_round >= 1);
	end if;
end $$;

-- Sem FK de propósito: a vez pode citar um combatente que acabou de sair,
-- e uma FK impediria apagar essa linha ou prenderia a cena a ela.
comment on column public.vtt_scenes.combat_turn_id is
	'Id do combatente da vez (vtt_combatants.id). Sem chave estrangeira de propósito: a vez pode apontar para uma linha já removida.';

-- A policy "GM can update scenes" (0035) já limita UPDATE a
-- user_campaign_role(campaign_id) in ('owner', 'editor'), no USING e no
-- WITH CHECK. Nenhuma migration posterior até a 0049 recria essa policy.
-- combat_round e combat_turn_id ficam só com o mestre. Policy não alterada.

alter table public.vtt_combatants enable row level security;

drop policy if exists "Members can view combatants" on public.vtt_combatants;
create policy "Members can view combatants"
	on public.vtt_combatants
	for select
	to authenticated
	using (
		exists (
			select 1
			from public.vtt_scenes as s
			join public.memberships as m
				on m.campaign_id = s.campaign_id
			where s.id = vtt_combatants.scene_id
				and m.user_id = auth.uid()
				and (
					m.role in ('owner', 'editor')
					or (
						m.role = 'viewer'
						and s.is_active = true
						and exists (
							select 1
							from public.vtt_tokens as t
							where t.id = vtt_combatants.token_id
								and t.layer <> 'gm'
								and t.is_hidden = false
						)
					)
				)
		)
	);

drop policy if exists "GM can insert combatants" on public.vtt_combatants;
create policy "GM can insert combatants"
	on public.vtt_combatants
	for insert
	to authenticated
	with check (
		exists (
			select 1
			from public.vtt_scenes as s
			join public.memberships as m
				on m.campaign_id = s.campaign_id
			where s.id = vtt_combatants.scene_id
				and m.user_id = auth.uid()
				and m.role in ('owner', 'editor')
		)
	);

drop policy if exists "GM can update combatants" on public.vtt_combatants;
create policy "GM can update combatants"
	on public.vtt_combatants
	for update
	to authenticated
	using (
		exists (
			select 1
			from public.vtt_scenes as s
			join public.memberships as m
				on m.campaign_id = s.campaign_id
			where s.id = vtt_combatants.scene_id
				and m.user_id = auth.uid()
				and m.role in ('owner', 'editor')
		)
	)
	with check (
		exists (
			select 1
			from public.vtt_scenes as s
			join public.memberships as m
				on m.campaign_id = s.campaign_id
			where s.id = vtt_combatants.scene_id
				and m.user_id = auth.uid()
				and m.role in ('owner', 'editor')
		)
	);

drop policy if exists "GM can delete combatants" on public.vtt_combatants;
create policy "GM can delete combatants"
	on public.vtt_combatants
	for delete
	to authenticated
	using (
		exists (
			select 1
			from public.vtt_scenes as s
			join public.memberships as m
				on m.campaign_id = s.campaign_id
			where s.id = vtt_combatants.scene_id
				and m.user_id = auth.uid()
				and m.role in ('owner', 'editor')
		)
	);

grant select, insert, update, delete on public.vtt_combatants to authenticated;

alter table public.vtt_combatants replica identity full;

do $$
declare
	pub_id oid;
begin
	select oid into pub_id from pg_publication where pubname = 'supabase_realtime';
	if pub_id is not null then
		if not exists (
			select 1
			from pg_publication_rel
			where prpubid = pub_id
				and prrelid = 'public.vtt_combatants'::regclass
		) then
			alter publication supabase_realtime add table public.vtt_combatants;
		end if;
	end if;
end $$;
