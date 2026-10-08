export type VTTGridType = "square" | "hex_pointy" | "hex_flat" | "none";
export type VTTGridScaleUnit = "m" | "ft" | "sq";
export type VTTLayer = "map" | "token" | "gm";
export type VTTDiagonalRule = "euclidean" | "5105";

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
	width: number;
	height: number;
	fogEnabled: boolean;
	fogExploration: boolean;
	isActive: boolean;
	orderIndex: number;
	createdAt?: string;
	updatedAt?: string;
}

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

export interface VTTRemoteMeasurement {
	userId: string;
	userName: string;
	color: string;
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
	distance: number;
	unit: string;
}
