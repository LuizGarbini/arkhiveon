/**
 * Recursos da ficha usados na mesa: espaços de magia, Inspiração, pontos de
 * destino, dados bônus, salvaguardas contra a morte e dados de vida gastos.
 *
 * Mestre e co-mestre gravam pela ficha normalmente. O jogador não pode
 * regravar a ficha (policy de UPDATE da 0003), então usa a função
 * `set_character_resources` (0069, ampliada na 0078), que só aceita estes
 * campos, validados. Nos dois casos a tela muda na hora e volta ao que estava
 * se a gravação falhar.
 */
import type { Json } from "@/lib/database.types";
import { isDeepEqual } from "@/lib/deep-equal";
import { useRPGStore } from "@/lib/store";
import type { Character, SpellSlotsState } from "@/lib/store/types";
import { getSupabase } from "@/lib/supabase";
import {
	type BonusDie,
	mergeTableResources,
	normalizeTableResources,
	setFate,
	setInspiration,
	type TableResources,
} from "@/lib/table-resources";

export interface ResourceChanges {
	spellSlotsState?: SpellSlotsState;
	/** Quantidade de Inspiração (0 a 99 na função do banco; a ficha não impõe teto). */
	inspiration?: number;
	/** Pontos de destino que ainda sobram (0 até o total da ficha). */
	fate?: number;
	/** Grupos de dados bônus. A função do banco valida lados, quantidade e origem. */
	bonusDice?: BonusDie[];
	deathSaves?: { successes: number; failures: number };
	hitDiceUsed?: number;
}

export type ResourceSaveResult =
	| { ok: true }
	| {
			ok: false;
			reason: "unavailable" | "forbidden" | "invalid" | "offline" | "error";
			message: string;
	  };

type RpcArgs = { p_character_id: string; p_changes: Json };
type Rpc = (args: RpcArgs) => Promise<unknown>;
type Update = (id: string, patch: Partial<Character>) => Promise<unknown>;

/**
 * Quem mexe nos recursos na mesa: mestre, co-mestre, dono/editor da campanha,
 * ou quem criou esta ficha. Outro jogador não.
 */
export function canEditCharacterResources(input: {
	isStaff: boolean;
	isCampaignEditor: boolean;
	userId: string | null | undefined;
	createdBy: string | null | undefined;
}): boolean {
	if (input.isStaff || input.isCampaignEditor) return true;
	return Boolean(input.userId) && input.userId === input.createdBy;
}

const KEYS: readonly (keyof ResourceChanges)[] = [
	"spellSlotsState",
	"inspiration",
	"fate",
	"bonusDice",
	"deathSaves",
	"hitDiceUsed",
];

/** Inspiração, destino e dados bônus no mesmo objeto, sem apagar o resto. */
function nextTableResources(
	character: Character,
	changes: ResourceChanges,
): TableResources | undefined {
	if (
		changes.inspiration === undefined &&
		changes.fate === undefined &&
		changes.bonusDice === undefined
	) {
		return undefined;
	}
	let res = normalizeTableResources(character.tableResources);
	if (changes.inspiration !== undefined) {
		res = setInspiration(res, changes.inspiration);
	}
	if (changes.fate !== undefined) {
		res = setFate(res, changes.fate);
	}
	if (changes.bonusDice !== undefined) {
		res = normalizeTableResources({ ...res, bonusDice: changes.bonusDice });
	}
	return mergeTableResources(character.tableResources, res);
}

/** O que cada mudança vira na ficha local. */
function toPatch(
	character: Character,
	changes: ResourceChanges,
): Partial<Character> {
	const patch: Partial<Character> = {};
	if (changes.spellSlotsState !== undefined)
		patch.spellSlotsState = changes.spellSlotsState;
	if (changes.deathSaves !== undefined) patch.deathSaves = changes.deathSaves;
	if (changes.hitDiceUsed !== undefined)
		patch.hitDiceUsed = changes.hitDiceUsed;
	const tableResources = nextTableResources(character, changes);
	if (tableResources) patch.tableResources = tableResources;
	return patch;
}

/** Só o que de fato mudou (nada de regravar o que já estava igual). */
export function changedResources(
	character: Character,
	changes: ResourceChanges,
): ResourceChanges {
	const out: ResourceChanges = {};
	if (
		changes.spellSlotsState !== undefined &&
		!isDeepEqual(changes.spellSlotsState, character.spellSlotsState)
	)
		out.spellSlotsState = changes.spellSlotsState;
	if (
		changes.deathSaves !== undefined &&
		!isDeepEqual(changes.deathSaves, character.deathSaves)
	)
		out.deathSaves = changes.deathSaves;
	if (
		changes.hitDiceUsed !== undefined &&
		changes.hitDiceUsed !== (character.hitDiceUsed ?? 0)
	)
		out.hitDiceUsed = changes.hitDiceUsed;
	if (changes.inspiration !== undefined) {
		const normalized = normalizeTableResources(character.tableResources);
		const next = setInspiration(normalized, changes.inspiration).inspiration;
		if (next !== normalized.inspiration) out.inspiration = next;
	}
	if (changes.fate !== undefined) {
		const normalized = normalizeTableResources(character.tableResources);
		const next = setFate(normalized, changes.fate).fate;
		if (next !== normalized.fate) out.fate = next;
	}
	if (changes.bonusDice !== undefined) {
		const normalized = normalizeTableResources(character.tableResources);
		const next = normalizeTableResources({
			...normalized,
			bonusDice: changes.bonusDice,
		}).bonusDice;
		if (!isDeepEqual(next, normalized.bonusDice)) out.bonusDice = next;
	}
	return out;
}

type RpcErrorLike = { code?: string | null; message?: string | null };

export function toFailure(
	error: unknown,
): Extract<ResourceSaveResult, { ok: false }> {
	const e = (error ?? {}) as RpcErrorLike;
	if (e.code === "offline") {
		return {
			ok: false,
			reason: "offline",
			message: "Sem conexão: não foi salvo.",
		};
	}
	if (e.code === "PGRST202" || e.code === "42883") {
		return {
			ok: false,
			reason: "unavailable",
			message: "Isto ainda não está disponível no servidor.",
		};
	}
	if (e.code === "42501") {
		return {
			ok: false,
			reason: "forbidden",
			message: e.message || "Você não pode mudar os recursos desta ficha.",
		};
	}
	if (e.code === "22023") {
		return {
			ok: false,
			reason: "invalid",
			message: e.message || "Esse valor não é válido.",
		};
	}
	return { ok: false, reason: "error", message: "Não foi possível salvar." };
}

async function callRpc(args: RpcArgs): Promise<unknown> {
	const client = getSupabase();
	if (!client) throw { code: "offline", message: "Sem conexão." };
	const { data, error } = await client.rpc("set_character_resources", args);
	if (error) throw error;
	return data;
}

function applyLocal(characterId: string, patch: Partial<Character>) {
	useRPGStore.setState((state) => ({
		characters: state.characters.map((c) =>
			c.id === characterId ? { ...c, ...patch } : c,
		),
	}));
}

export async function saveCharacterResources(input: {
	characterId: string;
	changes: ResourceChanges;
	/** Mestre ou co-mestre: grava pela ficha, sem a função do banco. */
	isStaff: boolean;
	rpc?: Rpc;
	update?: Update;
}): Promise<ResourceSaveResult> {
	const existing = useRPGStore
		.getState()
		.characters.find((c) => c.id === input.characterId);
	if (!existing) {
		return { ok: false, reason: "error", message: "Ficha não encontrada." };
	}
	const changes = changedResources(existing, input.changes);
	if (KEYS.every((k) => changes[k] === undefined)) return { ok: true };

	const patch = toPatch(existing, changes);
	const previous: Partial<Character> = {};
	for (const key of Object.keys(patch) as (keyof Character)[]) {
		(previous as Record<string, unknown>)[key] = existing[key];
	}
	applyLocal(input.characterId, patch);

	try {
		if (input.isStaff) {
			await (input.update ?? useRPGStore.getState().updateCharacter)(
				input.characterId,
				patch,
			);
		} else {
			await (input.rpc ?? callRpc)({
				p_character_id: input.characterId,
				p_changes: changes as unknown as Json,
			});
		}
		return { ok: true };
	} catch (error) {
		const now = useRPGStore
			.getState()
			.characters.find((c) => c.id === input.characterId);
		// Só desfaz o que ainda é a nossa mudança (ninguém mexeu nesse meio tempo).
		const stillOurs = Object.entries(patch).every(([key, value]) =>
			now
				? isDeepEqual((now as unknown as Record<string, unknown>)[key], value)
				: false,
		);
		if (stillOurs) applyLocal(input.characterId, previous);
		return toFailure(error);
	}
}
