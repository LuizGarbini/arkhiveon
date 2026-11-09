-- 0066 · Histórico de movimentos dos tokens da mesa.
--
-- Cada vez que alguém solta um token em outra casa, o cliente grava uma linha
-- com de onde saiu e para onde foi, para o mestre conferir depois quem mexeu
-- no quê e devolver o token ao ponto de origem.
--
-- Quem lê: mestre e co-mestre (owner/editor). Jogador não lê o histórico.
-- Quem grava: quem pode mover o token (mesma regra do UPDATE de vtt_tokens)
--   e só em nome próprio (author_id = auth.uid()).
-- Quem apaga: mestre e co-mestre ("Limpar histórico"). Ninguém edita.
-- token_id não tem FK: o histórico sobrevive à remoção do token. Cai junto
-- com a cena (on delete cascade).
--
-- Realtime: o SELECT usa EXISTS em memberships, sem user_campaign_role(),
-- pelo mesmo motivo da 0023/0052 (função solta na policy faz o Realtime
-- descartar o evento).

begin;

create table if not exists public.vtt_token_moves (
	id uuid primary key default gen_random_uuid(),
	scene_id uuid not null references public.vtt_scenes(id) on delete cascade,
	token_id uuid not null,
	token_name text not null,
	from_x double precision not null,
	from_y double precision not null,
	to_x double precision not null,
	to_y double precision not null,
	-- Distância na unidade da cena, pela regra de diagonal da mesa na hora.
	distance double precision not null default 0,
	unit text not null default 'm',
	-- Rodada do combate quando houve movimento; nulo fora de combate.
	round integer,
	-- 'move': arrastou. 'undo': o mestre devolveu o token ao ponto de origem.
	kind text not null default 'move',
	author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
	author_name text,
	created_at timestamptz not null default now(),
	constraint vtt_token_moves_kind check (kind in ('move', 'undo')),
	constraint vtt_token_moves_name_len check (char_length(token_name) between 1 and 120),
	constraint vtt_token_moves_unit_len check (char_length(unit) between 1 and 8),
	constraint vtt_token_moves_author_len check (
		author_name is null or char_length(author_name) <= 120
	),
	constraint vtt_token_moves_moved check (from_x <> to_x or from_y <> to_y)
);

create index if not exists vtt_token_moves_scene_idx
	on public.vtt_token_moves (scene_id, created_at desc);

create index if not exists vtt_token_moves_token_idx
	on public.vtt_token_moves (token_id, created_at desc);

alter table public.vtt_token_moves enable row level security;

drop policy if exists "Staff can view token moves" on public.vtt_token_moves;
create policy "Staff can view token moves" on public.vtt_token_moves
for select using (
	exists (
		select 1
		from public.vtt_scenes s
		join public.memberships m on m.campaign_id = s.campaign_id
		where s.id = vtt_token_moves.scene_id
			and m.user_id = auth.uid()
			and m.role in ('owner', 'editor')
	)
);

drop policy if exists "Token movers can log moves" on public.vtt_token_moves;
create policy "Token movers can log moves" on public.vtt_token_moves
for insert with check (
	author_id = auth.uid()
	and exists (
		select 1
		from public.vtt_tokens t
		where t.id = vtt_token_moves.token_id
			and t.scene_id = vtt_token_moves.scene_id
			and (
				user_scene_campaign_role(t.scene_id) in ('owner', 'editor')
				or (
					user_scene_campaign_role(t.scene_id) = 'viewer'
					and t.is_locked = false
					and (
						t.controlled_by @> jsonb_build_array(auth.uid()::text)
						or (
							t.character_id is not null
							and exists (
								select 1 from public.characters c
								where c.id = t.character_id
									and (c.user_id = auth.uid() or c.created_by = auth.uid())
							)
						)
					)
				)
			)
	)
);

drop policy if exists "Staff can clear token moves" on public.vtt_token_moves;
create policy "Staff can clear token moves" on public.vtt_token_moves
for delete using (
	user_scene_campaign_role(scene_id) in ('owner', 'editor')
);

comment on table public.vtt_token_moves is
	'Histórico de movimentos de tokens: de onde saiu, para onde foi, quem moveu. Só mestre e co-mestre leem.';

do $$
declare
	pub_id oid;
begin
	select oid into pub_id from pg_publication where pubname = 'supabase_realtime';
	if pub_id is not null and not exists (
		select 1
		from pg_publication_rel pr
		join pg_class c on c.oid = pr.prrelid
		join pg_namespace n on n.oid = c.relnamespace
		where pr.prpubid = pub_id
			and n.nspname = 'public'
			and c.relname = 'vtt_token_moves'
	) then
		alter publication supabase_realtime add table public.vtt_token_moves;
	end if;
end;
$$;

commit;
