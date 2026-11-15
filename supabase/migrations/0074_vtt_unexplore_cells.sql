-- 0074 · O mestre escurece de novo o que o grupo já explorou (VTT).
--
-- A memória de exploração (0071) só crescia: cada célula vista ficava marcada, e
-- o único jeito de apagar era "Esquecer tudo" (reset_scene_explored). Agora o
-- mestre pode cobrir só um trecho com a forma "ocultar" da névoa, e as células
-- debaixo dela voltam a ser desconhecidas para o grupo.
--
-- unexplore_scene_cells(p_scene_id, p_cell_px, p_cols, p_rows, p_cells):
--   · só mestre e co-mestre (owner/editor): outros levam 42501; sem login 28000.
--   · apaga o bit de cada célula de p_cells (índices fora do mapa são ignorados).
--   · se a cena não tem memória, ou ela foi salva com outro tamanho de mapa/grade
--     (cell_px/cols/rows), não há o que apagar: não faz nada e não dá erro.
--   · até 2000 células por chamada (54000 acima disso); tamanho inválido: 22023.
--   · o UPDATE usa o mesmo lock de linha da explore_scene_cells, então não perde
--     células de quem está explorando ao mesmo tempo.
--
-- Rollback:
--   drop function if exists public.unexplore_scene_cells(uuid, integer, integer, integer, integer[]);

begin;

create or replace function public.unexplore_scene_cells(
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
	v_role text;
	v_row public.vtt_scene_explored%rowtype;
	v_bits bytea;
	v_total integer;
	v_cell integer;
begin
	if auth.uid() is null then
		raise exception 'Entre na sua conta para escurecer o mapa.'
			using errcode = '28000';
	end if;

	v_role := public.user_scene_campaign_role(p_scene_id);
	if v_role is null or v_role not in ('owner', 'editor') then
		raise exception 'Só o mestre ou co-mestre pode escurecer o mapa.'
			using errcode = '42501';
	end if;

	if p_cell_px is null or p_cols is null or p_rows is null
		or p_cell_px not between 4 and 2000
		or p_cols not between 1 and 5000
		or p_rows not between 1 and 5000
		or p_cols * p_rows > 250000 then
		raise exception 'Tamanho de exploração inválido.'
			using errcode = '22023';
	end if;

	if p_cells is null or coalesce(array_length(p_cells, 1), 0) = 0 then
		return;
	end if;
	if array_length(p_cells, 1) > 2000 then
		raise exception 'Células demais de uma vez (máx. 2000).'
			using errcode = '54000';
	end if;

	select * into v_row
	from public.vtt_scene_explored
	where scene_id = p_scene_id
	for update;

	-- Sem memória, ou salva com outro tamanho: não há o que escurecer.
	if not found
		or v_row.cell_px is distinct from p_cell_px
		or v_row.cols is distinct from p_cols
		or v_row.rows is distinct from p_rows then
		return;
	end if;

	v_total := p_cols * p_rows;
	v_bits := v_row.bits;
	foreach v_cell in array p_cells loop
		if v_cell is not null and v_cell >= 0 and v_cell < v_total then
			v_bits := set_bit(v_bits, v_cell, 0);
		end if;
	end loop;

	update public.vtt_scene_explored
	set bits = v_bits, updated_at = now()
	where scene_id = p_scene_id;
end;
$$;

revoke all on function public.unexplore_scene_cells(uuid, integer, integer, integer, integer[]) from public, anon;
grant execute on function public.unexplore_scene_cells(uuid, integer, integer, integer, integer[]) to authenticated;

commit;
