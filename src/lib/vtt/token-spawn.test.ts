import { describe, expect, it } from "vitest";
import { tokenHpInsert } from "./character-hp";
import {
	buildTokenInsertPayload,
	insertVttToken,
	requirePlaceContext,
	TOKEN_PLACE_FAILED,
	TOKEN_PLACE_NEEDS_GM,
} from "./token-spawn";
import type { VTTToken } from "./types";

const SCENE_ID = "scene-templo-duas-irmas";

const dargan: Partial<VTTToken> = {
	npcId: "11111111-1111-4111-8111-111111111111",
	name: "Dargan",
	avatarUrl: "https://cdn.test/dargan.webp",
	x: 105,
	y: 175,
	layer: "token",
};

const andariel: Partial<VTTToken> = {
	npcId: "22222222-2222-4222-8222-222222222222",
	name: "Andariel",
	avatarUrl: "https://cdn.test/andariel.webp",
	x: 175,
	y: 175,
	layer: "token",
};

const lyra: Partial<VTTToken> = {
	characterId: "33333333-3333-4333-8333-333333333333",
	name: "Lyra",
	hpCurrent: 12,
	hpMax: 20,
	x: 245,
	y: 175,
	layer: "token",
};

function hpFor(token: Partial<VTTToken>, sheetOwnsHp = false) {
	return tokenHpInsert({
		characterId: token.characterId,
		sheetOwnsHp,
		hpCurrent: token.hpCurrent,
		hpMax: token.hpMax,
	});
}

function rowFrom(payload: DatabaseInsert, id: string) {
	return {
		id,
		scene_id: payload.scene_id,
		character_id: payload.character_id ?? null,
		npc_id: payload.npc_id ?? null,
		name: payload.name ?? "Token",
		avatar_url: payload.avatar_url ?? null,
		layer: payload.layer ?? "token",
		x: payload.x ?? 0,
		y: payload.y ?? 0,
		size_cells: payload.size_cells ?? 1,
		rotation: payload.rotation ?? 0,
		hp_current: payload.hp_current ?? null,
		hp_max: payload.hp_max ?? null,
		temp_hp: payload.temp_hp ?? 0,
		elevation: payload.elevation ?? 0,
		conditions: payload.conditions ?? [],
		auras: payload.auras ?? [],
		vision_range: payload.vision_range ?? 6,
		is_locked: payload.is_locked ?? false,
		is_hidden: payload.is_hidden ?? false,
		controlled_by: payload.controlled_by ?? [],
		created_at: "2026-11-09T00:00:00Z",
		updated_at: "2026-11-09T00:00:00Z",
	};
}

type DatabaseInsert = Parameters<typeof insertVttToken>[1];

function missingTempHpClient() {
	const calls: DatabaseInsert[] = [];
	const insert = async (payload: DatabaseInsert) => {
		calls.push(payload);
		if (Object.hasOwn(payload, "temp_hp")) {
			return {
				data: null,
				error: {
					code: "42703",
					message: 'column "temp_hp" of relation "vtt_tokens" does not exist',
				},
			};
		}
		return { data: rowFrom(payload, `tok-${calls.length}`), error: null };
	};
	return { insert, calls };
}

describe("requirePlaceContext", () => {
	it("blocks a player, a missing client, and a missing scene", () => {
		expect(() =>
			requirePlaceContext({ client: {}, sceneId: SCENE_ID, isGM: false }),
		).toThrow(TOKEN_PLACE_NEEDS_GM);
		expect(() =>
			requirePlaceContext({ client: null, sceneId: SCENE_ID, isGM: true }),
		).toThrow(TOKEN_PLACE_NEEDS_GM);
		expect(() =>
			requirePlaceContext({ client: {}, sceneId: null, isGM: true }),
		).toThrow(TOKEN_PLACE_NEEDS_GM);
	});

	it("lets the GM place on the active scene", () => {
		const client = {};
		expect(
			requirePlaceContext({ client, sceneId: SCENE_ID, isGM: true }),
		).toEqual({ client, sceneId: SCENE_ID });
	});
});

describe("buildTokenInsertPayload", () => {
	it("links Dargan by npc_id and does not set character_id", () => {
		const payload = buildTokenInsertPayload(SCENE_ID, dargan, hpFor(dargan));
		expect(payload.npc_id).toBe(dargan.npcId);
		expect(payload.character_id).toBeNull();
		expect(payload.name).toBe("Dargan");
		expect(payload.hp_current).toBe(20);
		expect(payload.hp_max).toBe(20);
	});

	it("links Andariel (Deusa do Sol) the same way as any other NPC", () => {
		const payload = buildTokenInsertPayload(
			SCENE_ID,
			andariel,
			hpFor(andariel),
		);
		expect(payload.npc_id).toBe(andariel.npcId);
		expect(payload.character_id).toBeNull();
		expect(payload.name).toBe("Andariel");
	});

	it("links a character by character_id and does not set npc_id", () => {
		const payload = buildTokenInsertPayload(SCENE_ID, lyra, hpFor(lyra));
		expect(payload.character_id).toBe(lyra.characterId);
		expect(payload.npc_id).toBeNull();
		expect(payload.hp_current).toBe(12);
		expect(payload.hp_max).toBe(20);
	});

	it("keeps sheet-owned character HP null on the token row", () => {
		const payload = buildTokenInsertPayload(SCENE_ID, lyra, hpFor(lyra, true));
		expect(payload.hp_current).toBeNull();
		expect(payload.hp_max).toBeNull();
		expect(payload.character_id).toBe(lyra.characterId);
	});
});

describe("insertVttToken", () => {
	it("places Dargan when the database has no temp_hp column yet", async () => {
		const { insert, calls } = missingTempHpClient();
		const payload = buildTokenInsertPayload(SCENE_ID, dargan, hpFor(dargan));
		const row = await insertVttToken(insert, payload);
		expect(row.npc_id).toBe(dargan.npcId);
		expect(row.name).toBe("Dargan");
		expect(calls).toHaveLength(2);
		expect(Object.hasOwn(calls[0], "temp_hp")).toBe(true);
		expect(Object.hasOwn(calls[1], "temp_hp")).toBe(false);
	});

	it("places Andariel with the same missing-column fallback", async () => {
		const { insert } = missingTempHpClient();
		const row = await insertVttToken(
			insert,
			buildTokenInsertPayload(SCENE_ID, andariel, hpFor(andariel)),
		);
		expect(row.npc_id).toBe(andariel.npcId);
		expect(row.name).toBe("Andariel");
	});

	it("places a character when temp_hp is missing", async () => {
		const { insert } = missingTempHpClient();
		const row = await insertVttToken(
			insert,
			buildTokenInsertPayload(SCENE_ID, lyra, hpFor(lyra)),
		);
		expect(row.character_id).toBe(lyra.characterId);
		expect(row.npc_id).toBeNull();
	});

	it("still surfaces the library error for a non-column failure", async () => {
		const payload = buildTokenInsertPayload(SCENE_ID, dargan, hpFor(dargan));
		await expect(
			insertVttToken(async () => {
				return {
					data: null,
					error: { code: "23503", message: "foreign key violation" },
				};
			}, payload),
		).rejects.toThrow(TOKEN_PLACE_FAILED);
	});
});
