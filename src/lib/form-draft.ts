import { isDeepEqual } from "./deep-equal";

const FORM_DRAFT_PREFIX = "arkhiveon:draft:";
const FORM_DRAFT_VERSION = 1;

export type DraftPolicy<T extends object> = {
	/** Valor já salvo ou o inicial do formulário. */
	saved: T;
	/** Campos obrigatórios. String em branco (depois do trim) conta como vazio. */
	required: readonly (keyof T)[];
};

export type FormDraftEnvelope<T> = {
	v: 1;
	savedAt: number;
	values: T;
};

function draftStorageKey(formId: string, entityId?: string | null): string {
	const id = entityId ? entityId : "novo";
	return `${FORM_DRAFT_PREFIX}${formId}:${id}`;
}

function getSessionStorage(): Storage | null {
	try {
		if (typeof window === "undefined") return null;
		return window.sessionStorage;
	} catch {
		return null;
	}
}

function isDraftEnvelope<T>(value: unknown): value is FormDraftEnvelope<T> {
	if (typeof value !== "object" || value === null) return false;
	const record = value as Record<string, unknown>;
	return (
		record.v === FORM_DRAFT_VERSION &&
		typeof record.savedAt === "number" &&
		"values" in record &&
		record.values !== undefined &&
		record.values !== null
	);
}

/** Lê o rascunho. Null se não houver, o JSON for inválido ou o storage falhar. */
export function readDraft<T>(
	formId: string,
	entityId?: string | null,
): T | null {
	const storage = getSessionStorage();
	if (!storage) return null;
	try {
		const raw = storage.getItem(draftStorageKey(formId, entityId));
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		if (!isDraftEnvelope<T>(parsed)) return null;
		return parsed.values;
	} catch {
		return null;
	}
}

/** Grava `{ v: 1, savedAt, values }`. Não lança se o storage falhar. */
export function writeDraft<T>(
	formId: string,
	entityId: string | null | undefined,
	values: T,
): void {
	const storage = getSessionStorage();
	if (!storage) return;
	try {
		const envelope: FormDraftEnvelope<T> = {
			v: FORM_DRAFT_VERSION,
			savedAt: Date.now(),
			values,
		};
		storage.setItem(
			draftStorageKey(formId, entityId),
			JSON.stringify(envelope),
		);
	} catch {
		// sessionStorage indisponível ou cheio
	}
}

export function clearDraft(formId: string, entityId?: string | null): void {
	const storage = getSessionStorage();
	if (!storage) return;
	try {
		storage.removeItem(draftStorageKey(formId, entityId));
	} catch {
		// sessionStorage indisponível
	}
}

function isBlankDraftValue(value: unknown): boolean {
	if (value == null) return true;
	if (typeof value === "string") return value.trim() === "";
	return false;
}

function normalizeDraftValue(value: unknown): unknown {
	if (typeof value === "string") return value.trim();
	return value;
}

function isDraftRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Vazio: algum campo obrigatório em branco, ou o valor (com trim nas strings)
 * igual ao salvo/inicial.
 */
export function isVacantDraft<T extends object>(
	values: T,
	policy: DraftPolicy<T>,
): boolean {
	const current = values as Record<string, unknown>;
	const saved = policy.saved as Record<string, unknown>;
	for (const key of policy.required) {
		if (isBlankDraftValue(current[String(key)])) return true;
	}
	const keys = new Set([...Object.keys(current), ...Object.keys(saved)]);
	for (const key of keys) {
		if (
			!isDeepEqual(
				normalizeDraftValue(current[key]),
				normalizeDraftValue(saved[key]),
			)
		) {
			return false;
		}
	}
	return true;
}

/** Grava só se o rascunho não for vazio. Se for, apaga a chave. */
export function persistDraft<T extends object>(
	formId: string,
	entityId: string | null | undefined,
	values: T,
	policy: DraftPolicy<T>,
): void {
	if (isVacantDraft(values, policy)) {
		clearDraft(formId, entityId);
		return;
	}
	writeDraft(formId, entityId, values);
}

/**
 * Lê o rascunho. Se for vazio em relação ao salvo, apaga a chave e devolve null.
 */
export function readRestorableDraft<T extends object>(
	formId: string,
	entityId: string | null | undefined,
	policy: DraftPolicy<T>,
): T | null {
	const stored = readDraft<unknown>(formId, entityId);
	if (!isDraftRecord(stored)) return null;
	const values = stored as T;
	if (isVacantDraft(values, policy)) {
		clearDraft(formId, entityId);
		return null;
	}
	return values;
}

/** Remove todas as chaves `arkhiveon:draft:`. */
export function clearAllDrafts(): void {
	const storage = getSessionStorage();
	if (!storage) return;
	try {
		const keys: string[] = [];
		for (let index = 0; index < storage.length; index++) {
			const key = storage.key(index);
			if (key?.startsWith(FORM_DRAFT_PREFIX)) keys.push(key);
		}
		for (const key of keys) storage.removeItem(key);
	} catch {
		// sessionStorage indisponível
	}
}
