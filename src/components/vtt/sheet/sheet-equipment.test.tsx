// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { computeEffectiveStats } from "@/core/rules";
import { byId, thalia } from "@/core/rules/thalia.fixture";
import type { InventoryItem, Item } from "@/lib/store/types";
import { EquipmentTab } from "./sheet-equipment";

afterEach(cleanup);

function worn(id: string, name: string, type: string): Item {
	return {
		id,
		createdAt: 0,
		name,
		type,
		rarity: "comum",
		subtype: "",
		weight: "",
		value: "",
		requiresAttunement: false,
		attunedTo: "",
		charges: "",
		source: "",
		stats: "",
		properties: "",
		description: "",
		owner: "",
		imageUrl: "",
		equipped: false,
		entityLinks: [],
		worldId: "world-1",
		publicationScope: "restricted",
		campaignIds: ["camp-1"],
		visibility: "public",
	};
}

function entry(item: Item): InventoryItem {
	return {
		id: `inv-${item.id}`,
		name: item.name,
		quantity: 1,
		weightLbs: 0,
		location: "equipped",
		campaignItemId: item.id,
	};
}

describe("EquipmentTab", () => {
	it("mostra Braçadeira, Brincos, Bracelete e Cinto junto dos outros equipáveis", () => {
		const pieces = [
			worn("br", "Braçadeiras da Defesa", "Braçadeira"),
			worn("er", "Argolas da Corte", "Brincos"),
			worn("bc", "Bracelete Ágil", "Bracelete"),
			worn("bt", "Cinto do Gigante", "Cinto"),
		];
		const stats = computeEffectiveStats(
			{ ...thalia, inventoryList: pieces.map(entry) },
			byId(...pieces),
		);
		render(<EquipmentTab stats={stats} onOpenEquipment={() => {}} />);
		expect(screen.getByText("Braçadeiras")).toBeTruthy();
		expect(screen.getByText("Braçadeiras da Defesa")).toBeTruthy();
		expect(screen.getByText("Brinco")).toBeTruthy();
		expect(screen.getByText("Argolas da Corte")).toBeTruthy();
		expect(screen.getByText("Bracelete")).toBeTruthy();
		expect(screen.getByText("Bracelete Ágil")).toBeTruthy();
		expect(screen.getByText("Cinto")).toBeTruthy();
		expect(screen.getByText("Cinto do Gigante")).toBeTruthy();
		expect(screen.queryByText("Sem slot")).toBeNull();
		expect(screen.queryByText("Nada equipado")).toBeNull();
	});
});
