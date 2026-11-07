import type { Database } from "@/lib/database.types";
import type {
	VTTAura,
	VTTGridScaleUnit,
	VTTGridType,
	VTTLayer,
	VTTScene,
	VTTToken,
} from "./types";
export function mapSceneRow(
	row: Database["public"]["Tables"]["vtt_scenes"]["Row"],
): VTTScene {
	return {
		id: row.id,
		campaignId: row.campaign_id,
		name: row.name,
		mapImageUrl: row.map_image_url,
		gridType: row.grid_type as VTTGridType,
		gridSize: row.grid_size,
		gridColor: row.grid_color,
		gridOpacity: row.grid_opacity,
		gridScaleDistance: row.grid_scale_distance,
		gridScaleUnit: row.grid_scale_unit as VTTGridScaleUnit,
		gridOffsetX: row.grid_offset_x ?? 0,
		gridOffsetY: row.grid_offset_y ?? 0,
		mapScale: row.map_scale ?? 1,
		width: row.width,
		height: row.height,
		fogEnabled: row.fog_enabled,
		fogExploration: row.fog_exploration,
		isActive: row.is_active,
		orderIndex: row.order_index,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
export function mapTokenRow(
	row: Database["public"]["Tables"]["vtt_tokens"]["Row"],
): VTTToken {
	return {
		id: row.id,
		sceneId: row.scene_id,
		characterId: row.character_id,
		npcId: row.npc_id,
		name: row.name,
		avatarUrl: row.avatar_url,
		layer: row.layer as VTTLayer,
		x: Number(row.x),
		y: Number(row.y),
		sizeCells: Number(row.size_cells),
		rotation: Number(row.rotation || 0),
		hpCurrent: row.hp_current,
		hpMax: row.hp_max,
		elevation: Number(row.elevation || 0),
		conditions: (row.conditions as unknown as string[]) || [],
		auras: (row.auras as unknown as VTTAura[]) || [],
		visionRange: Number(row.vision_range || 0),
		isLocked: row.is_locked,
		isHidden: row.is_hidden,
		controlledBy: (row.controlled_by as unknown as string[]) || [],
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}
