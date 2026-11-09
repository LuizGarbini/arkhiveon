import type { Json } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";

const SESSION_PREFIX = "arkhiveon-ammo-consume:";
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AmmoConsumeBindings = {
	userId: string;
	campaignId: string;
	characterId: string;
	inventoryEntryId: string;
};

export type ConsumeAmmoResult = {
	consumption_id: string;
	quantity: number | null;
	snapshot: Json;
	roll: Json | null;
	replayed: boolean;
};

export type CompleteAmmoRollResult = {
	consumption_id: string;
	roll: Json;
	replayed: boolean;
};

type SessionStore = {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
};

type RpcErrorLike = {
	code?: string | null;
	message?: string | null;
};

export class AmmoConsumeError extends Error {
	readonly code: string | null;
	constructor(message: string, code: string | null = null) {
		super(message);
		this.name = "AmmoConsumeError";
		this.code = code;
	}
}

export class AmmoConsumeOfflineError extends AmmoConsumeError {
	constructor() {
		super("Sem conexão: o consumo de munição não foi enviado.", "offline");
		this.name = "AmmoConsumeOfflineError";
	}
}

export class AmmoConsumeUnavailableError extends AmmoConsumeError {
	constructor() {
		super(
			"O consumo de munição ainda não está disponível no servidor.",
			"unavailable",
		);
		this.name = "AmmoConsumeUnavailableError";
	}
}

export class AmmoConsumeAmbiguousError extends AmmoConsumeError {
	readonly consumptionId: string;
	readonly bindings: AmmoConsumeBindings;
	constructor(consumptionId: string, bindings: AmmoConsumeBindings) {
		super(
			"Não foi possível confirmar o consumo. Use o mesmo identificador para retomar.",
			"ambiguous",
		);
		this.name = "AmmoConsumeAmbiguousError";
		this.consumptionId = consumptionId;
		this.bindings = bindings;
	}
}

export function consumeSessionKey(bindings: AmmoConsumeBindings): string {
	return `${SESSION_PREFIX}${bindings.userId}:${bindings.campaignId}:${bindings.characterId}:${bindings.inventoryEntryId}`;
}

export function isConsumeId(value: string | null | undefined): value is string {
	return typeof value === "string" && UUID_RE.test(value);
}

function getSessionStore(): SessionStore | null {
	try {
		if (typeof window === "undefined") return null;
		return window.sessionStorage;
	} catch {
		return null;
	}
}

function newConsumeId(): string {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return crypto.randomUUID();
	}
	throw new AmmoConsumeError(
		"Não foi possível gerar o identificador de consumo.",
	);
}

/** Gera e persiste o UUID ANTES da chamada. Mesmos bindings reutilizam o id. */
export function ensureConsumeId(
	bindings: AmmoConsumeBindings,
	store: SessionStore | null = getSessionStore(),
	createId: () => string = newConsumeId,
): string {
	const key = consumeSessionKey(bindings);
	const existing = store?.getItem(key) ?? null;
	if (isConsumeId(existing)) return existing;
	const id = createId();
	if (!isConsumeId(id)) {
		throw new AmmoConsumeError("Identificador de consumo inválido.");
	}
	store?.setItem(key, id);
	return id;
}

export function peekConsumeId(
	bindings: AmmoConsumeBindings,
	store: SessionStore | null = getSessionStore(),
): string | null {
	const value = store?.getItem(consumeSessionKey(bindings)) ?? null;
	return isConsumeId(value) ? value : null;
}

export function isNavigatorOffline(): boolean {
	return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isMissingAmmoRpc(error: RpcErrorLike | null | undefined): boolean {
	if (!error) return false;
	if (
		error.code === "PGRST202" ||
		error.code === "42883" ||
		error.code === "PGRST204"
	) {
		return true;
	}
	const message = error.message ?? "";
	return (
		/consume_ammo|set_ammo_quantity|get_ammo_consumption|complete_ammo_consumption_roll/i.test(
			message,
		) && /exist|schema cache|function|could not find/i.test(message)
	);
}

export function toAmmoConsumeError(
	error: unknown,
	fallback = "Não foi possível consumir a munição.",
): AmmoConsumeError {
	if (error instanceof AmmoConsumeError) return error;
	if (typeof error === "object" && error !== null) {
		const record = error as RpcErrorLike;
		const message =
			typeof record.message === "string" && record.message
				? record.message
				: fallback;
		const code =
			typeof record.code === "string" && record.code ? record.code : null;
		if (isMissingAmmoRpc(record)) return new AmmoConsumeUnavailableError();
		return new AmmoConsumeError(message, code);
	}
	if (error instanceof Error && error.message) {
		return new AmmoConsumeError(error.message, null);
	}
	return new AmmoConsumeError(fallback);
}

function asResult(data: unknown): ConsumeAmmoResult {
	if (!data || typeof data !== "object") {
		throw new AmmoConsumeError("Resposta de consumo inválida.");
	}
	const row = data as Record<string, unknown>;
	if (
		!isConsumeId(
			typeof row.consumption_id === "string" ? row.consumption_id : null,
		)
	) {
		throw new AmmoConsumeError("Resposta de consumo inválida.");
	}
	const quantity =
		typeof row.quantity === "number"
			? row.quantity
			: row.quantity === null
				? null
				: null;
	return {
		consumption_id: row.consumption_id as string,
		quantity,
		snapshot: (row.snapshot ?? {}) as Json,
		roll: (row.roll ?? null) as Json | null,
		replayed: row.replayed === true,
	};
}

type ConsumeRpc = (args: {
	p_consumption_id: string;
	p_campaign_id: string;
	p_character_id: string;
	p_inventory_entry_id: string;
	p_merged_formula?: string | null;
}) => Promise<{ data: unknown; error: RpcErrorLike | null }>;

type GetRpc = (args: {
	p_consumption_id: string;
	p_campaign_id: string;
	p_character_id: string;
	p_inventory_entry_id: string;
}) => Promise<{ data: unknown; error: RpcErrorLike | null }>;

function defaultConsumeRpc(): ConsumeRpc {
	return async (args) => {
		const client = getSupabase();
		if (!client) {
			throw new AmmoConsumeError("Sem conexão para consumir munição.");
		}
		return client.rpc("consume_ammo", args);
	};
}

function defaultGetRpc(): GetRpc {
	return async (args) => {
		const client = getSupabase();
		if (!client) {
			throw new AmmoConsumeError("Sem conexão para consultar o consumo.");
		}
		return client.rpc("get_ammo_consumption", args);
	};
}

/**
 * Cliente fino: sem UI e sem save otimista de inventoryList.
 * UUID vai para sessionStorage antes da RPC. Retry reusa o mesmo id.
 * Troca de conta/campanha (bindings) não reescreve a sessão anterior.
 */
export async function consumeAmmo(input: {
	bindings: AmmoConsumeBindings;
	mergedFormula?: string | null;
	rpc?: ConsumeRpc;
	get?: GetRpc;
	store?: SessionStore | null;
	offline?: boolean;
}): Promise<ConsumeAmmoResult> {
	if (input.offline ?? isNavigatorOffline()) {
		throw new AmmoConsumeOfflineError();
	}
	const store = input.store === undefined ? getSessionStore() : input.store;
	const consumptionId = ensureConsumeId(input.bindings, store);
	const rpc = input.rpc ?? defaultConsumeRpc();
	const get = input.get ?? defaultGetRpc();
	const args = {
		p_consumption_id: consumptionId,
		p_campaign_id: input.bindings.campaignId,
		p_character_id: input.bindings.characterId,
		p_inventory_entry_id: input.bindings.inventoryEntryId,
		p_merged_formula: input.mergedFormula ?? null,
	};
	let sent = false;
	try {
		const pending = rpc(args);
		sent = true;
		const { data, error } = await pending;
		if (error) {
			if (error.code === "23505") {
				const replay = await get({
					p_consumption_id: consumptionId,
					p_campaign_id: input.bindings.campaignId,
					p_character_id: input.bindings.characterId,
					p_inventory_entry_id: input.bindings.inventoryEntryId,
				});
				if (replay.error) throw toAmmoConsumeError(replay.error);
				return asResult(replay.data);
			}
			throw toAmmoConsumeError(error);
		}
		return asResult(data);
	} catch (error) {
		if (error instanceof AmmoConsumeOfflineError) throw error;
		if (error instanceof AmmoConsumeUnavailableError) throw error;
		if (error instanceof AmmoConsumeError && error.code === "42501")
			throw error;
		if (error instanceof AmmoConsumeError && error.code === "22023")
			throw error;
		if (error instanceof AmmoConsumeError && error.code === "40001")
			throw error;
		if (sent) {
			try {
				const replay = await get({
					p_consumption_id: consumptionId,
					p_campaign_id: input.bindings.campaignId,
					p_character_id: input.bindings.characterId,
					p_inventory_entry_id: input.bindings.inventoryEntryId,
				});
				if (!replay.error && replay.data) return asResult(replay.data);
			} catch {
				/* ACK ambíguo abaixo */
			}
			throw new AmmoConsumeAmbiguousError(consumptionId, input.bindings);
		}
		throw toAmmoConsumeError(error);
	}
}

export async function getAmmoConsumption(input: {
	bindings: AmmoConsumeBindings;
	consumptionId: string;
	get?: GetRpc;
	offline?: boolean;
}): Promise<ConsumeAmmoResult> {
	if (input.offline ?? isNavigatorOffline()) {
		throw new AmmoConsumeOfflineError();
	}
	const get = input.get ?? defaultGetRpc();
	const { data, error } = await get({
		p_consumption_id: input.consumptionId,
		p_campaign_id: input.bindings.campaignId,
		p_character_id: input.bindings.characterId,
		p_inventory_entry_id: input.bindings.inventoryEntryId,
	});
	if (error) throw toAmmoConsumeError(error, "Não foi possível ler o consumo.");
	return asResult(data);
}

export async function completeAmmoConsumptionRoll(input: {
	bindings: AmmoConsumeBindings;
	consumptionId: string;
	sceneId?: string | null;
	secret?: boolean;
	label?: string | null;
	offline?: boolean;
}): Promise<CompleteAmmoRollResult> {
	if (input.offline ?? isNavigatorOffline()) {
		throw new AmmoConsumeOfflineError();
	}
	const client = getSupabase();
	if (!client) {
		throw new AmmoConsumeError("Sem conexão para retomar a rolagem.");
	}
	const { data, error } = await client.rpc("complete_ammo_consumption_roll", {
		p_consumption_id: input.consumptionId,
		p_campaign_id: input.bindings.campaignId,
		p_character_id: input.bindings.characterId,
		p_inventory_entry_id: input.bindings.inventoryEntryId,
		p_scene_id: input.sceneId ?? null,
		p_secret: input.secret ?? false,
		p_label: input.label ?? null,
	});
	if (error)
		throw toAmmoConsumeError(error, "Não foi possível retomar a rolagem.");
	if (!data || typeof data !== "object") {
		throw new AmmoConsumeError("Resposta de rolagem inválida.");
	}
	const row = data as Record<string, unknown>;
	return {
		consumption_id: input.consumptionId,
		roll: (row.roll ?? null) as Json,
		replayed: row.replayed === true,
	};
}

export async function setAmmoQuantity(input: {
	campaignId: string;
	characterId: string;
	inventoryEntryId: string;
	expected: number;
	next: number;
	offline?: boolean;
}): Promise<{ quantity: number }> {
	if (input.offline ?? isNavigatorOffline()) {
		throw new AmmoConsumeOfflineError();
	}
	const client = getSupabase();
	if (!client) {
		throw new AmmoConsumeError("Sem conexão para alterar a munição.");
	}
	const { data, error } = await client.rpc("set_ammo_quantity", {
		p_character_id: input.characterId,
		p_campaign_id: input.campaignId,
		p_inventory_entry_id: input.inventoryEntryId,
		p_expected: input.expected,
		p_new: input.next,
	});
	if (error)
		throw toAmmoConsumeError(error, "Não foi possível alterar a munição.");
	if (!data || typeof data !== "object") {
		throw new AmmoConsumeError("Resposta de quantidade inválida.");
	}
	const quantity = (data as { quantity?: unknown }).quantity;
	if (typeof quantity !== "number") {
		throw new AmmoConsumeError("Resposta de quantidade inválida.");
	}
	return { quantity };
}
