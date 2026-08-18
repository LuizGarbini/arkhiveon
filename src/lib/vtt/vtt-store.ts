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
	distance: number; // in units (e.g. meters or feet)
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
	fogState: VTTFogState | null;

	// Overlays & Ephemeral Events
	activeMeasurement: VTTRulerMeasurement | null;
	activePings: VTTPingEvent[];

	// UI Panels
	showGridSettings: boolean;
	showSceneManager: boolean;
	showCharacterDrawer: boolean;
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
	updateTokenLocal: (tokenId: string, updates: Partial<VTTToken>) => void;
	setSelectedTokenIds: (ids: string[]) => void;
	toggleSelectTokenId: (id: string, multiSelect?: boolean) => void;

	setFogState: (fogState: VTTFogState | null) => void;

	setActiveMeasurement: (measurement: VTTRulerMeasurement | null) => void;
	addPing: (ping: VTTPingEvent) => void;
	removePing: (timestamp: number) => void;

	setShowGridSettings: (show: boolean) => void;
	setShowSceneManager: (show: boolean) => void;
	setShowCharacterDrawer: (show: boolean) => void;
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
	fogState: null,

	activeMeasurement: null,
	activePings: [],

	showGridSettings: false,
	showSceneManager: false,
	showCharacterDrawer: false,
	isGM: false,

	setScenes: (scenes) => set({ scenes }),
	setActiveSceneId: (sceneId) => set({ activeSceneId: sceneId, selectedTokenIds: [] }),
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
	updateTokenLocal: (tokenId, updates) =>
		set((state) => ({
			tokens: state.tokens.map((t) => (t.id === tokenId ? { ...t, ...updates } : t)),
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
	setShowCharacterDrawer: (show) => set({ showCharacterDrawer: show }),
	setIsGM: (isGM) => set({ isGM }),
}));
