import { showToast } from "@/components/ui/toast";
import { useRPGStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

/** Ordem (incluindo fichas vindas do CRIS) não usa `health` da ficha na mesa. */
const SHEET_HP_EXCLUDED_SYSTEMS = new Set(["ordem"]);

export interface SheetHpCharacter {
	id: string;
	system?: string;
	health?: number;
	healthMax?: number;
}

export interface SheetHpState {
	characters: readonly SheetHpCharacter[];
}

export interface ResolvedTokenHp {
	current: number;
	max: number;
	fromSheet: boolean;
}

export interface SetCharacterHpArgs {
	p_character_id: string;
	p_current: number;
	p_max?: number;
}

export interface SetCharacterHpResult {
	health: number;
	healthMax?: number | null;
}

interface StoredHp {
	health: number;
	healthMax: number;
}

export function characterSheetOwnsHp(
	character: { system?: string } | null | undefined,
): boolean {
	if (!character?.system) return false;
	return !SHEET_HP_EXCLUDED_SYSTEMS.has(character.system);
}

export function selectSheetHealth(
	state: SheetHpState,
	characterId: string | null | undefined,
): number | undefined {
	const character = linkedSheetCharacter(state, characterId);
	return typeof character?.health === "number" ? character.health : undefined;
}

export function selectSheetHealthMax(
	state: SheetHpState,
	characterId: string | null | undefined,
): number | undefined {
	const character = linkedSheetCharacter(state, characterId);
	return typeof character?.healthMax === "number"
		? character.healthMax
		: undefined;
}

/** Lê o carimbo primitivo de volta para desenhar a barra sem um objeto novo. */
export function readLinkedSheetHp(
	stamp: string,
	characterId: string | null | undefined,
): { health: number; healthMax: number } | undefined {
	if (!characterId || !stamp) return undefined;
	for (const part of stamp.split(";")) {
		const [id, health, max] = part.split(":");
		if (id !== characterId) continue;
		const current = Number(health);
		if (!Number.isFinite(current)) return undefined;
		const healthMax = max === "" ? current : Number(max);
		return {
			health: current,
			healthMax: Number.isFinite(healthMax) ? healthMax : current,
		};
	}
	return undefined;
}

/** Primitive stamp so the canvas redraws when linked sheet HP changes. */
export function selectLinkedSheetHpStamp(
	characters: readonly SheetHpCharacter[],
	characterIds: string,
): string {
	if (!characterIds) return "";
	const state = { characters };
	let stamp = "";
	for (const id of characterIds.split("|")) {
		const health = selectSheetHealth(state, id);
		if (health === undefined) continue;
		stamp += `${id}:${health}:${selectSheetHealthMax(state, id) ?? ""};`;
	}
	return stamp;
}

export function resolveTokenHp(input: {
	tokenHpCurrent?: number | null;
	tokenHpMax?: number | null;
	sheetHealth?: number;
	sheetHealthMax?: number;
	characterHealth?: number;
	characterHealthMax?: number;
}): ResolvedTokenHp {
	if (input.sheetHealth !== undefined) {
		return {
			current: input.sheetHealth,
			max: input.sheetHealthMax ?? input.sheetHealth,
			fromSheet: true,
		};
	}
	const current = input.tokenHpCurrent ?? input.characterHealth ?? 0;
	return {
		current,
		max: input.tokenHpMax ?? input.characterHealthMax ?? current,
		fromSheet: false,
	};
}

export function visibleHpLabel(
	current: number,
	max: number,
	showMax: boolean,
): string {
	return showMax ? `${current} / ${max}` : `${current}`;
}

export function tokenHpInsert(input: {
	characterId?: string | null;
	sheetOwnsHp: boolean;
	hpCurrent?: number | null;
	hpMax?: number | null;
}): { hp_current: number | null; hp_max: number | null } {
	if (input.characterId && input.sheetOwnsHp) {
		return { hp_current: null, hp_max: null };
	}
	if (input.characterId && input.hpCurrent == null && input.hpMax == null) {
		return { hp_current: null, hp_max: null };
	}
	return {
		hp_current: input.hpCurrent ?? 20,
		hp_max: input.hpMax ?? 20,
	};
}

export function hpRpcArgs(input: {
	characterId: string;
	current: number;
	max?: number;
	canEditMax: boolean;
}): SetCharacterHpArgs {
	const args: SetCharacterHpArgs = {
		p_character_id: input.characterId,
		p_current: input.current,
	};
	if (input.canEditMax && input.max !== undefined) args.p_max = input.max;
	return args;
}

export async function commitCharacterHp(input: {
	characterId: string;
	current: number;
	max?: number;
	canEditMax: boolean;
	previous: StoredHp;
	read: () => StoredHp | null;
	write: (next: StoredHp) => void;
	rpc: (args: SetCharacterHpArgs) => Promise<SetCharacterHpResult>;
	onError: (message: string) => void;
}): Promise<boolean> {
	const args = hpRpcArgs(input);
	const optimistic: StoredHp = {
		health: input.current,
		healthMax:
			input.canEditMax && input.max !== undefined
				? input.max
				: input.previous.healthMax,
	};
	input.write(optimistic);
	try {
		const result = parseSetCharacterHpResult(await input.rpc(args));
		input.write({
			health: result.health,
			healthMax: result.healthMax ?? optimistic.healthMax,
		});
		return true;
	} catch (error) {
		const now = input.read();
		if (
			now &&
			now.health === optimistic.health &&
			now.healthMax === optimistic.healthMax
		) {
			input.write(input.previous);
		}
		input.onError(messageOf(error));
		return false;
	}
}

export async function callSetCharacterHp(
	args: SetCharacterHpArgs,
): Promise<SetCharacterHpResult> {
	const client = getSupabase();
	if (!client) throw new Error("Sem conexão para alterar os PV.");
	const { data, error } = await client.rpc("set_character_hp", args);
	if (error) {
		throw new Error(error.message || "Não foi possível alterar os PV.");
	}
	return parseSetCharacterHpResult(data);
}

export async function saveLinkedCharacterHp(input: {
	characterId: string;
	current: number;
	max?: number;
	canEditMax: boolean;
	rpc?: (args: SetCharacterHpArgs) => Promise<SetCharacterHpResult>;
}): Promise<boolean> {
	const existing = useRPGStore
		.getState()
		.characters.find((character) => character.id === input.characterId);
	if (!existing || !characterSheetOwnsHp(existing)) return false;
	return commitCharacterHp({
		characterId: input.characterId,
		current: input.current,
		max: input.max,
		canEditMax: input.canEditMax,
		previous: { health: existing.health, healthMax: existing.healthMax },
		read: () => {
			const current = useRPGStore
				.getState()
				.characters.find((character) => character.id === input.characterId);
			return current
				? { health: current.health, healthMax: current.healthMax }
				: null;
		},
		write: (next) => {
			useRPGStore.setState((state) => ({
				characters: state.characters.map((character) =>
					character.id === input.characterId
						? {
								...character,
								health: next.health,
								healthMax: next.healthMax,
							}
						: character,
				),
			}));
		},
		rpc: input.rpc ?? callSetCharacterHp,
		onError: (message) => {
			showToast("error", {
				title: "Não foi possível alterar os PV",
				description: message,
			});
		},
	});
}

function linkedSheetCharacter(
	state: SheetHpState,
	characterId: string | null | undefined,
): SheetHpCharacter | undefined {
	if (!characterId) return undefined;
	const character = state.characters.find((item) => item.id === characterId);
	if (!characterSheetOwnsHp(character)) return undefined;
	return character;
}

export function parseSetCharacterHpResult(data: unknown): SetCharacterHpResult {
	if (!data || typeof data !== "object") {
		throw new Error("Não foi possível ler os PV salvos.");
	}
	const record = data as Record<string, unknown>;
	const health = asInt(record.health);
	if (health === null) throw new Error("Não foi possível ler os PV salvos.");
	if (record.healthMax == null) return { health, healthMax: null };
	const healthMax = asInt(record.healthMax);
	if (healthMax === null) throw new Error("Não foi possível ler os PV salvos.");
	return { health, healthMax };
}

function asInt(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) {
		return Math.trunc(value);
	}
	if (typeof value === "string" && value.trim() !== "") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return Math.trunc(parsed);
	}
	return null;
}

function messageOf(error: unknown): string {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "object" && error !== null && "message" in error) {
		const message = error.message;
		if (typeof message === "string" && message) return message;
	}
	return "Não foi possível alterar os PV.";
}
