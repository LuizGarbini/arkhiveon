-- 0070 · Notas privadas na mesa (VTT).
--
-- Cada pessoa tem as próprias notas dentro de cada campanha: o mestre usa para
-- preparar a sessão e guardar segredos, o jogador para anotar o que acha
-- importante. A nota é de quem escreveu e de mais ninguém: nem o mestre nem o
-- co-mestre leem as notas de um jogador, e o jogador não lê as do mestre.
--
-- Quem lê, cria, edita e apaga: só o autor (author_id = auth.uid()) e só
-- enquanto for membro da campanha. Quem deixa a campanha perde o acesso às
-- notas dela (as linhas ficam guardadas).
--
-- Limites: título até 120 caracteres, texto até 20.000, 200 notas por pessoa
-- em cada campanha (gatilho vtt_notes_limit).
--
-- A policy usa EXISTS em memberships, sem função solta, pelo mesmo motivo da
-- 0023/0052/0068. Sem Realtime: a nota é privada e a edição é de uma pessoa só.
--
-- Rollback:
--   drop table if exists public.vtt_notes;
--   drop function if exists public.vtt_notes_limit();

begin;

create table if not exists public.vtt_notes (
	id uuid primary key default gen_random_uuid(),
	campaign_id uuid not null references public.campaigns(id) on delete cascade,
	author_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
	title text not null default '',
	body text not null default '',
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint vtt_notes_title_len check (char_length(title) <= 120),
	constraint vtt_notes_body_len check (char_length(body) <= 20000)
);

create index if not exists vtt_notes_author_idx
	on public.vtt_notes (campaign_id, author_id, updated_at desc);

drop trigger if exists vtt_notes_set_updated_at on public.vtt_notes;
create trigger vtt_notes_set_updated_at
before update on public.vtt_notes
for each row execute function public.set_updated_at();

-- O limite de notas é um gatilho, não uma policy: uma policy que consulta a
-- própria tabela dá "infinite recursion detected in policy" (42P17). O gatilho
-- roda como quem insere, então a contagem vê só as notas dele (a RLS vale).
create or replace function public.vtt_notes_limit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if (
		select count(*)
		from public.vtt_notes n
		where n.campaign_id = new.campaign_id
			and n.author_id = new.author_id
	) >= 200 then
		raise exception 'Limite de 200 notas por campanha.'
			using errcode = '54000';
	end if;
	return new;
end;
$$;

drop trigger if exists vtt_notes_limit on public.vtt_notes;
create trigger vtt_notes_limit
before insert on public.vtt_notes
for each row execute function public.vtt_notes_limit();

alter table public.vtt_notes enable row level security;

revoke all on public.vtt_notes from anon;

drop policy if exists "Authors read own notes" on public.vtt_notes;
create policy "Authors read own notes" on public.vtt_notes
for select using (
	author_id = auth.uid()
	and exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_notes.campaign_id
			and m.user_id = auth.uid()
	)
);

drop policy if exists "Authors create own notes" on public.vtt_notes;
create policy "Authors create own notes" on public.vtt_notes
for insert with check (
	author_id = auth.uid()
	and exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_notes.campaign_id
			and m.user_id = auth.uid()
	)
);

drop policy if exists "Authors edit own notes" on public.vtt_notes;
create policy "Authors edit own notes" on public.vtt_notes
for update using (
	author_id = auth.uid()
	and exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_notes.campaign_id
			and m.user_id = auth.uid()
	)
) with check (
	author_id = auth.uid()
	and exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_notes.campaign_id
			and m.user_id = auth.uid()
	)
);

drop policy if exists "Authors delete own notes" on public.vtt_notes;
create policy "Authors delete own notes" on public.vtt_notes
for delete using (
	author_id = auth.uid()
	and exists (
		select 1
		from public.memberships m
		where m.campaign_id = vtt_notes.campaign_id
			and m.user_id = auth.uid()
	)
);

comment on table public.vtt_notes is
	'Notas privadas da mesa: cada pessoa lê e edita só as próprias, dentro da campanha.';

commit;
