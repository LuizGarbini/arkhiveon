/**
 * IA da mesa: a ficha resumida soma os itens equipados na CA, na iniciativa e
 * no deslocamento, com a MESMA conta da ficha (`_shared/combat-core`). Os
 * itens vêm de UMA query em `items` com o cliente de quem pergunta; item que
 * o RLS não deixa ler não volta e não soma.
 */
import { describe, expect, it } from "vitest";
import { computeEffectiveStats } from "@/core/rules/equipment";
import type { Character, Item } from "@/lib/store/types";
import {
	type CharacterRow,
	combatItemsFromRows,
	equippedItemIds,
	summarizeCharacter,
} from "../../../supabase/functions/_shared/ia-mesa-character";
import { loadIaMesaContext } from "../../../supabase/functions/ia-mesa-chat/context";

const CAMPAIGN = "11111111-2222-4333-8444-555555555555";
const USER = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const CHARACTER = "cccccccc-dddd-4eee-8fff-000000000001";
const AMULET = "a0000000-0000-4000-8000-000000000001";
const RING = "a0000000-0000-4000-8000-000000000002";
const BOOTS = "a0000000-0000-4000-8000-000000000003";

/** Linhas de `items` como o Supabase devolve (`id, name, data`). */
const amuletRow = {
	id: AMULET,
	name: "Amuleto da Prontidão",
	data: {
		name: "Amuleto da Prontidão",
		type: "Amuleto",
		requiresAttunement: false,
		bonuses: [{ id: "b1", target: "initiative", value: 5 }],
	},
};
const ringRow = {
	id: RING,
	name: "Anel de Proteção",
	data: {
		name: "Anel de Proteção",
		type: "Anel",
		requiresAttunement: false,
		bonuses: [{ id: "b2", target: "ac", value: 2 }],
	},
};

/** Lia: DES 14 (+2), CA 15 e iniciativa +2 digitadas, 9 m. */
function liaRow(): CharacterRow {
	return {
		id: CHARACTER,
		name: "Lia",
		system: "dnd5e",
		data: {
			characterName: "Lia",
			system: "dnd5e",
			dexterity: 14,
			armorClass: 15,
			initiative: 2,
			speed: 9,
			inventoryList: [
				{
					id: "inv-amuleto",
					name: "Amuleto da Prontidão",
					quantity: 1,
					location: "equipped",
					category: "gear",
					campaignItemId: AMULET,
				},
				{
					id: "inv-anel",
					name: "Anel de Proteção",
					quantity: 1,
					location: "equipped",
					category: "gear",
					campaignItemId: RING,
				},
				{
					id: "inv-botas",
					name: "Botas guardadas",
					quantity: 1,
					location: "backpack",
					category: "gear",
					campaignItemId: BOOTS,
				},
			],
		},
	};
}

type Effective = {
	armorClass: number;
	initiative: number;
	speed: number;
	why: string[];
};

function effectiveOf(summary: Record<string, unknown>): Effective | undefined {
	return summary.effective as Effective | undefined;
}

describe("IA da mesa: bônus dos itens equipados no resumo da ficha", () => {
	it("+5 na iniciativa e +2 na CA entram no resumo; o valor salvo fica em fields", () => {
		const items = combatItemsFromRows([amuletRow, ringRow]);
		const summary = summarizeCharacter(liaRow(), items);

		expect(effectiveOf(summary)).toMatchObject({
			armorClass: 17,
			initiative: 7,
			speed: 9,
		});
		expect(effectiveOf(summary)?.why).toEqual([
			"CA: CA da ficha 15, Anel de Proteção +2",
			"Iniciativa: Destreza +2, Amuleto da Prontidão +5",
		]);
		// Patch continua partindo do valor salvo, não do total com itens.
		expect(summary.fields).toMatchObject({ armorClass: 15, initiative: 2 });
	});

	it("dá o mesmo número que computeEffectiveStats da ficha", () => {
		const row = liaRow();
		const items = combatItemsFromRows([amuletRow, ringRow]);
		const app = computeEffectiveStats(
			row.data as unknown as Character,
			new Map([
				[AMULET, { ...amuletRow.data, id: AMULET } as unknown as Item],
				[RING, { ...ringRow.data, id: RING } as unknown as Item],
			]),
		);
		const effective = effectiveOf(summarizeCharacter(row, items));
		expect(effective?.armorClass).toBe(app.ac.total);
		expect(effective?.initiative).toBe(app.initiative.total);
		expect(effective?.speed).toBe(app.speed.total);
	});

	it("item que o jogador não lê (fora do mapa) não soma nada", () => {
		// O RLS escondeu o Anel: só o Amuleto voltou da query.
		const onlyAmulet = combatItemsFromRows([amuletRow]);
		const effective = effectiveOf(summarizeCharacter(liaRow(), onlyAmulet));
		expect(effective).toMatchObject({ armorClass: 15, initiative: 7 });
		expect(effective?.why.join(" ")).not.toContain("Anel");

		// Nenhum item legível: sem `effective`, vale a ficha.
		const none = summarizeCharacter(liaRow(), combatItemsFromRows([]));
		expect(none.effective).toBeUndefined();
		expect(none.fields).toMatchObject({ armorClass: 15, initiative: 2 });
	});

	it("item que exige sintonia sem estar sintonizado, ou ficha de outro sistema, não soma", () => {
		const attune = combatItemsFromRows([
			{ ...ringRow, data: { ...ringRow.data, requiresAttunement: true } },
		]);
		expect(summarizeCharacter(liaRow(), attune).effective).toBeUndefined();

		const other = { ...liaRow(), system: "ordem" };
		(other.data as Record<string, unknown>).system = "ordem";
		const items = combatItemsFromRows([amuletRow, ringRow]);
		expect(summarizeCharacter(other, items).effective).toBeUndefined();
	});

	it("só pede os ids No Corpo, sem repetir", () => {
		expect(equippedItemIds([liaRow(), liaRow()])).toEqual([AMULET, RING]);
	});
});

type Op = [string, ...unknown[]];
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
						in(column: string, values: readonly unknown[]) {
							call.ops.push(["in", column, values]);
							return chain;
						},
						limit(count: number) {
							call.ops.push(["limit", count]);
							return chain;
						},
						maybeSingle() {
							return Promise.resolve({ data: resolve(call), error: null });
						},
						list() {
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

describe("IA da mesa: o contexto lê os itens numa query só, com RLS", () => {
	it("uma query em items com .in(ids equipados); o que o RLS esconde não soma", async () => {
		const { db, calls } = fakeDb((call) => {
			if (call.table === "characters") {
				const limit = call.ops.find((op) => op[0] === "limit")?.[1];
				return limit === 1 ? liaRow() : [liaRow()];
			}
			if (call.table === "items") {
				// Simula o RLS: quem pergunta só lê o Amuleto.
				return [amuletRow];
			}
			return null;
		});

		const loaded = await loadIaMesaContext(db, {
			campaignId: CAMPAIGN,
			userId: USER,
			role: "player",
		});

		const itemCalls = calls.filter((c) => c.table === "items");
		expect(itemCalls).toHaveLength(1);
		expect(itemCalls[0].columns).toBe("id, name, data");
		expect(itemCalls[0].ops).toContainEqual(["in", "id", [AMULET, RING]]);

		const sheet = JSON.parse(loaded.context.sheetText);
		expect(sheet.effective).toMatchObject({ armorClass: 15, initiative: 7 });
		expect([...loaded.itemsById.keys()]).toEqual([AMULET]);
	});

	it("sem item equipado vinculado, nenhuma query em items", async () => {
		const plain = { id: CHARACTER, name: "Lia", system: "dnd5e", data: {} };
		const { db, calls } = fakeDb((call) =>
			call.table === "characters"
				? call.ops.some((op) => op[0] === "limit" && op[1] === 1)
					? plain
					: [plain]
				: null,
		);
		await loadIaMesaContext(db, { campaignId: CAMPAIGN, userId: USER });
		expect(calls.some((c) => c.table === "items")).toBe(false);
	});
});
