-- 0071 · Memória de exploração da mesa (VTT).
--
-- No modo Exploração, o que o grupo já viu fica marcado no mapa (em penumbra)
-- mesmo depois que o personagem se afasta, e continua assim ao recarregar a
-- mesa. A memória é DO GRUPO (uma por cena): se um jogador descobre uma sala,
-- todos passam a vê-la como explorada.
--
-- Formato: o mapa é dividido em células quadradas de `cell_px` pixels e cada
-- célula é 1 bit em `bits` (bit n = linha n / cols, coluna n % cols; bit 0 é o
-- menos significativo do primeiro byte, igual a get_bit/set_bit do Postgres).
-- Um mapa 4000×3000 com células de 35 px cabe em ~1,2 KB.
--
-- Acesso: SÓ pelas funções abaixo (security definer). A tabela tem RLS ligado e
-- nenhuma policy, então ninguém lê nem escreve direto.
--   · get_scene_explored: qualquer membro da campanha (jogador só na cena ativa).
--   · explore_scene_cells: idem; junta (OR) as células novas ao que já existe e
--     recomeça do zero se o tamanho do mapa/grade mudou.
--   · reset_scene_explored: só mestre e co-mestre ("esquecer o mapa").
-- Sem Realtime de tabela: o aviso aos outros clientes vai por Broadcast.
--
-- Rollback:
--   drop function if exists public.get_scene_explored(uuid);
--   drop function if exists public.explore_scene_cells(uuid, integer, integer, integer, integer[]);
--   drop function if exists public.reset_scene_explored(uuid);
--   drop table if exists public.vtt_scene_explored;

begin;

create table if not exists public.vtt_scene_explored (
	scene_id uuid primary key references public.vtt_scenes(id) on delete cascade,
	cell_px integer not null,
	cols integer not null,
	rows integer not null,
	bits bytea not null,
	updated_at timestamptz not null default now(),
	constraint vtt_scene_explored_dims check (
		cell_px between 4 and 2000
		and cols between 1 and 5000
		and rows between 1 and 5000
		and cols * rows <= 250000
	),
	constraint vtt_scene_explored_size check (
		octet_length(bits) = ((cols * rows) + 7) / 8
	)
);

alter table public.vtt_scene_explored enable row level security;

revoke all on public.vtt_scene_explored from anon, authenticated;

-- Quem pode ver a cena: mestre e co-mestre em qualquer uma; jogador só na ativa
-- (a mesma regra das policies de vtt_scenes). Devolve o papel ou levanta 42501.
create or replace function public.vtt_explored_access(p_scene_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_role text;
begin
	v_role := public.user_scene_campaign_role(p_scene_id);
	if v_role is null then
		raise exception 'Sem acesso a esta cena.' using errcode = '42501';
	end if;
	if v_role = 'viewer' and not exists (
		select 1 from public.vtt_scenes s
		where s.id = p_scene_id and s.is_active = true
	) then
		raise exception 'Sem acesso a esta cena.' using errcode = '42501';
	end if;
	return v_role;
end;
$$;

revoke all on function public.vtt_explored_access(uuid) from public, anon, authenticated;

create or replace function public.get_scene_explored(p_scene_id uuid)
returns table (
	cell_px integer,
	cols integer,
	rows integer,
	bits text,
	updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
	perform public.vtt_explored_access(p_scene_id);
	return query
	select e.cell_px, e.cols, e.rows,
		replace(encode(e.bits, 'base64'), E'\n', ''),
		e.updated_at
	from public.vtt_scene_explored e
	where e.scene_id = p_scene_id;
end;
$$;

create or replace function public.explore_scene_cells(
	p_scene_id uuid,
	p_cell_px integer,
	p_cols integer,
	p_rows integer,
	p_cells integer[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	v_bits bytea;
	v_total integer;
	v_cell integer;
	v_row public.vtt_scene_explored%rowtype;
begin
	perform public.vtt_explored_access(p_scene_id);

	if p_cell_px is null or p_cols is null or p_rows is null
		or p_cell_px not between 4 and 2000
		or p_cols not between 1 and 5000
		or p_rows not between 1 and 5000
		or p_cols * p_rows > 250000 then
		raise exception 'Tamanho de exploração inválido.' using errcode = '22023';
	end if;
	if p_cells is null or coalesce(array_length(p_cells, 1), 0) = 0 then
		return;
	end if;
	if array_length(p_cells, 1) > 2000 then
		raise exception 'Células demais de uma vez (máx. 2000).' using errcode = '54000';
	end if;

	v_total := p_cols * p_rows;

	-- Cria a linha se não existe e trava, para duas pessoas explorando ao mesmo
	-- tempo não perderem células uma da outra.
	insert into public.vtt_scene_explored (scene_id, cell_px, cols, rows, bits)
	values (p_scene_id, p_cell_px, p_cols, p_rows, decode(repeat('00', (v_total + 7) / 8), 'hex'))
	on conflict (scene_id) do nothing;

	select * into v_row
	from public.vtt_scene_explored
	where scene_id = p_scene_id
	for update;

	if v_row.cell_px = p_cell_px and v_row.cols = p_cols and v_row.rows = p_rows then
		v_bits := v_row.bits;
	else
		-- O mapa ou a grade mudou: a memória antiga não vale mais.
		v_bits := decode(repeat('00', (v_total + 7) / 8), 'hex');
	end if;

	foreach v_cell in array p_cells loop
		if v_cell is not null and v_cell >= 0 and v_cell < v_total then
			v_bits := set_bit(v_bits, v_cell, 1);
		end if;
	end loop;

	update public.vtt_scene_explored
	set cell_px = p_cell_px, cols = p_cols, rows = p_rows,
		bits = v_bits, updated_at = now()
	where scene_id = p_scene_id;
end;
$$;

create or replace function public.reset_scene_explored(p_scene_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if public.user_scene_campaign_role(p_scene_id) is null
		or public.user_scene_campaign_role(p_scene_id) not in ('owner', 'editor') then
		raise exception 'Só o mestre ou co-mestre pode esquecer o mapa.' using errcode = '42501';
	end if;
	delete from public.vtt_scene_explored where scene_id = p_scene_id;
end;
$$;

revoke all on function public.get_scene_explored(uuid) from public, anon;
revoke all on function public.explore_scene_cells(uuid, integer, integer, integer, integer[]) from public, anon;
revoke all on function public.reset_scene_explored(uuid) from public, anon;
grant execute on function public.get_scene_explored(uuid) to authenticated;
grant execute on function public.explore_scene_cells(uuid, integer, integer, integer, integer[]) to authenticated;
grant execute on function public.reset_scene_explored(uuid) to authenticated;

comment on table public.vtt_scene_explored is
	'Memória de exploração do grupo por cena: 1 bit por célula de cell_px pixels. Só via RPC.';

commit;
