import { create } from "zustand";

/**
 * Feed da mesa no cliente. A linha pública não carrega total nem details:
 * isso vem de vtt_roll_results, e só para quem a policy deixa ler.
 * Seletores devolvem o array/objeto do estado. Filtrar sessão no render
 * (useMemo); filter() dentro do seletor cria um array novo a cada vez.
 */

export interface TableFeedEntry {
	id: string;
	campaignId: string;
	sceneId: string | null;
	sessionId: string;
	authorId: string;
	characterId: string | null;
	kind: "roll" | "chat";
	/** Nula quando a rolagem é secreta. */
	formula: string | null;
	label: string | null;
	message: string | null;
	isSecret: boolean;
	createdAt: string;
}

export interface TableRollDetails {
	formula: string;
	count: number;
	faces: number;
	modifier: number;
	rolls: number[];
}

export interface TableRollResult {
	rollId: string;
	total: number;
	details: TableRollDetails;
}

interface RollState {
	entries: TableFeedEntry[];
	results: Record<string, TableRollResult>;
	setEntries: (entries: TableFeedEntry[]) => void;
	upsertEntry: (entry: TableFeedEntry) => void;
	setResult: (result: TableRollResult) => void;
	reset: () => void;
}

const emptyResults: Record<string, TableRollResult> = {};

export const useRollStore = create<RollState>((set) => ({
	entries: [],
	results: emptyResults,
	setEntries: (entries) => set({ entries }),
	upsertEntry: (entry) =>
		set((state) => {
			const index = state.entries.findIndex((item) => item.id === entry.id);
			if (index === -1) return { entries: [...state.entries, entry] };
			const entries = state.entries.slice();
			entries[index] = entry;
			return { entries };
		}),
	setResult: (result) =>
		set((state) => ({
			results: { ...state.results, [result.rollId]: result },
		})),
	reset: () => set({ entries: [], results: emptyResults }),
}));

export const selectRollEntries = (state: RollState) => state.entries;

export const selectRollResults = (state: RollState) => state.results;

export const selectRollResult = (rollId: string) => (state: RollState) =>
	state.results[rollId];
