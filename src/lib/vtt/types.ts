export type VTTGridType = "square" | "hex_pointy" | "hex_flat" | "none";
export type VTTGridScaleUnit = "m" | "ft" | "sq";
export type VTTLayer = "map" | "token" | "gm";
/** `chebyshev`: diagonal custa 1 casa (D&D 5e); `5105`: alterna 1 e 2 casas. */
export type VTTDiagonalRule = "euclidean" | "5105" | "chebyshev";

export interface VTTScene {
	id: string;
	campaignId: string;
	name: string;
	mapImageUrl?: string | null;
	gridType: VTTGridType;
	gridSize: number;
	gridColor: string;
	gridOpacity: number;
	gridScaleDistance: number;
	gridScaleUnit: VTTGridScaleUnit;
	/** Offset do grid em px (0 ≤ offset < gridSize). Migration 0058. */
	gridOffsetX: number;
	gridOffsetY: number;
	/** Escala do sprite do mapa (1 = tamanho original). UI só na F3. */
	mapScale: number;
	width: number;
	height: number;
	fogEnabled: boolean;
	fogExploration: boolean;
	isActive: boolean;
	orderIndex: number;
	createdAt?: string;
	updatedAt?: string;
}

/** Campos do grid que o painel de ajuste pode gravar; patch parcial. */
export type VTTSceneSettingsPatch = Partial<
	Pick<
		VTTScene,
		| "gridType"
		| "gridSize"
		| "gridColor"
		| "gridOpacity"
		| "gridScaleDistance"
		| "gridScaleUnit"
		| "gridOffsetX"
		| "gridOffsetY"
	>
>;

export interface VTTAura {
	radius: number;
	color: string;
	opacity?: number;
}

export interface VTTToken {
	id: string;
	sceneId: string;
	characterId?: string | null;
	npcId?: string | null;
	name: string;
	avatarUrl?: string | null;
	layer: VTTLayer;
	x: number;
	y: number;
	targetX?: number;
	targetY?: number;
	sizeCells: number;
	rotation: number;
	hpCurrent?: number | null;
	hpMax?: number | null;
	elevation: number;
	conditions: string[];
	auras: VTTAura[];
	visionRange: number;
	isLocked: boolean;
	isHidden: boolean;
	controlledBy: string[];
	createdAt?: string;
	updatedAt?: string;
}

export type VTTFogShapeType = "brush" | "rect" | "circle" | "polygon";
export type VTTFogMode = "reveal" | "hide";

export interface VTTFogPath {
	id: string;
	type: VTTFogShapeType;
	mode: VTTFogMode;
	points?: { x: number; y: number }[];
	brushRadius?: number;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	radius?: number;
}

export type VTTRevealedPath = VTTFogPath;

export interface VTTFogState {
	id: string;
	sceneId: string;
	revealedPaths: VTTFogPath[];
	createdAt?: string;
	updatedAt?: string;
}

export interface VTTPingEvent {
	x: number;
	y: number;
	userId: string;
	userName: string;
	color: string;
	timestamp: number;
}

export interface VTTRulerMeasurement {
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
	distance: number;
	unit: string;
	/** Pontos fixados, a origem inclusive. Sem eles, a régua é start → current. */
	waypoints?: { x: number; y: number }[];
	/** Distância de cada trecho, na ordem do caminho. */
	segments?: number[];
	/** Casas do caminho inteiro pela regra de diagonal. */
	cells?: number;
	/** Fixada com duplo clique ou Enter: não segue mais o cursor. */
	pinned?: boolean;
	userName?: string;
	color?: string;
}

export interface VTTPresenceUser {
	userId: string;
	userName: string;
	avatarUrl?: string | null;
	color: string;
	isGM: boolean;
	onlineAt: number;
	lastActiveAt?: number;
	cursor?: { x: number; y: number } | null;
}

export interface VTTRemoteCursor {
	userId: string;
	userName: string;
	color: string;
	x: number;
	y: number;
	timestamp: number;
}

export interface VTTRemoteMeasurement extends VTTRulerMeasurement {
	userId?: string;
}
