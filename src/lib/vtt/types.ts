export type VTTGridType = "square" | "hex_pointy" | "hex_flat" | "none";
export type VTTGridScaleUnit = "m" | "ft" | "sq";
export type VTTLayer = "map" | "token" | "gm";

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

export interface VTTRevealedPath {
	type: "rect" | "circle" | "polygon";
	points?: { x: number; y: number }[];
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	radius?: number;
}

export interface VTTFogState {
	id: string;
	sceneId: string;
	revealedPaths: VTTRevealedPath[];
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
