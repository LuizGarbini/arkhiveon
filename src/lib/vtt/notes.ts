/**
 * Notas privadas da mesa. Cada pessoa tem as próprias notas em cada campanha:
 * o mestre lê só as dele ("Notas do mestre"), o jogador só as dele ("Minhas
 * notas"). A privacidade é garantida pelo banco (0070), não por esta tela.
 */
export const NOTE_TITLE_MAX = 120;
export const NOTE_BODY_MAX = 20000;
export const NOTES_MAX = 200;

export interface VttNote {
	id: string;
	campaignId: string;
	title: string;
	body: string;
	createdAt: string;
	updatedAt: string;
}

/** Lê uma linha de `vtt_notes`; devolve `null` se não parecer uma nota. */
export function mapNoteRow(row: unknown): VttNote | null {
	if (!row || typeof row !== "object") return null;
	const r = row as Record<string, unknown>;
	if (
		typeof r.id !== "string" ||
		typeof r.campaign_id !== "string" ||
		typeof r.created_at !== "string" ||
		typeof r.updated_at !== "string"
	)
		return null;
	return {
		id: r.id,
		campaignId: r.campaign_id,
		title: typeof r.title === "string" ? r.title : "",
		body: typeof r.body === "string" ? r.body : "",
		createdAt: r.created_at,
		updatedAt: r.updated_at,
	};
}

export function clampTitle(title: string): string {
	return title.slice(0, NOTE_TITLE_MAX);
}

export function clampBody(body: string): string {
	return body.slice(0, NOTE_BODY_MAX);
}

/** Nota nova, ainda só na tela (o id já é o definitivo, vindo do cliente). */
export function newNote(
	campaignId: string,
	id: string = crypto.randomUUID(),
	now: Date = new Date(),
): VttNote {
	const iso = now.toISOString();
	return {
		id,
		campaignId,
		title: "",
		body: "",
		createdAt: iso,
		updatedAt: iso,
	};
}

const firstLine = (text: string): string =>
	text
		.split("\n")
		.map((line) => line.trim())
		.find(Boolean) ?? "";

/** O título, ou a primeira linha do texto quando não há título. */
export function noteTitle(note: Pick<VttNote, "title" | "body">): string {
	const title = note.title.trim();
	if (title) return title;
	const line = firstLine(note.body);
	if (line) return line.length > 60 ? `${line.slice(0, 57)}…` : line;
	return "Nota sem título";
}

/** Prévia do texto na lista (sem repetir a linha usada como título). */
export function noteSnippet(note: Pick<VttNote, "title" | "body">): string {
	let body = note.body;
	if (!note.title.trim()) {
		const first = firstLine(body);
		const at = first ? body.indexOf(first) : -1;
		if (at >= 0) body = body.slice(at + first.length);
	}
	const flat = body.replace(/\s+/g, " ").trim();
	return flat.length > 90 ? `${flat.slice(0, 87)}…` : flat;
}

/** Mais recentes primeiro. */
export function sortNotes(notes: readonly VttNote[]): VttNote[] {
	return [...notes].sort((a, b) =>
		a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0,
	);
}

function fold(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "");
}

/** Busca no título e no texto, sem diferenciar acento nem maiúscula. */
export function filterNotes(
	notes: readonly VttNote[],
	query: string,
): VttNote[] {
	const q = fold(query.trim());
	if (!q) return [...notes];
	return notes.filter(
		(note) => fold(note.title).includes(q) || fold(note.body).includes(q),
	);
}

/** "agora", "há 5 min", "há 3 h", "ontem" ou a data. */
export function relativeTime(iso: string, now: Date = new Date()): string {
	const then = new Date(iso);
	const ms = now.getTime() - then.getTime();
	if (!Number.isFinite(ms)) return "";
	if (ms < 60_000) return "agora";
	const min = Math.floor(ms / 60_000);
	if (min < 60) return `há ${min} min`;
	const hours = Math.floor(min / 60);
	if (hours < 24) return `há ${hours} h`;
	const days = Math.floor(hours / 24);
	if (days === 1) return "ontem";
	if (days < 7) return `há ${days} dias`;
	return then.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
