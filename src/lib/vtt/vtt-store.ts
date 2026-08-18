import { create } from "zustand";
import type {
	VTTFogState,
	VTTLayer,
	VTTPingEvent,
	VTTScene,
	VTTToken,
} from "./types";

export type VTTTool =
	| "select"
	| "pan"
	| "ruler"
	| "ping"
	| "fog"
	| "draw";

export interface VTTRulerMeasurement {
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
	distance: number;
	unit: string;
}

interface VTTState {
	// Scenes
	scenes: VTTScene[];
	activeSceneId: string | null;
	isLoadingScenes: boolean;

	// Viewport state
	viewport: {
		x: number;
		y: number;
		scale: number;
	};

	// Active tool & layer
	activeTool: VTTTool;
	activeLayer: VTTLayer;

	// Tokens & Fog for current scene
	tokens: VTTToken[];
	selectedTokenIds: string[];
	activeTokenIdForMenu: string | null;
	draggedTokenId: string | null;
	fogState: VTTFogState | null;

	// Overlays & Ephemeral Events
	activeMeasurement: VTTRulerMeasurement | null;
	activePings: VTTPingEvent[];

	// UI Panels
	showGridSettings: boolean;
	showSceneManager: boolean;
	showRosterDrawer: boolean;
	showCharacterSheetId: string | null;
	isGM: boolean;

	// Actions
	setScenes: (scenes: VTTScene[]) => void;
	setActiveSceneId: (sceneId: string | null) => void;
	addScene: (scene: VTTScene) => void;
	updateScene: (sceneId: string, updates: Partial<VTTScene>) => void;
	removeScene: (sceneId: string) => void;

	setViewport: (updates: Partial<{ x: number; y: number; scale: number }>) => void;
	resetViewport: () => void;

	setActiveTool: (tool: VTTTool) => void;
	setActiveLayer: (layer: VTTLayer) => void;

	setTokens: (tokens: VTTToken[]) => void;
	addToken: (token: VTTToken) => void;
	updateToken: (tokenId: string, updates: Partial<VTTToken>) => void;
	removeToken: (tokenId: string) => void;
	setSelectedTokenIds: (ids: string[]) => void;
	toggleSelectTokenId: (id: string, multiSelect?: boolean) => void;
	setActiveTokenIdForMenu: (id: string | null) => void;
	setDraggedTokenId: (id: string | null) => void;

	setFogState: (fogState: VTTFogState | null) => void;

	setActiveMeasurement: (measurement: VTTRulerMeasurement | null) => void;
	addPing: (ping: VTTPingEvent) => void;
	removePing: (timestamp: number) => void;

	setShowGridSettings: (show: boolean) => void;
	setShowSceneManager: (show: boolean) => void;
	setShowRosterDrawer: (show: boolean) => void;
	setShowCharacterSheetId: (characterId: string | null) => void;
	setIsGM: (isGM: boolean) => void;
}

export const useVTTStore = create<VTTState>((set) => ({
	scenes: [],
	activeSceneId: null,
	isLoadingScenes: false,

	viewport: {
		x: 0,
		y: 0,
		scale: 1,
	},

	activeTool: "select",
	activeLayer: "token",

	tokens: [],
	selectedTokenIds: [],
	activeTokenIdForMenu: null,
	draggedTokenId: null,
	fogState: null,

	activeMeasurement: null,
	activePings: [],

	showGridSettings: false,
	showSceneManager: false,
	showRosterDrawer: false,
	showCharacterSheetId: null,
	isGM: false,

	setScenes: (scenes) => set({ scenes }),
	setActiveSceneId: (sceneId) =>
		set({
			activeSceneId: sceneId,
			selectedTokenIds: [],
			activeTokenIdForMenu: null,
			tokens: [],
		}),
	addScene: (scene) =>
		set((state) => ({
			scenes: [...state.scenes, scene],
			activeSceneId: state.activeSceneId || scene.id,
		})),
	updateScene: (sceneId, updates) =>
		set((state) => ({
			scenes: state.scenes.map((s) => (s.id === sceneId ? { ...s, ...updates } : s)),
		})),
	removeScene: (sceneId) =>
		set((state) => {
			const remaining = state.scenes.filter((s) => s.id !== sceneId);
			return {
				scenes: remaining,
				activeSceneId:
					state.activeSceneId === sceneId
						? remaining[0]?.id || null
						: state.activeSceneId,
			};
		}),

	setViewport: (updates) =>
		set((state) => ({
			viewport: { ...state.viewport, ...updates },
		})),
	resetViewport: () =>
		set({
			viewport: { x: 0, y: 0, scale: 1 },
		}),

	setActiveTool: (tool) => set({ activeTool: tool }),
	setActiveLayer: (layer) => set({ activeLayer: layer }),

	setTokens: (tokens) => set({ tokens }),
	addToken: (token) =>
		set((state) => ({
			tokens: state.tokens.some((t) => t.id === token.id)
				? state.tokens.map((t) => (t.id === token.id ? token : t))
				: [...state.tokens, token],
		})),
	updateToken: (tokenId, updates) =>
		set((state) => ({
			tokens: state.tokens.map((t) => (t.id === tokenId ? { ...t, ...updates } : t)),
		})),
	removeToken: (tokenId) =>
		set((state) => ({
			tokens: state.tokens.filter((t) => t.id !== tokenId),
			selectedTokenIds: state.selectedTokenIds.filter((id) => id !== tokenId),
			activeTokenIdForMenu:
				state.activeTokenIdForMenu === tokenId ? null : state.activeTokenIdForMenu,
		})),
	setSelectedTokenIds: (ids) => set({ selectedTokenIds: ids }),
	toggleSelectTokenId: (id, multiSelect) =>
		set((state) => {
			if (multiSelect) {
				const isSelected = state.selectedTokenIds.includes(id);
				return {
					selectedTokenIds: isSelected
						? state.selectedTokenIds.filter((tId) => tId !== id)
						: [...state.selectedTokenIds, id],
				};
			}
			return { selectedTokenIds: [id] };
		}),
	setActiveTokenIdForMenu: (id) => set({ activeTokenIdForMenu: id }),
	setDraggedTokenId: (id) => set({ draggedTokenId: id }),

	setFogState: (fogState) => set({ fogState }),

	setActiveMeasurement: (measurement) => set({ activeMeasurement: measurement }),
	addPing: (ping) =>
		set((state) => ({
			activePings: [...state.activePings, ping],
		})),
	removePing: (timestamp) =>
		set((state) => ({
			activePings: state.activePings.filter((p) => p.timestamp !== timestamp),
		})),

	setShowGridSettings: (show) => set({ showGridSettings: show }),
	setShowSceneManager: (show) => set({ showSceneManager: show }),
	setShowRosterDrawer: (show) => set({ showRosterDrawer: show }),
	setShowCharacterSheetId: (id) => set({ showCharacterSheetId: id }),
	setIsGM: (isGM) => set({ isGM }),
}));
