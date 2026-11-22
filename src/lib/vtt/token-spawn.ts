import type { Database, Json } from "@/lib/database.types";
import type { VTTToken } from "./types";

export const TOKEN_PLACE_FAILED =
	"Não foi possível colocar o token. Tente novamente.";
export const TOKEN_PLACE_NEEDS_GM =
	"É necessário estar conectado como mestre para colocar tokens.";
export const TOKEN_PLACE_DENIED =
	"Não deu para colocar: só fichas e NPCs que você vê, na cena publicada.";

type TokenInsert = Database["public"]["Tables"]["vtt_tokens"]["Insert"];
type TokenRow = Database["public"]["Tables"]["vtt_tokens"]["Row"];

export interface TokenInsertError {
	code?: string;
	message?: string;
}

export type TokenInsertFn = (
	payload: TokenInsert,
) => PromiseLike<{ data: TokenRow | null; error: TokenInsertError | null }>;

export function requirePlaceContext<T>(input: {
	client: T | null;
	sceneId: string | null | undefined;
	/** Mestre ou co-mestre. A RLS já deixa o editor inserir. */
	canManage: boolean;
}): { client: T; sceneId: string } {
	if (!input.client || !input.sceneId || !input.canManage) {
		throw new Error(TOKEN_PLACE_NEEDS_GM);
	}
	return { client: input.client, sceneId: input.sceneId };
}

export function isMissingTempHpColumn(
	error: TokenInsertError | null | undefined,
): boolean {
	if (!error) return false;
	if (error.code === "42703" || error.code === "PGRST204") return true;
	return Boolean(error.message?.includes("temp_hp"));
}

export function buildTokenInsertPayload(
	sceneId: string,
	tokenData: Partial<VTTToken>,
	hpColumns: { hp_current: number | null; hp_max: number | null },
): TokenInsert {
	return {
		scene_id: sceneId,
		character_id: tokenData.characterId || null,
		npc_id: tokenData.npcId || null,
		name: tokenData.name || "Token",
		avatar_url: tokenData.avatarUrl || null,
		layer: tokenData.layer || "token",
		x: tokenData.x || 0,
		y: tokenData.y || 0,
		size_cells: tokenData.sizeCells || 1.0,
		rotation: tokenData.rotation || 0,
		hp_current: hpColumns.hp_current,
		hp_max: hpColumns.hp_max,
		temp_hp: tokenData.tempHp ?? 0,
		elevation: tokenData.elevation || 0,
		conditions: (tokenData.conditions || []) as unknown as Json,
		auras: (tokenData.auras || []) as unknown as Json,
		vision_range: tokenData.visionRange || 6,
		is_locked: tokenData.isLocked || false,
		is_hidden: tokenData.isHidden || false,
		controlled_by: (tokenData.controlledBy || []) as unknown as Json,
	};
}

function withoutTempHp(payload: TokenInsert): TokenInsert {
	const next = { ...payload };
	delete next.temp_hp;
	return next;
}

export async function insertVttToken(
	insert: TokenInsertFn,
	payload: TokenInsert,
): Promise<TokenRow> {
	const first = await insert(payload);
	if (
		first.error &&
		isMissingTempHpColumn(first.error) &&
		Object.hasOwn(payload, "temp_hp")
	) {
		const retry = await insert(withoutTempHp(payload));
		if (retry.error || !retry.data) {
			console.error("Erro ao criar token:", retry.error);
			throw new Error(TOKEN_PLACE_FAILED);
		}
		return retry.data;
	}
	if (first.error || !first.data) {
		console.error("Erro ao criar token:", first.error);
		throw new Error(TOKEN_PLACE_FAILED);
	}
	return first.data;
}

/** Argumentos da RPC `vtt_place_token` (0081). Nome e imagem vêm do servidor. */
export interface PlaceTokenArgs {
	p_scene_id: string;
	p_character_id: string | null;
	p_npc_id: string | null;
	p_x: number;
	p_y: number;
}

export type PlaceTokenRpc = (
	args: PlaceTokenArgs,
) => PromiseLike<{ data: TokenRow | null; error: TokenInsertError | null }>;

/**
 * Jogador coloca token: só a origem (ficha OU NPC) e a posição vão ao
 * servidor. Nome, imagem, camada, visibilidade e trava a RPC decide.
 */
export function playerPlaceArgs(
	sceneId: string,
	tokenData: Pick<Partial<VTTToken>, "characterId" | "npcId" | "x" | "y">,
): PlaceTokenArgs {
	const characterId = tokenData.characterId || null;
	const npcId = tokenData.npcId || null;
	if ((characterId === null) === (npcId === null)) {
		throw new Error(TOKEN_PLACE_FAILED);
	}
	return {
		p_scene_id: sceneId,
		p_character_id: characterId,
		p_npc_id: npcId,
		p_x: Math.max(0, tokenData.x ?? 0),
		p_y: Math.max(0, tokenData.y ?? 0),
	};
}

export async function placeTokenViaRpc(
	rpc: PlaceTokenRpc,
	args: PlaceTokenArgs,
): Promise<TokenRow> {
	const { data, error } = await rpc(args);
	if (error || !data) {
		console.error("Erro ao colocar token:", error);
		throw new Error(
			error?.code === "42501" ? TOKEN_PLACE_DENIED : TOKEN_PLACE_FAILED,
		);
	}
	return data;
}
