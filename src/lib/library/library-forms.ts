/**
 * Biblioteca de PDFs (Fatia 2) — valores dos campos por pessoa.
 * O PDF original no R2 não muda: cada pessoa guarda a sua cópia dos campos
 * em `campaign_library_form_values` (RLS: só a própria linha).
 */
import { getSupabase } from "../supabase";

export const LIBRARY_FORM_VALUES_TABLE = "campaign_library_form_values";
/** Espera depois da última digitação antes de salvar. */
export const LIBRARY_AUTOSAVE_DELAY_MS = 800;
/** Mesmo teto da coluna (pg_column_size ≤ 256 KB), com folga. */
export const LIBRARY_FORM_MAX_BYTES = 200_000;

export type FormValues = Record<string, string>;
export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface FormQuery {
	select: (cols: string) => FormQuery;
	eq: (col: string, value: string) => FormQuery;
	maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
	upsert: (
		row: Record<string, unknown>,
		opts: { onConflict: string },
	) => Promise<{ error: unknown }>;
}
interface FormClient {
	from: (table: string) => FormQuery;
	auth: {
		getSession: () => Promise<{
			data: { session: { user: { id: string } } | null };
		}>;
	};
}

function formClient(): FormClient | null {
	return getSupabase() as unknown as FormClient | null;
}

/** Só pares texto→texto; descarta o resto (defesa contra jsonb estranho). */
export function sanitizeFormValues(input: unknown): FormValues {
	if (!input || typeof input !== "object" || Array.isArray(input)) return {};
	const out: FormValues = {};
	for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
		if (typeof value === "string" && key.length > 0 && key.length <= 300) {
			out[key] = value;
		}
	}
	return out;
}

/** Os mesmos valores? (evita salvar quando nada mudou) */
export function sameFormValues(a: FormValues, b: FormValues): boolean {
	const keys = Object.keys(a);
	if (keys.length !== Object.keys(b).length) return false;
	return keys.every((key) => b[key] === a[key]);
}

export function formValuesTooLarge(values: FormValues): boolean {
	return (
		new TextEncoder().encode(JSON.stringify(values)).length >
		LIBRARY_FORM_MAX_BYTES
	);
}

export function saveStatusLabel(status: SaveStatus): string {
	switch (status) {
		case "saving":
			return "Salvando…";
		case "saved":
			return "✓ Salvo";
		case "error":
			return "Não salvou — tentando de novo";
		default:
			return "";
	}
}

export async function loadFormValues(fileId: string): Promise<FormValues> {
	const client = formClient();
	if (!client) return {};
	const { data, error } = await client
		.from(LIBRARY_FORM_VALUES_TABLE)
		.select("field_values")
		.eq("file_id", fileId)
		.maybeSingle();
	if (error) throw new Error("load");
	return sanitizeFormValues(
		(data as { field_values?: unknown } | null)?.field_values,
	);
}

export async function saveFormValues(
	fileId: string,
	values: FormValues,
): Promise<void> {
	const client = formClient();
	if (!client) throw new Error("offline");
	if (formValuesTooLarge(values)) throw new Error("too-large");
	const { data } = await client.auth.getSession();
	const userId = data.session?.user.id;
	if (!userId) throw new Error("no-session");
	const { error } = await client
		.from(LIBRARY_FORM_VALUES_TABLE)
		.upsert(
			{ file_id: fileId, user_id: userId, field_values: values },
			{ onConflict: "file_id,user_id" },
		);
	if (error) throw new Error("save");
}

/** Nome do arquivo exportado: "<título> (preenchido).pdf", sem caracteres ruins. */
export function exportFileName(title: string): string {
	const safe =
		title
			.replace(/[\\/:*?"<>|]+/g, " ")
			.replace(/\s+/g, " ")
			.trim() || "PDF";
	return `${safe.slice(0, 120)} (preenchido).pdf`;
}

/**
 * Agenda o salvamento: cada mudança reinicia o timer; só a última vai.
 * Erro tenta de novo depois. Sem React, testável.
 */
export function createAutosaver(options: {
	save: (values: FormValues) => Promise<void>;
	onStatus: (status: SaveStatus) => void;
	delayMs?: number;
	retryMs?: number;
}) {
	const delay = options.delayMs ?? LIBRARY_AUTOSAVE_DELAY_MS;
	const retry = options.retryMs ?? 4000;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let pending: FormValues | null = null;
	let lastSaved: FormValues | null = null;
	let inFlight: Promise<void> | null = null;

	async function run() {
		timer = null;
		if (!pending) return;
		if (inFlight) {
			await inFlight;
			return run();
		}
		const values = pending;
		pending = null;
		if (lastSaved && sameFormValues(lastSaved, values)) {
			options.onStatus("saved");
			return;
		}
		options.onStatus("saving");
		inFlight = options.save(values);
		try {
			await inFlight;
			lastSaved = values;
			if (!pending) options.onStatus("saved");
		} catch {
			pending = pending ?? values;
			options.onStatus("error");
			timer = setTimeout(() => void run(), retry);
		} finally {
			inFlight = null;
		}
	}

	return {
		/** Valores já gravados (ex.: os carregados ao abrir). */
		markSaved(values: FormValues) {
			lastSaved = values;
		},
		schedule(values: FormValues) {
			pending = values;
			options.onStatus("saving");
			if (timer) clearTimeout(timer);
			timer = setTimeout(() => void run(), delay);
		},
		/** Salva já o que estiver pendente (ao sair da tela). */
		async flush() {
			if (timer) clearTimeout(timer);
			timer = null;
			await run();
		},
		cancel() {
			if (timer) clearTimeout(timer);
			timer = null;
		},
	};
}
