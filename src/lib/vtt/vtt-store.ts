import { create } from "zustand";
import type { VTTSpellTemplate, VTTTemplateKind } from "./template-math";
import type {
	VTTDiagonalRule,
	VTTFogMode,
	VTTFogPath,
	VTTFogShapeType,
	VTTFogState,
	VTTLayer,
	VTTPingEvent,
	VTTPresenceUser,
	VTTRemoteCursor,
	VTTRemoteMeasurement,
	VTTRulerMeasurement,
	VTTScene,
	VTTToken,
} from "./types";
import {
	applyWallOp,
	type VTTWall,
	type WallOp,
	type WallPoint,
} from "./walls";

export type VTTTool =
	| "select"
	| "pan"
	| "ruler"
	| "ping"
	| "fog"
	| "template"
	| "wall";

/** Paredes da cena: `missing` = tabela ainda não existe (migração não aplicada). */
export type VTTWallsStatus = "idle" | "loading" | "ready" | "missing" | "error";

export type { VTTRulerMeasurement } from "./types";

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
	diagonalRule: VTTDiagonalRule;
	activeTemplateKind: VTTTemplateKind;
	previewTemplate: VTTSpellTemplate | null;
	placedTemplates: VTTSpellTemplate[];
	remoteTemplates: Record<string, VTTSpellTemplate>;
	remoteTemplatePreviews: Record<string, VTTSpellTemplate>;
	setRemoteTemplatePreview: (
		userId: string,
		template: VTTSpellTemplate | null,
	) => void;
	removeRemoteTemplates: (userId: string, ids: string[]) => void;
	showTemplateControls: boolean;

	// Tokens & Fog for current scene
	tokens: VTTToken[];
	selectedTokenIds: string[];
	activeTokenIdForMenu: string | null;
	/** Token com status sob o ponteiro (Tooltip do DS sobre o canvas). */
	hoveredStatusTokenId: string | null;
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
	/** Ficha em foco (a de cima). */
	showCharacterSheetId: string | null;
	/** Fichas abertas na mesa (ordem de abertura, no máximo 3). */
	openSheetIds: string[];
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
	setDiagonalRule: (rule: VTTDiagonalRule) => void;
	setActiveTemplateKind: (kind: VTTTemplateKind) => void;
	setPreviewTemplate: (template: VTTSpellTemplate | null) => void;
	addPlacedTemplate: (template: VTTSpellTemplate) => void;
	clearPlacedTemplates: () => void;
	setRemoteTemplate: (
		userId: string,
		template: VTTSpellTemplate | null,
	) => void;
	setShowTemplateControls: (show: boolean) => void;

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
	setHoveredStatusTokenId: (id: string | null) => void;
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
	/** Abre (ou traz para frente) a ficha; `null` fecha todas. */
	setShowCharacterSheetId: (characterId: string | null) => void;
	/** Fecha só esta ficha. */
	closeCharacterSheet: (id: string) => void;
	setIsGM: (isGM: boolean) => void;

	// Paredes (só mestre; F1)
	walls: VTTWall[];
	wallsStatus: VTTWallsStatus;
	selectedWallIds: string[];
	/** Pontos já fixados da polilinha em desenho (vazio = sem desenho). */
	wallDraft: WallPoint[];
	wallUndo: WallOp[];
	wallRedo: WallOp[];
	setWalls: (walls: VTTWall[]) => void;
	setWallsStatus: (status: VTTWallsStatus) => void;
	applyWallOpLocal: (op: WallOp) => void;
	setSelectedWallIds: (ids: string[]) => void;
	setWallDraft: (points: WallPoint[]) => void;
	setWallHistory: (undo: WallOp[], redo: WallOp[]) => void;
}

const emptySceneContents = () => ({
	selectedTokenIds: [],
	activeTokenIdForMenu: null,
	hoveredStatusTokenId: null,
	tokens: [],
	fogPaths: [],
	fogState: null,
	remoteCursors: {},
	remoteMeasurements: {},
	draggedTokenId: null,
	activeMeasurement: null,
	activePings: [],
	placedTemplates: [],
	previewTemplate: null,
	remoteTemplates: {},
	remoteTemplatePreviews: {},
	walls: [],
	wallsStatus: "idle" as VTTWallsStatus,
	selectedWallIds: [],
	wallDraft: [],
	wallUndo: [],
	wallRedo: [],
});

/** Máximo de fichas abertas ao mesmo tempo na mesa. */
export const MAX_OPEN_SHEETS = 3;

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
	diagonalRule: "5105",
	activeTemplateKind: "cone60",
	previewTemplate: null,
	placedTemplates: [],
	remoteTemplates: {},
	remoteTemplatePreviews: {},
	showTemplateControls: false,

	tokens: [],
	selectedTokenIds: [],
	activeTokenIdForMenu: null,
	hoveredStatusTokenId: null,
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
	openSheetIds: [],
	isGM: false,

	walls: [],
	wallsStatus: "idle",
	selectedWallIds: [],
	wallDraft: [],
	wallUndo: [],
	wallRedo: [],

	setScenes: (scenes) => set({ scenes }),
	setActiveSceneId: (sceneId) =>
		set((state) =>
			state.activeSceneId === sceneId
				? state
				: {
						activeSceneId: sceneId,
						...emptySceneContents(),
					},
		),
	addScene: (scene) =>
		set((state) => {
			if (!state.isGM && !scene.isActive) return state;
			const scenes = state.scenes.some((s) => s.id === scene.id)
				? state.scenes.map((s) => (s.id === scene.id ? scene : s))
				: [...state.scenes, scene];
			const nextId =
				!state.isGM && scene.isActive
					? scene.id
					: state.activeSceneId || scene.id;
			return {
				scenes: !state.isGM ? scenes.filter((s) => s.id === scene.id) : scenes,
				...(nextId !== state.activeSceneId ? emptySceneContents() : {}),
				activeSceneId: nextId,
			};
		}),
	updateScene: (sceneId, updates) =>
		set((state) => ({
			scenes: state.scenes.map((s) =>
				s.id === sceneId ? { ...s, ...updates } : s,
			),
		})),
	removeScene: (sceneId) =>
		set((state) => {
			const remaining = state.scenes.filter((s) => s.id !== sceneId);
			if (state.activeSceneId !== sceneId) return { scenes: remaining };
			return {
				scenes: remaining,
				...emptySceneContents(),
				activeSceneId:
					(state.isGM ? remaining[0] : remaining.find((s) => s.isActive))?.id ||
					null,
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

	setActiveTool: (tool) =>
		set((state) => ({
			activeTool: tool,
			showTemplateControls: tool === "template",
			showFogControls: tool === "fog",
			showGridSettings:
				tool === "fog" || tool === "template" ? false : state.showGridSettings,
			showRosterDrawer:
				tool === "fog" || tool === "template" ? false : state.showRosterDrawer,
			// Sair da ferramenta Parede descarta o desenho e a seleção de paredes.
			...(tool === "wall" ? {} : { wallDraft: [], selectedWallIds: [] }),
		})),
	setActiveLayer: (layer) => set({ activeLayer: layer }),
	setDiagonalRule: (rule) => set({ diagonalRule: rule }),
	setActiveTemplateKind: (kind) => set({ activeTemplateKind: kind }),
	setPreviewTemplate: (template) => set({ previewTemplate: template }),
	addPlacedTemplate: (template) =>
		set((state) => ({
			placedTemplates: [
				...state.placedTemplates.filter((t) => t.id !== template.id),
				template,
			],
			previewTemplate: null,
		})),
	clearPlacedTemplates: () =>
		set({ placedTemplates: [], previewTemplate: null }),
	setRemoteTemplate: (userId, template) =>
		set((state) => {
			if (!template) {
				const next = { ...state.remoteTemplates };
				for (const [id, placed] of Object.entries(next)) {
					if (placed.userId === userId) delete next[id];
				}
				return { remoteTemplates: next };
			}
			return {
				remoteTemplates: {
					...state.remoteTemplates,
					[template.id]: { ...template, userId },
				},
			};
		}),
	setRemoteTemplatePreview: (userId, template) =>
		set((state) => {
			const next = { ...state.remoteTemplatePreviews };
			if (template) next[userId] = { ...template, userId };
			else delete next[userId];
			return { remoteTemplatePreviews: next };
		}),
	removeRemoteTemplates: (userId, ids) =>
		set((state) => ({
			remoteTemplates: Object.fromEntries(
				Object.entries(state.remoteTemplates).filter(
					([id, template]) => template.userId !== userId || !ids.includes(id),
				),
			),
		})),
	setShowTemplateControls: (show) =>
		set(
			show
				? {
						showTemplateControls: true,
						showGridSettings: false,
						showFogControls: false,
						showRosterDrawer: false,
					}
				: { showTemplateControls: false },
		),

	setTokens: (tokens) =>
		set((state) => ({
			tokens: tokens.filter((t) => t.sceneId === state.activeSceneId),
		})),
	addToken: (token) =>
		set((state) =>
			token.sceneId !== state.activeSceneId
				? state
				: {
						tokens: state.tokens.some((t) => t.id === token.id)
							? state.tokens.map((t) => (t.id === token.id ? token : t))
							: [...state.tokens, token],
					},
		),
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
	// The token menu and the Biblioteca (roster) close each other.
	setActiveTokenIdForMenu: (id) =>
		set(
			id
				? { activeTokenIdForMenu: id, showRosterDrawer: false }
				: { activeTokenIdForMenu: null },
		),
	setHoveredStatusTokenId: (id) => set({ hoveredStatusTokenId: id }),
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
		set((state) =>
			fogState && fogState.sceneId !== state.activeSceneId
				? state
				: {
						fogState,
						fogPaths: fogState?.revealedPaths || [],
					},
		),
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
	setShowFogControls: (show) =>
		set(
			show
				? {
						showFogControls: true,
						showGridSettings: false,
						showTemplateControls: false,
						showRosterDrawer: false,
					}
				: { showFogControls: false },
		),

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

	setShowGridSettings: (show) =>
		set(
			show
				? {
						showGridSettings: true,
						showFogControls: false,
						showTemplateControls: false,
						showRosterDrawer: false,
					}
				: { showGridSettings: false },
		),
	setShowSceneManager: (show) => set({ showSceneManager: show }),
	setShowRosterDrawer: (show) =>
		set(
			show
				? {
						showRosterDrawer: true,
						showGridSettings: false,
						showFogControls: false,
						showTemplateControls: false,
						showCharacterSheetId: null,
						openSheetIds: [],
						activeTokenIdForMenu: null,
					}
				: { showRosterDrawer: false },
		),
	setShowCharacterSheetId: (id) =>
		set((state) => {
			if (!id) return { showCharacterSheetId: null, openSheetIds: [] };
			const open = state.openSheetIds.includes(id)
				? state.openSheetIds
				: [...state.openSheetIds, id].slice(-MAX_OPEN_SHEETS);
			return {
				showCharacterSheetId: id,
				openSheetIds: open,
				showRosterDrawer: false,
			};
		}),
	closeCharacterSheet: (id) =>
		set((state) => {
			const open = state.openSheetIds.filter((x) => x !== id);
			return {
				openSheetIds: open,
				showCharacterSheetId:
					state.showCharacterSheetId === id
						? (open.at(-1) ?? null)
						: state.showCharacterSheetId,
			};
		}),
	setIsGM: (isGM) => set({ isGM }),

	setWalls: (walls) => set({ walls }),
	setWallsStatus: (wallsStatus) => set({ wallsStatus }),
	applyWallOpLocal: (op) =>
		set((state) => {
			const removed =
				op.kind === "delete" ? new Set(op.walls.map((w) => w.id)) : null;
			return {
				walls: applyWallOp(state.walls, op),
				selectedWallIds: removed
					? state.selectedWallIds.filter((id) => !removed.has(id))
					: state.selectedWallIds,
			};
		}),
	setSelectedWallIds: (selectedWallIds) => set({ selectedWallIds }),
	setWallDraft: (wallDraft) => set({ wallDraft }),
	setWallHistory: (wallUndo, wallRedo) => set({ wallUndo, wallRedo }),
}));
