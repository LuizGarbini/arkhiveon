import { describe, expect, it } from "vitest";
import {
	parseCharacterPatch,
	summarizeCharacter,
	toRoster,
} from "../../../supabase/functions/_shared/ia-mesa-character";
import {
	buildSystemPrompt,
	parseToolCall,
} from "../../../supabase/functions/_shared/ia-mesa-guard";
import type { Character } from "../store/types";
import {
	applyCharacterPatch,
	buildCharacterPatchDiff,
	missingPatchItems,
} from "./character-patch";
import { normalizeResponse } from "./proposal";

const dante = {
	id: "dante-1",
	characterName: "Dante Diavolo",
	system: "dnd5e",
	class: "Guerreiro",
	level: 5,
	strength: 16,
	dexterity: 12,
	health: 30,
	healthMax: 44,
	armorClass: 16,
	inventoryList: [
		{
			id: "sword",
			name: "Espada longa",
			quantity: 1,
			weightLbs: 3,
			location: "equipped",
			category: "weapon",
			weapon: {
				damageDice: "1d8",
				damageType: "slashing",
				ability: "strength",
			},
		},
		{
			id: "rope",
			name: "Corda",
			quantity: 1,
			weightLbs: 10,
			location: "backpack",
			category: "gear",
		},
	],
} as unknown as Character;

const scope = {
	characters: [
		{ id: "dante-1", name: "Dante Diavolo", itemIds: ["sword", "rope"] },
	],
};

const rawPatch = {
	characterId: "dante-1",
	summary: "FOR 18, espada +1 com runa de fogo e poção nova.",
	fields: { strength: 18, health: 44, hacked: 999, armorClass: "17" },
	updateItems: [
		{
			itemId: "sword",
			weapon: {
				damageDice: "1d8",
				damageType: "slashing",
				ability: "strength",
				magicBonus: 1,
				extraDamage: [{ label: "Runa de fogo", amount: "1d6", type: "fire" }],
			},
		},
	],
	addItems: [
		{ name: "Poção de cura", quantity: 2, category: "potion", run: "rm -rf" },
	],
	removeItemIds: ["rope"],
};

describe("ia-mesa: propose_character_patch (servidor)", () => {
	it("aceita só campos da allowlist e saneia", () => {
		const p = parseCharacterPatch(rawPatch, scope);
		expect(p).not.toBeNull();
		expect(p?.characterName).toBe("Dante Diavolo");
		expect(p?.fields).toEqual({ strength: 18, health: 44, armorClass: 17 });
		expect(p?.addItems[0]).toEqual({
			name: "Poção de cura",
			quantity: 2,
			location: "backpack",
			category: "potion",
		});
		expect(p?.updateItems[0].weapon?.magicBonus).toBe(1);
		expect(p?.removeItemIds).toEqual(["rope"]);
	});

	it("limita faixas (FOR 1–30, nível 1–20)", () => {
		const p = parseCharacterPatch(
			{ characterId: "dante-1", fields: { strength: 99, level: 0 } },
			scope,
		);
		expect(p?.fields).toEqual({ strength: 30, level: 1 });
	});

	it("recusa ficha fora da campanha e itens inventados", () => {
		expect(
			parseCharacterPatch({ ...rawPatch, characterId: "outra-mesa" }, scope),
		).toBeNull();
		expect(
			parseCharacterPatch(
				{ characterId: "dante-1", removeItemIds: ["nao-existe"] },
				scope,
			),
		).toBeNull();
	});

	it("patch vazio ou dado inválido não vira proposta", () => {
		expect(
			parseCharacterPatch({ characterId: "dante-1", fields: {} }, scope),
		).toBeNull();
		const bad = parseCharacterPatch(
			{
				characterId: "dante-1",
				updateItems: [
					{
						itemId: "sword",
						weapon: { damageDice: "9999d9", damageType: "x" },
					},
				],
			},
			scope,
		);
		expect(bad).toBeNull();
	});

	it("parseToolCall: read_character nunca é proposta; patch passa pelo escopo", () => {
		expect(
			parseToolCall("read_character", { characterId: "dante-1" }),
		).toBeNull();
		expect(
			parseToolCall("propose_character_patch", rawPatch, scope)?.kind,
		).toBe("character_patch");
	});

	it("leitura devolve só campos editáveis + inventário com itemId", () => {
		const row = {
			id: "dante-1",
			name: "Dante Diavolo",
			system: "dnd5e",
			data: dante,
		};
		const summary = summarizeCharacter(row);
		expect(summary).toMatchObject({
			characterId: "dante-1",
			name: "Dante Diavolo",
			fields: { strength: 16, armorClass: 16 },
		});
		expect((summary.inventory as unknown[]).length).toBe(2);
		expect(JSON.stringify(summary)).not.toContain("notes");
		expect(toRoster([row])).toEqual([
			{ id: "dante-1", name: "Dante Diavolo", class: "Guerreiro", level: 5 },
		]);
	});

	it("system prompt lista as fichas da campanha e as ferramentas", () => {
		const prompt = buildSystemPrompt({ name: "Rise", system: "dnd5e" }, [
			{ id: "dante-1", name: "Dante Diavolo", class: "Guerreiro", level: 5 },
		]);
		expect(prompt).toContain("read_character");
		expect(prompt).toContain("propose_character_patch");
		expect(prompt).toContain("id=dante-1");
		expect(prompt).toMatch(/multiclasse/);
	});
});

describe("ia-mesa: patch no cliente (diff + aplicar)", () => {
	const proposal = parseCharacterPatch(rawPatch, scope);
	if (!proposal) throw new Error("proposal");

	it("cliente re-saneia a resposta da rede", () => {
		const result = normalizeResponse({
			ok: true,
			reply: "ok",
			proposal: { ...proposal, fields: { strength: 18, evil: 1 } },
		});
		expect(result.ok && result.proposal?.kind).toBe("character_patch");
		if (result.ok && result.proposal?.kind === "character_patch")
			expect(result.proposal.fields).toEqual({ strength: 18 });
	});

	it("diff mostra antes → depois", () => {
		const rows = buildCharacterPatchDiff(dante, proposal);
		expect(rows).toContainEqual({
			kind: "field",
			label: "FOR",
			before: "16",
			after: "18",
		});
		expect(rows.find((r) => r.kind === "item-update")?.after).toContain(
			"1d8 slashing +1 + 1d6 fire",
		);
		expect(rows.find((r) => r.kind === "item-add")?.label).toBe(
			"Poção de cura",
		);
		expect(rows.find((r) => r.kind === "item-remove")?.label).toBe("Corda");
	});

	it("aplicar monta o patch sem mexer na ficha original e guarda o antes", () => {
		let n = 0;
		const result = applyCharacterPatch(dante, proposal, () => `new-${++n}`);
		if (!result.ok) throw new Error(result.error);
		expect(result.changes).toMatchObject({
			strength: 18,
			health: 44,
			armorClass: 17,
		});
		const inv = result.changes.inventoryList ?? [];
		expect(inv.map((i) => i.id)).toEqual(["sword", "new-2"]);
		expect(inv[0].weapon?.magicBonus).toBe(1);
		expect(inv[0].weapon?.extraDamage?.[0]).toMatchObject({
			label: "Runa de fogo",
			amount: "1d6",
			type: "fire",
		});
		expect(result.before).toMatchObject({ strength: 16, health: 30 });
		expect(result.before.inventoryList).toBe(dante.inventoryList);
		// Ficha original intacta.
		expect(dante.strength).toBe(16);
		expect(dante.inventoryList).toHaveLength(2);
	});

	it("ficha mudou (item sumiu) ou ficha errada = não aplica", () => {
		const changed = { ...dante, inventoryList: [] } as Character;
		expect(missingPatchItems(changed, proposal)).toEqual(["sword", "rope"]);
		expect(applyCharacterPatch(changed, proposal).ok).toBe(false);
		expect(
			applyCharacterPatch({ ...dante, id: "outro" } as Character, proposal).ok,
		).toBe(false);
	});

	it("patch preserva o vínculo com o item da campanha", () => {
		const linked = {
			...dante,
			inventoryList: (dante.inventoryList ?? []).map((i) =>
				i.id === "sword"
					? { ...i, campaignItemId: "item-espada", proficient: false }
					: i,
			),
		} as Character;
		const result = applyCharacterPatch(linked, proposal, () => "new-x");
		if (!result.ok) throw new Error(result.error);
		const sword = (result.changes.inventoryList ?? []).find(
			(i) => i.id === "sword",
		);
		expect(sword?.campaignItemId).toBe("item-espada");
		expect(sword?.proficient).toBe(false);
	});
});
