-- =============================================================================
-- Migration 0052: rolagens no servidor e chat da mesa
-- =============================================================================
-- vtt_rolls é o feed que a mesa vê. Uma rolagem secreta grava formula nula:
-- a linha pública não tem total, details nem o texto da fórmula. O total e
-- os dados ficam só em vtt_roll_results.
--
-- Realtime: só vtt_rolls entra na publicação supabase_realtime. vtt_roll_results
-- fica de fora de propósito. O websocket manda a linha inteira para quem passa
-- no SELECT; se o resultado fosse replicado, o total viajaria no payload.
-- O SELECT de vtt_rolls usa EXISTS em memberships, sem user_campaign_role(),
-- pelo mesmo motivo da 0023: função customizada na policy da tabela replicada
-- faz o Realtime descartar o evento.
--
-- Sessão do feed: nada é apagado e o cliente não dá DELETE. start_feed_session
-- abre outra sessão (também serve para limpar o que o jogador vê). O servidor
-- grava session_id = sessão corrente e cria a primeira se ainda não houver.
-- Viewer só lê a sessão corrente. Owner/editor lê o histórico.
-- O ponteiro campaigns.current_feed_session_id só muda por função do dono
-- da tabela (as RPCs são SECURITY DEFINER). Não há policy de escrita.

begin;

-- -----------------------------------------------------------------------------
-- Sessões do feed
-- -----------------------------------------------------------------------------

create table if not exists public.vtt_feed_sessions (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	started_by uuid references auth.users(id) on delete set null,
	started_at timestamptz not null default now()
);

create index if not exists vtt_feed_sessions_campaign_idx
	on public.vtt_feed_sessions (campaign_id, started_at desc);

alter table public.campaigns
	add column if not exists current_feed_session_id uuid;

alter table public.campaigns
	drop constraint if exists campaigns_current_feed_session_id_fkey;

alter table public.campaigns
	add constraint campaigns_current_feed_session_id_fkey
	foreign key (current_feed_session_id)
	references public.vtt_feed_sessions (id)
	on delete set null
	deferrable initially deferred;

-- O dono da campanha consegue dar UPDATE na linha. Sem este gatilho ele
-- apontaria o feed de volta para uma sessão antiga, ou para a sessão de outra
-- campanha. As RPCs rodam como dono da função (superuser) e passam.
create or replace function public.campaigns_feed_session_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	v_owner text;
begin
	if tg_op = 'UPDATE'
		and new.current_feed_session_id is not distinct from old.current_feed_session_id then
		return new;
	end if;
	if tg_op = 'INSERT' and new.current_feed_session_id is null then
		return new;
	end if;

	-- Dentro da RPC o usuário corrente é o dono de vtt_open_feed_session
	-- (SECURITY DEFINER). postgres no Supabase tem bypassrls e não é
	-- superuser, então is_superuser sozinho bloquearia a própria RPC.
	-- authenticated e service_role não são esse dono e não passam.
	select r.rolname
	into v_owner
	from pg_proc p
	join pg_namespace n on n.oid = p.pronamespace
	join pg_roles r on r.oid = p.proowner
	where n.nspname = 'public'
		and p.proname = 'vtt_open_feed_session'
	limit 1;

	if current_setting('is_superuser') is distinct from 'on'
		and current_user is distinct from v_owner then
		raise exception 'A sessão do feed só muda pela mesa.'
			using errcode = '42501';
	end if;

	if new.current_feed_session_id is not null and not exists (
		select 1
		from public.vtt_feed_sessions s
		where s.id = new.current_feed_session_id
			and s.campaign_id = new.id
	) then
		raise exception 'A sessão não pertence a esta campanha.'
			using errcode = '23514';
	end if;

	return new;
end;
$$;

drop trigger if exists campaigns_feed_session_guard on public.campaigns;
create trigger campaigns_feed_session_guard
	before insert or update of current_feed_session_id on public.campaigns
	for each row execute function public.campaigns_feed_session_guard();

-- -----------------------------------------------------------------------------
-- Feed público e resultado (o resultado não é replicado)
-- -----------------------------------------------------------------------------

create table if not exists public.vtt_rolls (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	scene_id uuid references public.vtt_scenes(id) on delete set null,
	session_id uuid not null references public.vtt_feed_sessions(id) on delete cascade,
	author_id uuid not null references auth.users(id) on delete cascade,
	character_id uuid references public.characters(id) on delete set null,
	kind text not null check (kind in ('roll', 'chat')),
	-- Nula na rolagem secreta. O feed não tem coluna de total nem de details.
	formula text,
	label text,
	message text,
	is_secret boolean not null default false,
	created_at timestamptz not null default now(),
	constraint vtt_rolls_label_len check (
		label is null or char_length(label) between 1 and 80
	),
	constraint vtt_rolls_payload check (
		(
			kind = 'roll'
			and message is null
			and (
				(is_secret = true and formula is null)
				or (
					is_secret = false
					and formula is not null
					and char_length(formula) between 1 and 32
				)
			)
		)
		or (
			kind = 'chat'
			and formula is null
			and is_secret = false
			and message is not null
			and char_length(btrim(message)) between 1 and 2000
		)
	)
);

create index if not exists vtt_rolls_campaign_session_idx
	on public.vtt_rolls (campaign_id, session_id, created_at desc);

create table if not exists public.vtt_roll_results (
	roll_id uuid primary key references public.vtt_rolls(id) on delete cascade,
	total integer not null,
	details jsonb not null,
	constraint vtt_roll_results_details_object check (jsonb_typeof(details) = 'object')
);

comment on table public.vtt_roll_results is
	'Total e dados da rolagem. Fora do supabase_realtime: o websocket só carrega vtt_rolls, que não tem estas colunas. Rolagem secreta também deixa formula nula no feed.';

-- -----------------------------------------------------------------------------
-- Parser XdY+Z. Espelhado em src/lib/vtt/dice.ts. Não rola o dado.
-- Limites: quantidade 1..100, faces 2..1000, modificador -1000000..1000000.
-- 'd20' vale 1d20. Espaços e maiúsculas são aceitos. O texto guardado é o
-- canônico (2d6+3, 2d6-1, 2d6).
-- -----------------------------------------------------------------------------

create or replace function public.parse_dice_formula(p_formula text)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
	v_text text;
	v_match text[];
	v_count integer;
	v_faces integer;
	v_mod integer;
	v_canonical text;
begin
	if p_formula is null or char_length(p_formula) > 64 then
		raise exception 'Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.'
			using errcode = '22023';
	end if;

	v_text := lower(regexp_replace(p_formula, '\s+', '', 'g'));
	v_match := regexp_match(v_text, '^([0-9]{0,3})d([0-9]{1,4})([+-][0-9]{1,7})?$');
	if v_match is null then
		raise exception 'Fórmula inválida. Use XdY+Z, por exemplo 2d6+3.'
			using errcode = '22023';
	end if;

	if v_match[1] is null or v_match[1] = '' then
		v_count := 1;
	else
		v_count := v_match[1]::integer;
	end if;
	v_faces := v_match[2]::integer;
	if v_match[3] is null then
		v_mod := 0;
	else
		v_mod := v_match[3]::integer;
	end if;

	if v_count < 1 or v_count > 100 then
		raise exception 'A quantidade de dados deve ser de 1 a 100.'
			using errcode = '22023';
	end if;
	if v_faces < 2 or v_faces > 1000 then
		raise exception 'O dado deve ter de 2 a 1000 faces.'
			using errcode = '22023';
	end if;
	if v_mod < -1000000 or v_mod > 1000000 then
		raise exception 'O modificador deve ficar entre -1000000 e 1000000.'
			using errcode = '22023';
	end if;

	v_canonical := v_count::text || 'd' || v_faces::text;
	if v_mod > 0 then
		v_canonical := v_canonical || '+' || v_mod::text;
	elsif v_mod < 0 then
		v_canonical := v_canonical || v_mod::text;
	end if;

	return jsonb_build_object(
		'count', v_count,
		'faces', v_faces,
		'modifier', v_mod,
		'formula', v_canonical
	);
end;
$$;

create or replace function public.vtt_require_member(p_campaign_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_role text;
begin
	if v_uid is null then
		raise exception 'Entre na sua conta para usar a mesa.'
			using errcode = '42501';
	end if;
	if p_campaign_id is null then
		raise exception 'Você não participa desta campanha.'
			using errcode = '42501';
	end if;
	v_role := public.user_campaign_role(p_campaign_id);
	if v_role is null then
		raise exception 'Você não participa desta campanha.'
			using errcode = '42501';
	end if;
	return v_role;
end;
$$;

create or replace function public.vtt_assert_scene(p_campaign_id uuid, p_scene_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
	if p_scene_id is null then
		return;
	end if;
	if not exists (
		select 1
		from public.vtt_scenes s
		where s.id = p_scene_id
			and s.campaign_id = p_campaign_id
	) then
		raise exception 'Cena não encontrada nesta campanha.'
			using errcode = '42501';
	end if;
end;
$$;

create or replace function public.vtt_assert_character(
	p_campaign_id uuid,
	p_character_id uuid,
	p_role text
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
	v_user uuid;
	v_created uuid;
	v_campaign uuid;
	v_uid uuid := auth.uid();
begin
	if p_character_id is null then
		return;
	end if;

	select c.user_id, c.created_by, c.campaign_id
	into v_user, v_created, v_campaign
	from public.characters c
	where c.id = p_character_id;

	if v_campaign is distinct from p_campaign_id then
		raise exception 'Ficha não encontrada nesta campanha.'
			using errcode = '42501';
	end if;

	if p_role = 'viewer'
		and v_user is distinct from v_uid
		and v_created is distinct from v_uid then
		raise exception 'Você só pode usar a sua ficha.'
			using errcode = '42501';
	end if;
end;
$$;

-- p_force_new: start_feed_session sempre abre outra. Rolagem e chat reusam
-- a corrente e criam a primeira se o ponteiro ainda for nulo.
create or replace function public.vtt_open_feed_session(
	p_campaign_id uuid,
	p_started_by uuid,
	p_force_new boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_session uuid;
begin
	if p_campaign_id is null or p_started_by is null then
		raise exception 'Campanha inválida.'
			using errcode = '22023';
	end if;

	perform 1
	from public.campaigns
	where id = p_campaign_id
	for update;

	if not found then
		raise exception 'Você não participa desta campanha.'
			using errcode = '42501';
	end if;

	if coalesce(p_force_new, false) is not true then
		select c.current_feed_session_id
		into v_session
		from public.campaigns c
		where c.id = p_campaign_id;
		if v_session is not null then
			return v_session;
		end if;
	end if;

	insert into public.vtt_feed_sessions (campaign_id, started_by)
	values (p_campaign_id, p_started_by)
	returning id into v_session;

	update public.campaigns
	set current_feed_session_id = v_session
	where id = p_campaign_id;

	return v_session;
end;
$$;

-- Não existe parâmetro de resultado. O cliente não escolhe o total:
-- o servidor interpreta a fórmula e chama random().
create or replace function public.roll_dice(
	p_campaign_id uuid,
	p_scene_id uuid,
	p_formula text,
	p_secret boolean,
	p_label text,
	p_character_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_role text;
	v_secret boolean := coalesce(p_secret, false);
	v_label text := nullif(btrim(p_label), '');
	v_parsed jsonb;
	v_count integer;
	v_faces integer;
	v_mod integer;
	v_formula text;
	v_rolls jsonb := '[]'::jsonb;
	v_die integer;
	v_sum integer := 0;
	v_total integer;
	v_session uuid;
	v_id uuid;
	v_details jsonb;
begin
	v_role := public.vtt_require_member(p_campaign_id);
	if v_secret and v_role not in ('owner', 'editor') then
		raise exception 'Só o mestre pode rolar em segredo.'
			using errcode = '42501';
	end if;
	if v_label is not null and char_length(v_label) > 80 then
		raise exception 'O rótulo pode ter no máximo 80 caracteres.'
			using errcode = '22023';
	end if;

	perform public.vtt_assert_scene(p_campaign_id, p_scene_id);
	perform public.vtt_assert_character(p_campaign_id, p_character_id, v_role);

	v_parsed := public.parse_dice_formula(p_formula);
	v_count := (v_parsed->>'count')::integer;
	v_faces := (v_parsed->>'faces')::integer;
	v_mod := (v_parsed->>'modifier')::integer;
	v_formula := v_parsed->>'formula';

	for v_i in 1..v_count loop
		v_die := floor(random() * v_faces)::integer + 1;
		if v_die < 1 or v_die > v_faces then
			raise exception 'Falha ao gerar o dado.'
				using errcode = '55000';
		end if;
		v_rolls := v_rolls || jsonb_build_array(v_die);
		v_sum := v_sum + v_die;
	end loop;
	v_total := v_sum + v_mod;

	v_session := public.vtt_open_feed_session(p_campaign_id, v_uid, false);

	v_details := jsonb_build_object(
		'formula', v_formula,
		'count', v_count,
		'faces', v_faces,
		'modifier', v_mod,
		'rolls', v_rolls
	);

	insert into public.vtt_rolls (
		campaign_id,
		scene_id,
		session_id,
		author_id,
		character_id,
		kind,
		formula,
		label,
		message,
		is_secret
	) values (
		p_campaign_id,
		p_scene_id,
		v_session,
		v_uid,
		p_character_id,
		'roll',
		case when v_secret then null else v_formula end,
		v_label,
		null,
		v_secret
	)
	returning id into v_id;

	insert into public.vtt_roll_results (roll_id, total, details)
	values (v_id, v_total, v_details);

	return jsonb_build_object(
		'id', v_id,
		'total', v_total,
		'is_secret', v_secret,
		'formula', v_formula
	);
end;
$$;

create or replace function public.post_table_message(
	p_campaign_id uuid,
	p_scene_id uuid,
	p_message text,
	p_character_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_role text;
	v_message text := btrim(p_message);
	v_session uuid;
	v_id uuid;
begin
	v_role := public.vtt_require_member(p_campaign_id);
	if v_message is null or char_length(v_message) < 1 or char_length(v_message) > 2000 then
		raise exception 'A mensagem precisa ter de 1 a 2000 caracteres.'
			using errcode = '22023';
	end if;

	perform public.vtt_assert_scene(p_campaign_id, p_scene_id);
	perform public.vtt_assert_character(p_campaign_id, p_character_id, v_role);

	v_session := public.vtt_open_feed_session(p_campaign_id, v_uid, false);

	insert into public.vtt_rolls (
		campaign_id,
		scene_id,
		session_id,
		author_id,
		character_id,
		kind,
		formula,
		label,
		message,
		is_secret
	) values (
		p_campaign_id,
		p_scene_id,
		v_session,
		v_uid,
		p_character_id,
		'chat',
		null,
		null,
		v_message,
		false
	)
	returning id into v_id;

	return v_id;
end;
$$;

create or replace function public.start_feed_session(p_campaign_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
	v_uid uuid := auth.uid();
	v_role text;
begin
	v_role := public.vtt_require_member(p_campaign_id);
	if v_role not in ('owner', 'editor') then
		raise exception 'Só o mestre pode iniciar a sessão da mesa.'
			using errcode = '42501';
	end if;
	return public.vtt_open_feed_session(p_campaign_id, v_uid, true);
end;
$$;

-- -----------------------------------------------------------------------------
-- RLS. Sem USING (true). Sem INSERT/UPDATE/DELETE para o cliente.
-- Não usar FORCE ROW LEVEL SECURITY: as RPCs são o dono da tabela e precisam
-- passar para gravar. authenticated não é dono e não tem policy de escrita.
-- -----------------------------------------------------------------------------

alter table public.vtt_feed_sessions enable row level security;
alter table public.vtt_rolls enable row level security;
alter table public.vtt_roll_results enable row level security;

drop policy if exists "Members read feed sessions" on public.vtt_feed_sessions;
create policy "Members read feed sessions"
	on public.vtt_feed_sessions
	for select
	using (
		exists (
			select 1
			from public.memberships m
			where m.campaign_id = vtt_feed_sessions.campaign_id
				and m.user_id = auth.uid()
				and (
					m.role in ('owner', 'editor')
					or (
						m.role = 'viewer'
						and vtt_feed_sessions.id = (
							select c.current_feed_session_id
							from public.campaigns c
							where c.id = vtt_feed_sessions.campaign_id
						)
					)
				)
		)
	);

drop policy if exists "Members read current feed" on public.vtt_rolls;
create policy "Members read current feed"
	on public.vtt_rolls
	for select
	using (
		exists (
			select 1
			from public.memberships m
			where m.campaign_id = vtt_rolls.campaign_id
				and m.user_id = auth.uid()
				and (
					m.role in ('owner', 'editor')
					or (
						m.role = 'viewer'
						and vtt_rolls.session_id = (
							select c.current_feed_session_id
							from public.campaigns c
							where c.id = vtt_rolls.campaign_id
						)
					)
				)
		)
	);

-- Autor vê o próprio resultado na sessão corrente (o viewer não consegue
-- rolar em segredo). Owner/editor vê resultado de qualquer sessão, secreto
-- inclusive. Viewer vê resultado público só da sessão corrente.
drop policy if exists "Members read roll results" on public.vtt_roll_results;
create policy "Members read roll results"
	on public.vtt_roll_results
	for select
	using (
		exists (
			select 1
			from public.vtt_rolls r
			join public.memberships m
				on m.campaign_id = r.campaign_id
				and m.user_id = auth.uid()
			where r.id = vtt_roll_results.roll_id
				and (
					m.role in ('owner', 'editor')
					or (
						m.role = 'viewer'
						and r.session_id = (
							select c.current_feed_session_id
							from public.campaigns c
							where c.id = r.campaign_id
						)
						and (
							r.is_secret = false
							or r.author_id = auth.uid()
						)
					)
				)
		)
	);

revoke all on table public.vtt_feed_sessions from public, anon, authenticated;
revoke all on table public.vtt_rolls from public, anon, authenticated;
revoke all on table public.vtt_roll_results from public, anon, authenticated;

grant select on table public.vtt_feed_sessions to authenticated;
grant select on table public.vtt_rolls to authenticated;
grant select on table public.vtt_roll_results to authenticated;

do $$
begin
	if exists (select 1 from pg_roles where rolname = 'service_role') then
		grant select, insert, update, delete on table public.vtt_feed_sessions to service_role;
		grant select, insert, update, delete on table public.vtt_rolls to service_role;
		grant select, insert, update, delete on table public.vtt_roll_results to service_role;
	end if;
end $$;

revoke all on function public.parse_dice_formula(text) from public, anon, authenticated;
revoke all on function public.vtt_require_member(uuid) from public, anon, authenticated;
revoke all on function public.vtt_assert_scene(uuid, uuid) from public, anon, authenticated;
revoke all on function public.vtt_assert_character(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.vtt_open_feed_session(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.campaigns_feed_session_guard() from public, anon, authenticated;

revoke all on function public.roll_dice(uuid, uuid, text, boolean, text, uuid) from public, anon;
revoke all on function public.post_table_message(uuid, uuid, text, uuid) from public, anon;
revoke all on function public.start_feed_session(uuid) from public, anon;

grant execute on function public.roll_dice(uuid, uuid, text, boolean, text, uuid) to authenticated;
grant execute on function public.post_table_message(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.start_feed_session(uuid) to authenticated;

do $$
begin
	if exists (select 1 from pg_roles where rolname = 'service_role') then
		grant execute on function public.roll_dice(uuid, uuid, text, boolean, text, uuid) to service_role;
		grant execute on function public.post_table_message(uuid, uuid, text, uuid) to service_role;
		grant execute on function public.start_feed_session(uuid) to service_role;
		revoke all on function public.parse_dice_formula(text) from service_role;
		revoke all on function public.vtt_require_member(uuid) from service_role;
		revoke all on function public.vtt_assert_scene(uuid, uuid) from service_role;
		revoke all on function public.vtt_assert_character(uuid, uuid, text) from service_role;
		revoke all on function public.vtt_open_feed_session(uuid, uuid, boolean) from service_role;
		revoke all on function public.campaigns_feed_session_guard() from service_role;
	end if;
end $$;

-- O dono precisa executar os helpers por dentro das RPCs depois do REVOKE em PUBLIC.
do $$
begin
	execute format(
		'grant execute on function public.parse_dice_formula(text) to %I',
		current_user
	);
	execute format(
		'grant execute on function public.vtt_require_member(uuid) to %I',
		current_user
	);
	execute format(
		'grant execute on function public.vtt_assert_scene(uuid, uuid) to %I',
		current_user
	);
	execute format(
		'grant execute on function public.vtt_assert_character(uuid, uuid, text) to %I',
		current_user
	);
	execute format(
		'grant execute on function public.vtt_open_feed_session(uuid, uuid, boolean) to %I',
		current_user
	);
end $$;

-- -----------------------------------------------------------------------------
-- Realtime: somente o feed. Identidade full para o filtro de RLS no UPDATE.
-- -----------------------------------------------------------------------------

alter table public.vtt_rolls replica identity full;

do $$
declare
	pub_id oid;
begin
	if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
		create publication supabase_realtime;
	end if;

	select oid into pub_id from pg_publication where pubname = 'supabase_realtime';

	if not exists (
		select 1
		from pg_publication_rel
		where prpubid = pub_id
			and prrelid = 'public.vtt_rolls'::regclass
	) then
		alter publication supabase_realtime add table public.vtt_rolls;
	end if;
end $$;

commit;
