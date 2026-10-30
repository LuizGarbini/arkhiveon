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

export type FeedStatus = "idle" | "loading" | "ready" | "error" | "unavailable";

export interface FeedSnapshot {
	entries: TableFeedEntry[];
	results: Record<string, TableRollResult>;
	sessionId: string | null;
	sessionStartedAt: string | null;
	sessionNumber: number | null;
}

interface RollState {
	entries: TableFeedEntry[];
	results: Record<string, TableRollResult>;
	status: FeedStatus;
	panelOpen: boolean;
	sessionId: string | null;
	sessionStartedAt: string | null;
	sessionNumber: number | null;
	setEntries: (entries: TableFeedEntry[]) => void;
	upsertEntry: (entry: TableFeedEntry) => void;
	setResult: (result: TableRollResult) => void;
	setStatus: (status: FeedStatus) => void;
	setPanelOpen: (open: boolean) => void;
	togglePanel: () => void;
	applyFeed: (snapshot: FeedSnapshot) => void;
	reset: () => void;
}

const emptyResults: Record<string, TableRollResult> = {};

export const useRollStore = create<RollState>((set) => ({
	entries: [],
	results: emptyResults,
	status: "idle",
	panelOpen: false,
	sessionId: null,
	sessionStartedAt: null,
	sessionNumber: null,
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
	setStatus: (status) => set({ status }),
	setPanelOpen: (open) => set({ panelOpen: open }),
	togglePanel: () => set((state) => ({ panelOpen: !state.panelOpen })),
	applyFeed: (snapshot) =>
		set({
			entries: snapshot.entries,
			results: snapshot.results,
			sessionId: snapshot.sessionId,
			sessionStartedAt: snapshot.sessionStartedAt,
			sessionNumber: snapshot.sessionNumber,
			status: "ready",
		}),
	reset: () =>
		set({
			entries: [],
			results: emptyResults,
			status: "idle",
			panelOpen: false,
			sessionId: null,
			sessionStartedAt: null,
			sessionNumber: null,
		}),
}));

export const selectRollEntries = (state: RollState) => state.entries;

export const selectRollResults = (state: RollState) => state.results;

export const selectRollResult = (rollId: string) => (state: RollState) =>
	state.results[rollId];
