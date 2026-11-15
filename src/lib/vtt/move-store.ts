import { create } from "zustand";
import { addMove, type TokenMove } from "./move-history";

/**
 * Histórico de movimentos da mesa (só mestre e co-mestre).
 * `missing`: a tabela ainda não existe no banco; o histórico vale só nesta
 * sessão do navegador.
 */
export type MoveLogStatus = "idle" | "loading" | "ready" | "missing" | "error";

interface MoveState {
	moves: TokenMove[];
	status: MoveLogStatus;
	panelOpen: boolean;
	/** Movimento em destaque no mapa (seta de origem → destino). */
	focusedMoveId: string | null;
	/** Mostra só um token; `null` = todos. */
	filterTokenId: string | null;
	/** Anotados nesta tela e ainda sem resposta do banco. */
	unsavedIds: string[];
	/** O banco recusou (ou a rede falhou de vez): valem só nesta tela. */
	failedIds: string[];
	setMoves: (moves: TokenMove[]) => void;
	pushMove: (move: TokenMove) => void;
	removeMoves: (sceneId: string, tokenId?: string | null) => void;
	setStatus: (status: MoveLogStatus) => void;
	markUnsaved: (id: string) => void;
	markSaved: (id: string) => void;
	markFailed: (id: string) => void;
	setPanelOpen: (open: boolean) => void;
	togglePanel: () => void;
	focusMove: (id: string | null) => void;
	setFilterTokenId: (id: string | null) => void;
	reset: () => void;
}

export const useMoveStore = create<MoveState>((set) => ({
	moves: [],
	status: "idle",
	panelOpen: false,
	focusedMoveId: null,
	filterTokenId: null,
	unsavedIds: [],
	failedIds: [],
	setMoves: (moves) => set({ moves }),
	pushMove: (move) => set((state) => ({ moves: addMove(state.moves, move) })),
	removeMoves: (sceneId, tokenId) =>
		set((state) => ({
			moves: state.moves.filter(
				(move) =>
					move.sceneId !== sceneId ||
					(tokenId ? move.tokenId !== tokenId : false),
			),
			focusedMoveId: null,
		})),
	setStatus: (status) => set({ status }),
	markUnsaved: (id) =>
		set((state) => ({
			unsavedIds: state.unsavedIds.includes(id)
				? state.unsavedIds
				: [...state.unsavedIds, id],
		})),
	markSaved: (id) =>
		set((state) => ({
			unsavedIds: state.unsavedIds.filter((item) => item !== id),
			failedIds: state.failedIds.filter((item) => item !== id),
		})),
	markFailed: (id) =>
		set((state) => ({
			unsavedIds: state.unsavedIds.filter((item) => item !== id),
			failedIds: state.failedIds.includes(id)
				? state.failedIds
				: [...state.failedIds, id],
		})),
	setPanelOpen: (panelOpen) => set({ panelOpen }),
	togglePanel: () =>
		set((state) => ({
			panelOpen: !state.panelOpen,
			focusedMoveId: state.panelOpen ? null : state.focusedMoveId,
		})),
	focusMove: (focusedMoveId) => set({ focusedMoveId }),
	setFilterTokenId: (filterTokenId) => set({ filterTokenId }),
	reset: () =>
		set({
			moves: [],
			status: "idle",
			panelOpen: false,
			focusedMoveId: null,
			filterTokenId: null,
			unsavedIds: [],
			failedIds: [],
		}),
}));
