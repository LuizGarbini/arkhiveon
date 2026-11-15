import type {
	PactSlots,
	SpellSlotLevel,
	SpellSlotsState,
} from "@/lib/store/types";

export type { PactSlots, SpellSlotLevel, SpellSlotsState };

export const EMPTY_SPELL_SLOTS: SpellSlotsState = { slots: {} };
export const MAX_SLOTS_PER_LEVEL = 20;
const LEVELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

const clamp = (n: number, min: number, max: number) =>
	Math.min(max, Math.max(min, n));

/**
 * Lê o texto antigo de `spellSlots` ("Nv1: 4 / Nv2: 3", "1º: 4, 2º: 3",
 * "Pacto nv5: 2"). Aceita "3/4" como "restam 3 de 4". Não entende: ignora.
 */
export function parseSpellSlotsText(text: string | undefined): SpellSlotsState {
	if (!text) return { slots: {} };
	const slots: Record<string, SpellSlotLevel> = {};
	let pact: PactSlots | undefined;
	const re =
		/(pact[oa]?\s*)?(?:n[ií]vel|nv\.?|lvl?|lv|n)?\s*([1-9])\s*[ºo°ª]?\s*[:=\-–]\s*(\d{1,2})(?:\/(\d{1,2}))?/gi;
	for (const m of text.matchAll(re)) {
		const isPact = Boolean(m[1]);
		const level = m[2] as string;
		const first = Number(m[3]);
		const second = m[4] === undefined ? undefined : Number(m[4]);
		// "3/4": restam 3 de 4. Sozinho, o número é o total.
		const total = clamp(second ?? first, 0, MAX_SLOTS_PER_LEVEL);
		const remaining = second === undefined ? total : clamp(first, 0, total);
		const used = total - remaining;
		if (isPact) {
			pact = { level: Number(level), total, used };
		} else {
			slots[level] = { total, used };
		}
	}
	return pact ? { slots, pact } : { slots };
}

/** O contador da ficha: o estruturado se existir, senão o texto antigo. */
export function spellSlotsOf(character: {
	spellSlotsState?: SpellSlotsState;
	spellSlots?: string;
	class?: string;
}): SpellSlotsState {
	const stored = character.spellSlotsState;
	if (stored && typeof stored === "object" && stored.slots) {
		return normalizeSpellSlots(stored);
	}
	const parsed = parseSpellSlotsText(character.spellSlots);
	// Bruxo com um nível só no texto: são os espaços de Pacto.
	const levels = Object.keys(parsed.slots);
	if (
		!parsed.pact &&
		levels.length === 1 &&
		/bruxo|warlock/i.test(character.class ?? "")
	) {
		const level = levels[0] as string;
		const only = parsed.slots[level] as SpellSlotLevel;
		return {
			slots: {},
			pact: { level: Number(level), total: only.total, used: only.used },
		};
	}
	return parsed;
}

/** Garante números inteiros dentro dos limites (dado vindo de fora). */
export function normalizeSpellSlots(raw: SpellSlotsState): SpellSlotsState {
	const slots: Record<string, SpellSlotLevel> = {};
	for (const level of LEVELS) {
		const entry = raw.slots?.[level];
		if (!entry) continue;
		const total = clamp(
			Math.trunc(Number(entry.total) || 0),
			0,
			MAX_SLOTS_PER_LEVEL,
		);
		const used = clamp(Math.trunc(Number(entry.used) || 0), 0, total);
		if (total > 0) slots[level] = { total, used };
	}
	const p = raw.pact;
	if (p) {
		const total = clamp(
			Math.trunc(Number(p.total) || 0),
			0,
			MAX_SLOTS_PER_LEVEL,
		);
		const level = clamp(Math.trunc(Number(p.level) || 1), 1, 9);
		const used = clamp(Math.trunc(Number(p.used) || 0), 0, total);
		if (total > 0) return { slots, pact: { level, total, used } };
	}
	return { slots };
}

export function hasSpellSlots(state: SpellSlotsState): boolean {
	return Object.keys(state.slots).length > 0 || Boolean(state.pact);
}

export function slotsRemaining(level: SpellSlotLevel | PactSlots): number {
	return level.total - level.used;
}

/** Gasta um espaço do nível (ou do Pacto). `null` quando não sobra nenhum. */
export function spendSlot(
	state: SpellSlotsState,
	target: number | "pact",
): SpellSlotsState | null {
	if (target === "pact") {
		const pact = state.pact;
		if (!pact || pact.used >= pact.total) return null;
		return { ...state, pact: { ...pact, used: pact.used + 1 } };
	}
	const entry = state.slots[String(target)];
	if (!entry || entry.used >= entry.total) return null;
	return {
		...state,
		slots: {
			...state.slots,
			[String(target)]: { ...entry, used: entry.used + 1 },
		},
	};
}

/** Devolve um espaço gasto. `null` quando já está tudo disponível. */
export function restoreSlot(
	state: SpellSlotsState,
	target: number | "pact",
): SpellSlotsState | null {
	if (target === "pact") {
		const pact = state.pact;
		if (!pact || pact.used <= 0) return null;
		return { ...state, pact: { ...pact, used: pact.used - 1 } };
	}
	const entry = state.slots[String(target)];
	if (!entry || entry.used <= 0) return null;
	return {
		...state,
		slots: {
			...state.slots,
			[String(target)]: { ...entry, used: entry.used - 1 },
		},
	};
}

/** Descanso curto: só os espaços de Pacto voltam. */
export function shortRestSlots(state: SpellSlotsState): SpellSlotsState {
	return state.pact ? { ...state, pact: { ...state.pact, used: 0 } } : state;
}

/** Descanso longo: todos os espaços voltam. */
export function longRestSlots(state: SpellSlotsState): SpellSlotsState {
	const slots: Record<string, SpellSlotLevel> = {};
	for (const [level, entry] of Object.entries(state.slots)) {
		slots[level] = { ...entry, used: 0 };
	}
	return state.pact ? { slots, pact: { ...state.pact, used: 0 } } : { slots };
}

/** "11 de 14d8": total de dados de vida lido de `hitDice` ("14d8", "10d10 + 4d8"). */
export function hitDiceTotal(hitDice: string | undefined): number {
	if (!hitDice) return 0;
	let total = 0;
	for (const m of hitDice.matchAll(/(\d{1,2})\s*d\s*\d{1,3}/gi)) {
		total += Number(m[1]);
	}
	return total;
}

/** Descanso longo devolve metade dos dados de vida (mínimo 1), como no livro. */
export function longRestHitDiceUsed(used: number, total: number): number {
	if (total <= 0) return 0;
	return Math.max(0, used - Math.max(1, Math.floor(total / 2)));
}

/**
 * Qual espaço gastar para lançar uma magia do nível `spellLevel`: o do próprio
 * nível; sem ele, o de Pacto se alcança o nível; sem ele, o menor nível acima
 * que ainda tenha. `null` quando nada serve. Truque (nível 0) não gasta nada.
 */
export function pickSlotFor(
	state: SpellSlotsState,
	spellLevel: number,
): number | "pact" | null {
	if (spellLevel < 1) return null;
	const own = state.slots[String(spellLevel)];
	if (own && own.used < own.total) return spellLevel;
	const pact = state.pact;
	if (pact && pact.level >= spellLevel && pact.used < pact.total) return "pact";
	for (let level = spellLevel + 1; level <= 9; level++) {
		const entry = state.slots[String(level)];
		if (entry && entry.used < entry.total) return level;
	}
	return null;
}
