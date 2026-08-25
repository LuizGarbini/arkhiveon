import { create } from "zustand";
import type {
	VTTFogMode,
	VTTFogPath,
	VTTFogShapeType,
	VTTFogState,
	VTTLayer,
	VTTPingEvent,
	VTTPresenceUser,
	VTTRemoteCursor,
	VTTRemoteMeasurement,
	VTTScene,
	VTTToken,
} from "./types";

export type VTTTool = "select" | "pan" | "ruler" | "ping" | "fog" | "draw";

export interface VTTRulerMeasurement {
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
	distance: number;
	unit: string;
}

// Default vibrant palette for player colors
export const VTT_PLAYER_COLORS = [
	"#38bdf8", // Sky Blue
	"#a855f7", // Purple
	"#22c55e", // Emerald Green
	"#f59e0b", // Amber
	"#ec4899", // Pink
	"#f43f5e", // Rose
	"#06b6d4", // Cyan
	"#eab308", // Yellow
];

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
	fogPaths: VTTFogPath[];
	activeFogTool: VTTFogShapeType;
	activeFogMode: VTTFogMode;
	fogBrushRadius: number;
	showFogControls: boolean;

	// Realtime Presence & Remote Multiplayers
	onlineUsers: VTTPresenceUser[];
	remoteCursors: Record<string, VTTRemoteCursor>;
	remoteMeasurements: Record<string, VTTRemoteMeasurement>;
	userColor: string;

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

	setViewport: (
		updates: Partial<{ x: number; y: number; scale: number }>,
	) => void;
	resetViewport: () => void;

	setActiveTool: (tool: VTTTool) => void;
	setActiveLayer: (layer: VTTLayer) => void;

	setTokens: (tokens: VTTToken[]) => void;
	addToken: (token: VTTToken) => void;
	updateToken: (tokenId: string, updates: Partial<VTTToken>) => void;
	setTokenTargetPosition: (
		tokenId: string,
		targetX: number,
		targetY: number,
	) => void;
	removeToken: (tokenId: string) => void;
	setSelectedTokenIds: (ids: string[]) => void;
	toggleSelectTokenId: (id: string, multiSelect?: boolean) => void;
	setActiveTokenIdForMenu: (id: string | null) => void;
	setDraggedTokenId: (id: string | null) => void;

	// Fog Actions
	setFogState: (fogState: VTTFogState | null) => void;
	setFogPaths: (paths: VTTFogPath[]) => void;
	addFogPath: (path: VTTFogPath) => void;
	clearFog: (mode: "all_hidden" | "all_revealed") => void;
	setActiveFogTool: (tool: VTTFogShapeType) => void;
	setActiveFogMode: (mode: VTTFogMode) => void;
	setFogBrushRadius: (radius: number) => void;
	setShowFogControls: (show: boolean) => void;

	// Presence & Broadcast actions
	setOnlineUsers: (users: VTTPresenceUser[]) => void;
	setRemoteCursor: (cursor: VTTRemoteCursor) => void;
	removeRemoteCursor: (userId: string) => void;
	setRemoteMeasurement: (
		userId: string,
		measurement: VTTRemoteMeasurement | null,
	) => void;
	setUserColor: (color: string) => void;

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
	fogPaths: [],
	activeFogTool: "brush",
	activeFogMode: "reveal",
	fogBrushRadius: 40,
	showFogControls: false,

	onlineUsers: [],
	remoteCursors: {},
	remoteMeasurements: {},
	userColor:
		VTT_PLAYER_COLORS[Math.floor(Math.random() * VTT_PLAYER_COLORS.length)],

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
			fogPaths: [],
			fogState: null,
			remoteCursors: {},
			remoteMeasurements: {},
		}),
	addScene: (scene) =>
		set((state) => ({
			scenes: [...state.scenes, scene],
			activeSceneId: state.activeSceneId || scene.id,
		})),
	updateScene: (sceneId, updates) =>
		set((state) => ({
			scenes: state.scenes.map((s) =>
				s.id === sceneId ? { ...s, ...updates } : s,
			),
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
			tokens: state.tokens.map((t) =>
				t.id === tokenId ? { ...t, ...updates } : t,
			),
		})),
	setTokenTargetPosition: (tokenId, targetX, targetY) =>
		set((state) => ({
			tokens: state.tokens.map((t) =>
				t.id === tokenId ? { ...t, targetX, targetY } : t,
			),
		})),
	removeToken: (tokenId) =>
		set((state) => ({
			tokens: state.tokens.filter((t) => t.id !== tokenId),
			selectedTokenIds: state.selectedTokenIds.filter((id) => id !== tokenId),
			activeTokenIdForMenu:
				state.activeTokenIdForMenu === tokenId
					? null
					: state.activeTokenIdForMenu,
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

	setOnlineUsers: (users) => set({ onlineUsers: users }),
	setRemoteCursor: (cursor) =>
		set((state) => ({
			remoteCursors: {
				...state.remoteCursors,
				[cursor.userId]: cursor,
			},
		})),
	removeRemoteCursor: (userId) =>
		set((state) => {
			const next = { ...state.remoteCursors };
			delete next[userId];
			return { remoteCursors: next };
		}),
	setRemoteMeasurement: (userId, measurement) =>
		set((state) => {
			if (!measurement) {
				const next = { ...state.remoteMeasurements };
				delete next[userId];
				return { remoteMeasurements: next };
			}
			return {
				remoteMeasurements: {
					...state.remoteMeasurements,
					[userId]: measurement,
				},
			};
		}),
	setUserColor: (color) => set({ userColor: color }),

	setFogState: (fogState) =>
		set({
			fogState,
			fogPaths: fogState?.revealedPaths || [],
		}),
	setFogPaths: (paths) =>
		set((state) => ({
			fogPaths: paths,
			fogState: state.fogState
				? { ...state.fogState, revealedPaths: paths }
				: null,
		})),
	addFogPath: (path) =>
		set((state) => {
			const updated = [...state.fogPaths, path];
			return {
				fogPaths: updated,
				fogState: state.fogState
					? { ...state.fogState, revealedPaths: updated }
					: null,
			};
		}),
	clearFog: (mode) =>
		set((state) => {
			if (mode === "all_hidden") {
				return {
					fogPaths: [],
					fogState: state.fogState
						? { ...state.fogState, revealedPaths: [] }
						: null,
				};
			}
			// all_revealed: Single full rect reveal
			const activeScene = state.scenes.find(
				(s) => s.id === state.activeSceneId,
			);
			const fullRevealPath: VTTFogPath = {
				id: `reveal-all-${Date.now()}`,
				type: "rect",
				mode: "reveal",
				x: 0,
				y: 0,
				width: activeScene?.width || 4000,
				height: activeScene?.height || 4000,
			};
			return {
				fogPaths: [fullRevealPath],
				fogState: state.fogState
					? { ...state.fogState, revealedPaths: [fullRevealPath] }
					: null,
			};
		}),
	setActiveFogTool: (tool) => set({ activeFogTool: tool }),
	setActiveFogMode: (mode) => set({ activeFogMode: mode }),
	setFogBrushRadius: (radius) => set({ fogBrushRadius: radius }),
	setShowFogControls: (show) => set({ showFogControls: show }),

	setActiveMeasurement: (measurement) =>
		set({ activeMeasurement: measurement }),
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
