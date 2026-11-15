import { getSupabase } from "@/lib/supabase";
import {
	clampBody,
	clampTitle,
	mapNoteRow,
	NOTES_MAX,
	newNote,
	type VttNote,
} from "./notes";
import { useNotesStore } from "./notes-store";

type DbError = { code?: string; message?: string } | null | undefined;

/** O banco ainda não tem a tabela (migração 0070 pendente). */
export function isMissingNotesTable(error: DbError): boolean {
	if (!error) return false;
	if (error.code === "42P01" || error.code === "PGRST205") return true;
	return (
		/vtt_notes/.test(error.message ?? "") &&
		/exist|schema cache/i.test(error.message ?? "")
	);
}

/** Passou do limite de notas (gatilho do banco, 54000). */
const isLimitError = (error: DbError) => error?.code === "54000";

export const NOTE_AUTOSAVE_MS = 800;

/** Timers e contadores por nota: ficam fora do React de propósito. */
const timers = new Map<string, ReturnType<typeof setTimeout>>();
/** Sobe a cada edição; um salvamento só vale "salvo" se ninguém editou depois. */
const versions = new Map<string, number>();
let loadRequest = 0;

const storeNote = (id: string) =>
	useNotesStore.getState().notes.find((n) => n.id === id);

export async function loadNotes(campaignId: string): Promise<void> {
	const requestId = ++loadRequest;
	const store = useNotesStore.getState();
	if (store.campaignId !== campaignId) {
		store.reset();
		store.setCampaign(campaignId);
	}
	const client = getSupabase();
	if (!client) {
		useNotesStore.getState().setStatus("error");
		return;
	}
	useNotesStore.getState().setStatus("loading");
	let data: unknown[] | null = null;
	let error: DbError = null;
	try {
		const result = await client
			.from("vtt_notes")
			.select("*")
			.eq("campaign_id", campaignId)
			.order("updated_at", { ascending: false })
			.limit(NOTES_MAX);
		data = result.data;
		error = result.error;
	} catch {
		if (requestId === loadRequest) useNotesStore.getState().setStatus("error");
		return;
	}
	if (requestId !== loadRequest) return;
	const now = useNotesStore.getState();
	if (now.campaignId !== campaignId) return;
	if (error) {
		now.setStatus(isMissingNotesTable(error) ? "missing" : "error");
		return;
	}
	const loaded = (data ?? [])
		.map(mapNoteRow)
		.filter((n): n is VttNote => n !== null);
	// O que está na tela e ainda não foi gravado vale mais que o do banco.
	const pending = new Set(
		Object.entries(now.saveState)
			.filter(([, s]) => s !== "saved")
			.map(([id]) => id),
	);
	const local = new Map(now.notes.map((n) => [n.id, n]));
	const merged = loaded.map((n) =>
		pending.has(n.id) ? (local.get(n.id) ?? n) : n,
	);
	for (const id of pending) {
		const note = local.get(id);
		if (note && !merged.some((n) => n.id === id)) merged.unshift(note);
	}
	now.setNotes(merged);
	now.setStatus("ready");
}

function failureText(error: DbError, fallback: string): string {
	if (isMissingNotesTable(error))
		return "As notas chegam quando a atualização do banco for aplicada.";
	if (isLimitError(error)) return `Limite de ${NOTES_MAX} notas por campanha.`;
	return fallback;
}

/** Cria uma nota vazia, abre o editor e grava. Falhando, ela some e avisa. */
export async function createNote(): Promise<string | null> {
	const { campaignId, notes } = useNotesStore.getState();
	if (!campaignId) return null;
	const store = useNotesStore.getState();
	store.setNotice(null);
	if (notes.length >= NOTES_MAX) {
		store.setNotice(`Limite de ${NOTES_MAX} notas por campanha.`);
		return null;
	}
	const note = newNote(campaignId);
	store.upsertNote(note);
	store.openNote(note.id);
	store.setSaveState(note.id, "saving");
	const client = getSupabase();
	if (!client) {
		fail(note.id, "Sem conexão: a nota não foi criada.");
		return null;
	}
	try {
		const { error } = await client
			.from("vtt_notes")
			.insert({ id: note.id, campaign_id: campaignId, title: "", body: "" });
		if (error) {
			fail(note.id, failureText(error, "Não foi possível criar a nota."));
			return null;
		}
	} catch {
		fail(note.id, "Sem conexão: a nota não foi criada.");
		return null;
	}
	const current = useNotesStore.getState();
	if (current.saveState[note.id] === "saving")
		current.setSaveState(note.id, "saved");
	return note.id;

	function fail(id: string, message: string) {
		const s = useNotesStore.getState();
		s.removeNote(id);
		s.setNotice(message);
	}
}

/** Edita na tela na hora e grava sozinho logo depois que a pessoa para de digitar. */
export function editNote(
	id: string,
	patch: Partial<Pick<VttNote, "title" | "body">>,
): void {
	const note = storeNote(id);
	if (!note) return;
	const next: VttNote = {
		...note,
		...(patch.title !== undefined ? { title: clampTitle(patch.title) } : {}),
		...(patch.body !== undefined ? { body: clampBody(patch.body) } : {}),
		updatedAt: new Date().toISOString(),
	};
	if (next.title === note.title && next.body === note.body) return;
	const store = useNotesStore.getState();
	store.upsertNote(next);
	store.setSaveState(id, "dirty");
	versions.set(id, (versions.get(id) ?? 0) + 1);
	const timer = timers.get(id);
	if (timer) clearTimeout(timer);
	timers.set(
		id,
		setTimeout(() => {
			timers.delete(id);
			void saveNote(id);
		}, NOTE_AUTOSAVE_MS),
	);
}

/** Grava agora o que está pendente (sair da nota, fechar o painel, trocar de aba). */
export async function flushNote(id: string): Promise<void> {
	const timer = timers.get(id);
	if (timer) {
		clearTimeout(timer);
		timers.delete(id);
	}
	const state = useNotesStore.getState().saveState[id];
	if (state === "dirty" || state === "error") await saveNote(id);
}

export async function flushAllNotes(): Promise<void> {
	const ids = Object.entries(useNotesStore.getState().saveState)
		.filter(([, s]) => s === "dirty" || s === "error")
		.map(([id]) => id);
	await Promise.all(ids.map((id) => flushNote(id)));
}

async function saveNote(id: string): Promise<void> {
	const note = storeNote(id);
	if (!note) return;
	const sentVersion = versions.get(id) ?? 0;
	const store = useNotesStore.getState();
	store.setSaveState(id, "saving");
	const client = getSupabase();
	if (!client) {
		store.setSaveState(id, "error");
		return;
	}
	let error: DbError = null;
	try {
		const result = await client
			.from("vtt_notes")
			.update({ title: note.title, body: note.body })
			.eq("id", id);
		error = result.error;
	} catch {
		error = { message: "offline" };
	}
	const now = useNotesStore.getState();
	if (!storeNote(id)) return; // apagada enquanto gravava
	if (error) {
		now.setSaveState(id, "error");
		return;
	}
	// Se a pessoa digitou durante a gravação, já há outra agendada: continua pendente.
	if ((versions.get(id) ?? 0) === sentVersion) now.setSaveState(id, "saved");
	else now.setSaveState(id, "dirty");
}

/** Apaga: some da tela na hora; se o banco recusar, volta e avisa. */
export async function removeNoteById(id: string): Promise<void> {
	const note = storeNote(id);
	if (!note) return;
	const timer = timers.get(id);
	if (timer) {
		clearTimeout(timer);
		timers.delete(id);
	}
	versions.delete(id);
	const store = useNotesStore.getState();
	store.setNotice(null);
	const wasActive = store.activeId === id;
	store.removeNote(id);
	const client = getSupabase();
	let error: DbError = null;
	if (!client) error = { message: "offline" };
	else {
		try {
			const result = await client.from("vtt_notes").delete().eq("id", id);
			error = result.error;
		} catch {
			error = { message: "offline" };
		}
	}
	if (!error) return;
	const now = useNotesStore.getState();
	now.upsertNote(note);
	now.setSaveState(id, "saved");
	if (wasActive) now.openNote(id);
	now.setNotice("Não foi possível apagar a nota. Ela foi mantida.");
}

/** Para testes: limpa timers e contadores. */
export function resetNotesSync(): void {
	for (const t of timers.values()) clearTimeout(t);
	timers.clear();
	versions.clear();
	loadRequest = 0;
}
