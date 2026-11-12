import { describe, expect, it } from "vitest";
import {
	loadIaMesaCharacter,
	loadIaMesaContext,
} from "../../../supabase/functions/ia-mesa-chat/context";

const CAMPAIGN = "11111111-2222-4333-8444-555555555555";
const USER = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const CHARACTER = "cccccccc-dddd-4eee-8fff-000000000001";
const SCENE = "dddddddd-eeee-4fff-8999-000000000002";

const CHARACTER_COLUMNS = "id, name, system, data";
const SCENE_COLUMNS = "id, name, fog_enabled";
const TOKEN_COLUMNS = "name, layer, x, y, is_hidden, character_id";
const FOG_COLUMNS = "revealed_paths";

type Op =
	| ["eq", string, unknown]
	| ["or", string]
	| ["limit", number]
	| ["maybeSingle"]
	| ["list"];

interface QueryCall {
	table: string;
	columns: string;
	ops: Op[];
}

function fakeDb(resolve: (call: QueryCall) => unknown) {
	const calls: QueryCall[] = [];
	const db = {
		from(table: string) {
			return {
				select(columns: string) {
					const call: QueryCall = { table, columns, ops: [] };
					calls.push(call);
					const chain = {
						eq(column: string, value: unknown) {
							call.ops.push(["eq", column, value]);
							return chain;
						},
						or(filters: string) {
							call.ops.push(["or", filters]);
							return chain;
						},
						limit(count: number) {
							call.ops.push(["limit", count]);
							return chain;
						},
						maybeSingle() {
							call.ops.push(["maybeSingle"]);
							return Promise.resolve({ data: resolve(call), error: null });
						},
						list() {
							call.ops.push(["list"]);
							return Promise.resolve({ data: resolve(call), error: null });
						},
					};
					return chain;
				},
			};
		},
	};
	return { db, calls };
}

function eq(call: QueryCall, column: string): unknown {
	const found = call.ops.find((op) => op[0] === "eq" && op[1] === column);
	return found && found[0] === "eq" ? found[2] : undefined;
}

function limitOf(call: QueryCall): number | undefined {
	const found = call.ops.find((op) => op[0] === "limit");
	return found && found[0] === "limit" ? found[1] : undefined;
}

const asker = {
	id: CHARACTER,
	name: "Lia",
	system: "dnd5e",
	data: { characterName: "Lia", health: 20 },
};

describe("ia-mesa-chat: loadContext busca uma ficha e a cena atual", () => {
	it("seleciona a ficha de quem pergunta, o roster leve e a cena ativa", async () => {
		const { db, calls } = fakeDb((call) => {
			if (call.table === "characters") {
				expect(call.columns).toBe(CHARACTER_COLUMNS);
				expect(eq(call, "campaign_id")).toBe(CAMPAIGN);
				expect(call.ops.some((op) => op[0] === "or")).toBe(false);
				if (limitOf(call) === 1) {
					expect(eq(call, "user_id")).toBe(USER);
					return asker;
				}
				if (limitOf(call) === 40) {
					return [asker];
				}
				return null;
			}
			if (call.table === "vtt_scenes") {
				expect(call.columns).toBe(SCENE_COLUMNS);
				expect(eq(call, "campaign_id")).toBe(CAMPAIGN);
				expect(eq(call, "is_active")).toBe(true);
				expect(call.ops.some((op) => op[0] === "maybeSingle")).toBe(true);
				return {
					id: SCENE,
					name: "Cripta",
					fog_enabled: true,
				};
			}
			if (call.table === "vtt_tokens") {
				expect(call.columns).toBe(TOKEN_COLUMNS);
				expect(eq(call, "scene_id")).toBe(SCENE);
				return [
					{
						name: "Goblin",
						layer: "token",
						x: 3,
						y: 4,
						is_hidden: false,
						character_id: CHARACTER,
					},
				];
			}
			if (call.table === "vtt_fog_states") {
				expect(call.columns).toBe(FOG_COLUMNS);
				expect(eq(call, "scene_id")).toBe(SCENE);
				return {
					revealed_paths: [
						{ type: "rect", mode: "reveal", x: 0, y: 0, width: 8, height: 8 },
					],
				};
			}
			throw new Error(`tabela inesperada: ${call.table}`);
		});

		const loaded = await loadIaMesaContext(db, {
			campaignId: CAMPAIGN,
			userId: USER,
			role: "gm",
		});

		const characterCalls = calls.filter((call) => call.table === "characters");
		expect(characterCalls).toHaveLength(2);
		expect(calls.map((call) => call.table)).toEqual([
			"campaigns",
			"characters",
			"characters",
			"vtt_scenes",
			"vtt_tokens",
			"vtt_fog_states",
		]);
		expect(loaded.asker?.id).toBe(CHARACTER);
		expect(loaded.context.sheetText).toContain("Lia");
		expect(loaded.context.roster).toEqual([
			{ id: CHARACTER, name: "Lia", class: "", level: null },
		]);
		expect(loaded.context.sceneName).toBe("Cripta");
		expect(loaded.context.fogEnabled).toBe(true);
		expect(loaded.context.tokens).toEqual([
			{
				name: "Goblin",
				layer: "token",
				x: 3,
				y: 4,
				hidden: false,
				characterId: CHARACTER,
			},
		]);
		expect(loaded.context.fog).toEqual([
			{ type: "rect", mode: "reveal", x: 0, y: 0, width: 8, height: 8 },
		]);
		expect(calls.some((call) => call.columns === "*")).toBe(false);
	});

	it("se user_id não achar ficha, busca a criada por quem pergunta, ainda uma linha", async () => {
		const { db, calls } = fakeDb((call) => {
			if (call.table !== "characters") return null;
			expect(call.columns).toBe(CHARACTER_COLUMNS);
			if (limitOf(call) === 1) {
				if (eq(call, "user_id") === USER) return null;
				if (eq(call, "created_by") === USER) return asker;
			}
			if (limitOf(call) === 40) {
				return [asker];
			}
			return null;
		});

		const loaded = await loadIaMesaContext(db, {
			campaignId: CAMPAIGN,
			userId: USER,
		});

		const characterCalls = calls.filter((call) => call.table === "characters");
		expect(characterCalls).toHaveLength(3);
		expect(eq(characterCalls[0], "user_id")).toBe(USER);
		expect(eq(characterCalls[1], "created_by")).toBe(USER);
		expect(limitOf(characterCalls[2])).toBe(40);
		expect(loaded.asker?.id).toBe(CHARACTER);
		expect(calls.filter((call) => call.table === "vtt_tokens")).toHaveLength(0);
	});

	it("alvo é uma ficha pelo id, com as colunas usadas", async () => {
		const { db, calls } = fakeDb((call) => {
			expect(call.table).toBe("characters");
			expect(call.columns).toBe(CHARACTER_COLUMNS);
			expect(eq(call, "campaign_id")).toBe(CAMPAIGN);
			expect(eq(call, "id")).toBe(CHARACTER);
			expect(call.ops.some((op) => op[0] === "maybeSingle")).toBe(true);
			expect(limitOf(call)).not.toBe(40);
			return asker;
		});

		const row = await loadIaMesaCharacter(db, {
			campaignId: CAMPAIGN,
			characterId: CHARACTER,
		});
		expect(row?.id).toBe(CHARACTER);
		expect(calls).toHaveLength(1);
	});

	it("id que não é uuid não dispara select", async () => {
		const { db, calls } = fakeDb(() => {
			throw new Error("não deveria consultar");
		});
		const row = await loadIaMesaCharacter(db, {
			campaignId: CAMPAIGN,
			characterId: "dante 1",
		});
		expect(row).toBeNull();
		expect(calls).toHaveLength(0);
	});
});
