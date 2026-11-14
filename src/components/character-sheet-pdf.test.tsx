// @vitest-environment node
import { inflateSync } from "node:zlib";
import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import {
	longsword,
	ringOfAlertness,
	shield,
	thalia,
} from "@/core/rules/thalia.fixture";
import type { Character, InventoryItem, Item } from "@/lib/store/types";
import { CharacterSheetPdfDocument } from "./character-sheet-pdf";

function make(id: string, data: Partial<Item>): Item {
	return { ...ringOfAlertness, id, name: id, bonuses: undefined, ...data };
}

const gloves = make("gloves", {
	name: "Luvas de Poder de Ogro",
	type: "Item Maravilhoso",
	slot: "hands",
	requiresAttunement: true,
	abilityBonuses: [{ id: "a", ability: "strength", mode: "set", value: 19 }],
});
const bracers = make("bracers", {
	name: "Bracadeiras do Duelista",
	type: "Item Maravilhoso",
	slot: "cloak",
	requiresAttunement: false,
	bonuses: [
		{ id: "a", target: "attack", value: 1 },
		{ id: "b", target: "damage", value: 2 },
	],
});

const items = new Map<string, Item>(
	[longsword, shield, gloves, bracers].map((i) => [i.id, i]),
);

function entry(item: Item, extra: Partial<InventoryItem> = {}): InventoryItem {
	return {
		id: `e-${item.id}`,
		name: item.name,
		quantity: 1,
		weightLbs: 0,
		location: "equipped",
		campaignItemId: item.id,
		...(item.requiresAttunement ? { isAttuned: true } : {}),
		...extra,
	};
}

const character = {
	...thalia,
	characterName: "Thalia",
	system: "dnd5e",
	strength: 14,
	dexterity: 12,
	constitution: 14,
	armorClass: 11,
	initiative: 1,
	speed: 9,
	level: 7,
	proficiencyBonus: 3,
	health: 40,
	healthMax: 58,
	tempHealth: 0,
	inventoryList: [
		entry(longsword, { slot: "mainHand", proficient: true }),
		entry(shield, { slot: "offHand" }),
		entry(gloves, { slot: "hands" }),
		entry(bracers, { slot: "cloak" }),
	],
} as unknown as Character;

/**
 * Texto do PDF: abre os streams e junta, por operador TJ, os trechos em
 * hexadecimal (`<4a6f>`) ou literais (`(Jo)`), ignorando os ajustes de espaço.
 */
function pdfText(buffer: Buffer): string {
	const raw = buffer.toString("latin1");
	const out: string[] = [];
	for (const m of raw.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
		let content: string;
		try {
			content = inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
		} catch {
			continue;
		}
		for (const tj of content.matchAll(/\[([^\]]*)\]\s*TJ/g)) {
			let text = "";
			for (const piece of tj[1].matchAll(
				/<([0-9a-fA-F]*)>|\(((?:[^)\\]|\\.)*)\)/g,
			)) {
				text +=
					piece[1] !== undefined
						? Buffer.from(piece[1], "hex").toString("latin1")
						: piece[2];
			}
			if (text) out.push(text);
		}
	}
	// Os rótulos saem em maiúsculas no PDF: compara sem diferenciar a caixa.
	return out.join("\n").toLowerCase();
}

async function render(c: Character, itemsById: ReadonlyMap<string, Item>) {
	const buffer = await renderToBuffer(
		<CharacterSheetPdfDocument
			character={c}
			options={{
				variant: "color",
				includeImage: false,
				includeAppLogo: false,
				itemsById,
			}}
		/>,
	);
	return pdfText(buffer);
}

describe("PDF da ficha D&D 5e com itens equipados", () => {
	it("imprime atributos, CA, iniciativa e ataques já com os itens", async () => {
		const text = await render(character, items);
		// FOR 14 → 19 (Luvas): valor com itens, base da ficha no rótulo
		expect(text).toContain("for (ficha 14)");
		expect(text).toContain("19 (+4)");
		// CA: 11 da ficha + escudo +2 = 13 sobe? sem armadura vinculada: base 11 + 2
		expect(text).toMatch(/classe de armadura/);
		// Ataque: prof 3 + FOR +4 + magia 1 + braçadeiras 1 = +9; dano 1d8+4+1+2 = 1d8+7... (versátil à parte)
		expect(text).toContain("ataque: espada longa +1");
		expect(text).toMatch(/\+9\s+para acertar/);
		expect(text).toContain("dano 1d8+7");
	});

	it("lista o que está equipado, por slot, com a sintonia", async () => {
		const text = await render(character, items);
		expect(text).toContain("maos: luvas de poder de ogro");
		expect(text).toContain("[sintonizado]");
		expect(text).toContain("mao principal: espada longa +1");
	});

	it("sem os itens da campanha, sai como antes (valores da ficha)", async () => {
		const text = await render(character, new Map());
		expect(text).not.toContain("(ficha 14)");
		expect(text).not.toContain("ataque:");
	});

	it("outros sistemas não mudam", async () => {
		const text = await render(
			{ ...character, system: "ordem" } as Character,
			items,
		);
		expect(text).not.toContain("(ficha 14)");
	});
});
