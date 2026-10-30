import { create } from "zustand";
import { showToast } from "@/components/ui/toast";
import type { Database } from "@/lib/database.types";
import { useRPGStore } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";
import {
	type Combatant,
	type CombatTurn,
	type InitiativeSheet,
	isValidInitiative,
	NO_COMBAT,
	nextTurn,
	previousTurn,
	rollAllInitiative,
	sortCombatants,
	startCombat,
	turnRingTokenId,
	setInitiative as withInitiative,
} from "./combat";
import type { VTTToken } from "./types";
import { useVTTStore } from "./vtt-store";

export const COMBAT_UNAVAILABLE_LABEL =
	"O combate chega quando a atualização do banco for aplicada";

const SAVE_TOAST = {
	title: "Não foi possível salvar o combate",
	description: "A ordem voltou ao que estava.",
} as const;

export type CombatStatus =
	| "idle"
	| "loading"
	| "ready"
	| "error"
	| "unavailable";

type CombatantInsert = Database["public"]["Tables"]["vtt_combatants"]["Insert"];
type SceneCombatUpdate = Pick<
	Database["public"]["Tables"]["vtt_scenes"]["Update"],
	"combat_round" | "combat_turn_id"
>;

interface Snapshot {
	sceneId: string | null;
	combatants: Combatant[];
	round: number | null;
	turnId: string | null;
}

export interface CombatState {
	sceneId: string | null;
	combatants: Combatant[];
	round: number | null;
	turnId: string | null;
	status: CombatStatus;
	panelOpen: boolean;
	busy: boolean;
	togglePanel: () => void;
	setPanelOpen: (open: boolean) => void;
	prepareScene: (sceneId: string) => void;
	setStatus: (status: CombatStatus) => void;
	setUnavailable: () => void;
	applyLoaded: (
		sceneId: string,
		combatants: Combatant[],
		round: number | null,
		turnId: string | null,
	) => void;
	applyRemoteCombatant: (
		kind: "INSERT" | "UPDATE" | "DELETE",
		combatant: Combatant | null,
		id: string | null,
	) => void;
	applyRemoteTurn: (
		sceneId: string,
		round: number | null,
		turnId: string | null,
	) => void;
	addSelected: (rng?: () => number) => Promise<boolean>;
	setInitiative: (id: string, value: number | null) => Promise<boolean>;
	reorder: (fromId: string, toId: string) => Promise<boolean>;
	start: () => Promise<boolean>;
	next: () => Promise<boolean>;
	previous: () => Promise<boolean>;
	end: () => Promise<boolean>;
}

let orderedCache: {
	source: readonly Combatant[];
	ordered: Combatant[];
} | null = null;

/** Ordem canônica. A mesma lista de combatentes devolve a mesma referência. */
export function selectOrderedCombatants(state: {
	combatants: readonly Combatant[];
}): Combatant[] {
	if (orderedCache && orderedCache.source === state.combatants) {
		return orderedCache.ordered;
	}
	const ordered = sortCombatants(state.combatants);
	orderedCache = { source: state.combatants, ordered };
	return ordered;
}

/** Token do anel, lido na hora de desenhar (não no render do React). */
export function currentTurnRingTokenId(): string | null {
	const combat = useCombatStore.getState();
	if (combat.status !== "ready" || combat.round === null) return null;
	const vtt = useVTTStore.getState();
	const visible = new Set<string>();
	for (const token of vtt.tokens) {
		if (token.layer !== "gm" && !token.isHidden) visible.add(token.id);
	}
	return turnRingTokenId(
		{ round: combat.round, turnId: combat.turnId },
		sortCombatants(combat.combatants),
		visible,
		vtt.isGM,
	);
}

/**
 * Arraste: troca o `sort_key` e só vale se a ordem canônica (iniciativa, DES,
 * depois a chave) acompanhar. Entre iniciativas diferentes o arraste não gruda.
 */
export function moveSortKey(
	combatants: readonly Combatant[],
	fromId: string,
	toId: string,
): Combatant[] | null {
	if (fromId === toId) return null;
	const ordered = sortCombatants(combatants);
	const from = ordered.findIndex((c) => c.id === fromId);
	const to = ordered.findIndex((c) => c.id === toId);
	if (from < 0 || to < 0) return null;
	const moved = ordered.slice();
	const [item] = moved.splice(from, 1);
	if (!item) return null;
	moved.splice(to, 0, item);
	const keyed = moved.map((c, index) =>
		c.sortKey === index ? c : { ...c, sortKey: index },
	);
	const resorted = sortCombatants(keyed);
	for (let i = 0; i < resorted.length; i++) {
		if (resorted[i]?.id !== keyed[i]?.id) return null;
	}
	if (
		keyed.every(
			(c, i) => c.sortKey === ordered[i]?.sortKey && c.id === ordered[i]?.id,
		)
	) {
		return null;
	}
	return keyed;
}

function snapshot(state: CombatState): Snapshot {
	return {
		sceneId: state.sceneId,
		combatants: state.combatants,
		round: state.round,
		turnId: state.turnId,
	};
}

function canWrite(): boolean {
	const state = useCombatStore.getState();
	return (
		state.status === "ready" &&
		!state.busy &&
		Boolean(state.sceneId) &&
		useVTTStore.getState().isGM
	);
}

function savedCount(
	error: { message?: string } | null,
	data: readonly { id: string }[] | null,
	expected: number,
): boolean {
	return !error && (data?.length ?? 0) === expected;
}

function toInsert(sceneId: string, combatant: Combatant): CombatantInsert {
	return {
		id: combatant.id,
		scene_id: sceneId,
		token_id: combatant.tokenId,
		initiative: combatant.initiative,
		dex: combatant.dex,
		sort_key: combatant.sortKey,
	};
}

function sheetFor(tokenId: string): InitiativeSheet | null {
	const token = useVTTStore.getState().tokens.find((t) => t.id === tokenId);
	if (!token?.characterId) return null;
	const character = useRPGStore
		.getState()
		.characters.find((c) => c.id === token.characterId);
	if (!character) return null;
	const initiative = character.initiative;
	const dexterity = character.dexterity;
	return {
		initiative:
			typeof initiative === "number" && Number.isFinite(initiative)
				? initiative
				: null,
		dexterity:
			typeof dexterity === "number" && Number.isFinite(dexterity)
				? dexterity
				: null,
	};
}

async function commit(
	prev: Snapshot,
	apply: () => void,
	persist: () => Promise<boolean>,
): Promise<boolean> {
	if (!canWrite()) return false;
	useCombatStore.setState({ busy: true });
	apply();
	let ok = false;
	try {
		ok = await persist();
	} catch {
		ok = false;
	}
	const now = useCombatStore.getState();
	if (now.sceneId !== prev.sceneId) {
		useCombatStore.setState({ busy: false });
		return false;
	}
	if (!ok) {
		useCombatStore.setState({
			combatants: prev.combatants,
			round: prev.round,
			turnId: prev.turnId,
			busy: false,
		});
		showToast("error", SAVE_TOAST);
		return false;
	}
	useCombatStore.setState({ busy: false });
	return true;
}

async function writeTurn(turn: CombatTurn): Promise<boolean> {
	const state = useCombatStore.getState();
	const sceneId = state.sceneId;
	if (!sceneId) return false;
	if (state.round === turn.round && state.turnId === turn.turnId) return true;
	const prev = snapshot(state);
	const patch: SceneCombatUpdate = {
		combat_round: turn.round,
		combat_turn_id: turn.turnId,
	};
	return commit(
		prev,
		() => {
			useCombatStore.setState({ round: turn.round, turnId: turn.turnId });
		},
		async () => {
			const client = getSupabase();
			if (!client) return false;
			const { data, error } = await client
				.from("vtt_scenes")
				.update(patch)
				.eq("id", sceneId)
				.select("id");
			return savedCount(error, data, 1);
		},
	);
}

function tokensToAdd(state: CombatState): VTTToken[] {
	const sceneId = state.sceneId;
	if (!sceneId) return [];
	const vtt = useVTTStore.getState();
	const have = new Set(state.combatants.map((c) => c.tokenId));
	const picked: VTTToken[] = [];
	for (const id of vtt.selectedTokenIds) {
		const token = vtt.tokens.find((t) => t.id === id);
		if (!token || token.sceneId !== sceneId || have.has(id)) continue;
		picked.push(token);
	}
	return picked;
}

const initial = {
	sceneId: null,
	combatants: [] as Combatant[],
	round: null,
	turnId: null,
	status: "idle" as CombatStatus,
	panelOpen: false,
	busy: false,
};

export const useCombatStore = create<CombatState>((set, get) => ({
	...initial,
	togglePanel: () => set({ panelOpen: !get().panelOpen }),
	setPanelOpen: (open) => set({ panelOpen: open }),
	prepareScene: (sceneId) => {
		orderedCache = null;
		set({
			sceneId,
			combatants: [],
			round: null,
			turnId: null,
			status: "loading",
			busy: false,
		});
	},
	setStatus: (status) => set({ status }),
	setUnavailable: () =>
		set({
			status: "unavailable",
			combatants: [],
			round: null,
			turnId: null,
			busy: false,
		}),
	applyLoaded: (sceneId, combatants, round, turnId) => {
		const state = get();
		if (state.sceneId !== sceneId || state.busy) return;
		set({ combatants, round, turnId, status: "ready" });
	},
	applyRemoteCombatant: (kind, combatant, id) => {
		const state = get();
		if (state.busy || state.status !== "ready") return;
		if (kind === "DELETE") {
			if (!id) return;
			set({ combatants: state.combatants.filter((c) => c.id !== id) });
			return;
		}
		if (!combatant) return;
		const index = state.combatants.findIndex((c) => c.id === combatant.id);
		if (index < 0) {
			set({ combatants: [...state.combatants, combatant] });
			return;
		}
		const next = state.combatants.slice();
		next[index] = combatant;
		set({ combatants: next });
	},
	applyRemoteTurn: (sceneId, round, turnId) => {
		const state = get();
		if (state.sceneId !== sceneId || state.busy || state.status !== "ready")
			return;
		if (state.round === round && state.turnId === turnId) return;
		set({ round, turnId });
	},
	addSelected: async (rng = Math.random) => {
		if (!canWrite()) return false;
		const state = get();
		const sceneId = state.sceneId;
		if (!sceneId) return false;
		const picked = tokensToAdd(state);
		if (picked.length === 0) return false;
		let sort = state.combatants.reduce(
			(max, c) => Math.max(max, c.sortKey),
			-1,
		);
		const drafted: Combatant[] = picked.map((token) => ({
			id: crypto.randomUUID(),
			tokenId: token.id,
			initiative: null,
			dex: null,
			sortKey: ++sort,
		}));
		const rolled = rollAllInitiative(drafted, sheetFor, rng);
		const prev = snapshot(state);
		return commit(
			prev,
			() => {
				const current = get().combatants;
				set({ combatants: [...current, ...rolled] });
			},
			async () => {
				const client = getSupabase();
				if (!client) return false;
				const { data, error } = await client
					.from("vtt_combatants")
					.insert(rolled.map((c) => toInsert(sceneId, c)))
					.select("id");
				return savedCount(error, data, rolled.length);
			},
		);
	},
	setInitiative: async (id, value) => {
		if (!canWrite()) return false;
		if (
			value !== null &&
			(!Number.isInteger(value) || !isValidInitiative(value))
		) {
			return false;
		}
		const state = get();
		const sceneId = state.sceneId;
		if (!sceneId) return false;
		const next = withInitiative(state.combatants, id, value);
		if (next === state.combatants) return true;
		const prev = snapshot(state);
		return commit(
			prev,
			() => set({ combatants: next.slice() }),
			async () => {
				const client = getSupabase();
				if (!client) return false;
				const { data, error } = await client
					.from("vtt_combatants")
					.update({ initiative: value })
					.eq("id", id)
					.select("id");
				return savedCount(error, data, 1);
			},
		);
	},
	reorder: async (fromId, toId) => {
		if (!canWrite()) return false;
		const state = get();
		const sceneId = state.sceneId;
		if (!sceneId) return false;
		const next = moveSortKey(state.combatants, fromId, toId);
		if (!next) return false;
		const prevKey = new Map(state.combatants.map((c) => [c.id, c.sortKey]));
		const changed = next.filter((c) => prevKey.get(c.id) !== c.sortKey);
		if (changed.length === 0) return false;
		const prev = snapshot(state);
		return commit(
			prev,
			() => set({ combatants: next }),
			async () => {
				const client = getSupabase();
				if (!client) return false;
				const { data, error } = await client
					.from("vtt_combatants")
					.upsert(changed.map((c) => toInsert(sceneId, c)))
					.select("id");
				return savedCount(error, data, changed.length);
			},
		);
	},
	start: async () => {
		const state = get();
		if (state.round !== null) return false;
		return writeTurn(startCombat(sortCombatants(state.combatants)));
	},
	next: async () => {
		const state = get();
		if (state.round === null) return false;
		return writeTurn(
			nextTurn(
				{ round: state.round, turnId: state.turnId },
				sortCombatants(state.combatants),
			),
		);
	},
	previous: async () => {
		const state = get();
		if (state.round === null) return false;
		return writeTurn(
			previousTurn(
				{ round: state.round, turnId: state.turnId },
				sortCombatants(state.combatants),
			),
		);
	},
	end: async () => {
		if (get().round === null) return false;
		return writeTurn(NO_COMBAT);
	},
}));
