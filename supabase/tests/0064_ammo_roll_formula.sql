-- Testes locais da 0064: parse_dice_formula aceita 1d8+1d6+3 e preserva 2d6+3.
-- Não aplica no remoto. Transação com ROLLBACK.

begin;

do $$
declare
	v jsonb;
	v_fail text;
begin
	v := public.parse_dice_formula('2d6+3');
	if v->>'formula' is distinct from '2d6+3' then
		raise exception '0064: 2d6+3 fórmula %', v->>'formula';
	end if;
	if (v->>'count')::int is distinct from 2 or (v->>'faces')::int is distinct from 6 then
		raise exception '0064: 2d6+3 count/faces';
	end if;
	if jsonb_array_length(v->'pools') is distinct from 1 then
		raise exception '0064: 2d6+3 deve ter 1 pool';
	end if;

	v := public.parse_dice_formula('1d8+1d6+3');
	if v->>'formula' is distinct from '1d8+1d6+3' then
		raise exception '0064: mesclada fórmula %', v->>'formula';
	end if;
	if (v->>'count')::int is distinct from 2 then
		raise exception '0064: mesclada count deveria ser 2, não achatar faces';
	end if;
	if (v->>'faces')::int is distinct from 8 then
		raise exception '0064: faces canônicas = primeiro pool';
	end if;
	if jsonb_array_length(v->'pools') is distinct from 2 then
		raise exception '0064: 1d8+1d6 precisa de 2 pools';
	end if;
	if (v->'pools'->0->>'faces')::int is distinct from 8
		or (v->'pools'->1->>'faces')::int is distinct from 6 then
		raise exception '0064: pools não podem ser achatados num único dado';
	end if;

	v := public.parse_dice_formula('1d8+1d6');
	if v->>'formula' is distinct from '1d8+1d6' then
		raise exception '0064: 1d8+1d6 sem modificador';
	end if;

	begin
		perform public.parse_dice_formula('101d6');
		raise exception '0064: 101d6 deveria falhar';
	exception
		when sqlstate '22023' then null;
	end;

	raise notice '0064 parse: 5 cenários GREEN';
end $$;

rollback;
