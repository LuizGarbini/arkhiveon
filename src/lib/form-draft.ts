const FORM_DRAFT_PREFIX = "arkhiveon:draft:";
const FORM_DRAFT_VERSION = 1;

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
