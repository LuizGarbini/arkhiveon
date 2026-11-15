import { create } from "zustand";
import type { VttNote } from "./notes";

/**
 * Notas privadas da mesa. `missing`: a tabela ainda não existe no banco (0070
 * pendente). `dirty`: editada na tela e ainda não gravada.
 */
export type NotesStatus = "idle" | "loading" | "ready" | "missing" | "error";
export type NoteSaveState = "saved" | "dirty" | "saving" | "error";

interface NotesState {
	campaignId: string | null;
	notes: VttNote[];
	status: NotesStatus;
	panelOpen: boolean;
	/** Nota aberta no editor; `null` = a lista. */
	activeId: string | null;
	query: string;
	saveState: Record<string, NoteSaveState>;
	/** Mensagem do último erro de criar/apagar (some ao agir de novo). */
	notice: string | null;
	setCampaign: (campaignId: string | null) => void;
	setNotes: (notes: VttNote[]) => void;
	upsertNote: (note: VttNote) => void;
	removeNote: (id: string) => void;
	setStatus: (status: NotesStatus) => void;
	setPanelOpen: (open: boolean) => void;
	openNote: (id: string | null) => void;
	setQuery: (query: string) => void;
	setSaveState: (id: string, state: NoteSaveState | null) => void;
	setNotice: (notice: string | null) => void;
	reset: () => void;
}

const initial = {
	campaignId: null,
	notes: [] as VttNote[],
	status: "idle" as NotesStatus,
	panelOpen: false,
	activeId: null,
	query: "",
	saveState: {} as Record<string, NoteSaveState>,
	notice: null,
};

export const useNotesStore = create<NotesState>((set) => ({
	...initial,
	setCampaign: (campaignId) => set({ campaignId }),
	setNotes: (notes) => set({ notes }),
	upsertNote: (note) =>
		set((state) => ({
			notes: state.notes.some((n) => n.id === note.id)
				? state.notes.map((n) => (n.id === note.id ? note : n))
				: [note, ...state.notes],
		})),
	removeNote: (id) =>
		set((state) => {
			const { [id]: _gone, ...saveState } = state.saveState;
			return {
				notes: state.notes.filter((n) => n.id !== id),
				saveState,
				activeId: state.activeId === id ? null : state.activeId,
			};
		}),
	setStatus: (status) => set({ status }),
	setPanelOpen: (panelOpen) => set({ panelOpen }),
	openNote: (activeId) => set({ activeId }),
	setQuery: (query) => set({ query }),
	setSaveState: (id, next) =>
		set((state) => {
			const { [id]: _old, ...rest } = state.saveState;
			return { saveState: next ? { ...rest, [id]: next } : rest };
		}),
	setNotice: (notice) => set({ notice }),
	reset: () => set({ ...initial }),
}));
