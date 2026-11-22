// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { effectiveCombatSummary } from "@/components/character-sheet/use-linked-items";
import { useRPGStore } from "@/lib/store";
import type { Character, Item } from "@/lib/store/types";

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
	}: {
		children?: ReactNode;
		className?: string;
	}) => (
		<a href="#link" className={className}>
			{children}
		</a>
	),
	useNavigate: () => vi.fn(),
}));

import { CharacterCard } from "./character-card";
import { DashboardPartyRoster } from "./dashboard/dashboard-party-roster";
import { PartyStatsMatrix } from "./party-stats-matrix";

/** Anel +5 na iniciativa e broche +2 na CA, os dois No Corpo. */
const RING: Item = {
	id: "it-ring",
	name: "Anel da Prontidão",
	type: "Anel",
	slot: "ring",
	requiresAttunement: false,
	bonuses: [{ id: "b-in", target: "initiative", value: 5 }],
	worldId: "w1",
	publicationScope: "global",
	campaignIds: [],
	visibility: "public",
} as unknown as Item;
const BROOCH: Item = {
	id: "it-brooch",
	name: "Broche do Escudo",
	type: "Amuleto",
	slot: "neck",
	requiresAttunement: false,
	bonuses: [{ id: "b-ac", target: "ac", value: 2 }],
	worldId: "w1",
	publicationScope: "global",
	campaignIds: [],
	visibility: "public",
} as unknown as Item;

function lyra(extra: Partial<Character> = {}): Character {
	return {
		id: "c1",
		system: "dnd5e",
		characterName: "Lyra",
		race: "Elfa",
		class: "Ladina",
		level: 3,
		health: 20,
		healthMax: 24,
		proficiencyBonus: 2,
		strength: 10,
		dexterity: 14,
		constitution: 12,
		intelligence: 10,
		wisdom: 10,
		charisma: 10,
		armorClass: 15,
		initiative: 2,
		speed: 9,
		share: "table",
		inventoryList: [
			{
				id: "e-ring",
				name: RING.name,
				quantity: 1,
				weightLbs: 0,
				location: "equipped",
				slot: "ring1",
				campaignItemId: RING.id,
			},
			{
				id: "e-brooch",
				name: BROOCH.name,
				quantity: 1,
				weightLbs: 0,
				location: "equipped",
				slot: "neck",
				campaignItemId: BROOCH.id,
			},
		],
		...extra,
	} as unknown as Character;
}

function seed(characters: Character[], items: Item[] = [RING, BROOCH]) {
	useRPGStore.setState({
		characters,
		items,
		campaigns: [
			{
				id: "camp1",
				name: "Campanha",
				worldId: "w1",
				ownerId: "gm",
				myRole: "owner",
			} as never,
		],
		activeCampaignId: "camp1",
	});
}

afterEach(() => {
	cleanup();
	useRPGStore.setState({
		characters: [],
		items: [],
		campaigns: [],
		activeCampaignId: null,
	});
});

describe("CA e iniciativa com os itens equipados fora da ficha", () => {
	it("a conta é a mesma da ficha: +5 na iniciativa e +2 na CA", () => {
		const summary = effectiveCombatSummary(
			lyra(),
			new Map([
				[RING.id, RING],
				[BROOCH.id, BROOCH],
			]),
		);
		expect(summary.initiative).toBe(7);
		expect(summary.armorClass).toBe(17);
	});

	it("sem os itens no mundo, fica o valor salvo na ficha", () => {
		const summary = effectiveCombatSummary(lyra(), new Map());
		expect(summary.initiative).toBe(2);
		expect(summary.armorClass).toBe(15);
	});

	it("card do personagem mostra CA 17 e iniciativa +7", () => {
		seed([lyra()]);
		render(<CharacterCard character={lyra()} />);
		const ac = screen.getByText("Defesa (CA)").parentElement as HTMLElement;
		const init = screen.getByText("Iniciativa").parentElement as HTMLElement;
		expect(within(ac).getByText("17")).toBeTruthy();
		expect(within(init).getByText("+7")).toBeTruthy();
	});

	it("card sem item que mexa no valor mostra o salvo", () => {
		seed([lyra()], []);
		render(<CharacterCard character={lyra()} />);
		const init = screen.getByText("Iniciativa").parentElement as HTMLElement;
		expect(within(init).getByText("+2")).toBeTruthy();
	});

	it("grupo do painel mostra CA 17 e Inic +7", () => {
		seed([lyra()]);
		render(<DashboardPartyRoster characters={[lyra()]} isViewer={false} />);
		expect(screen.getByText("17")).toBeTruthy();
		expect(screen.getByText("+7")).toBeTruthy();
	});

	it("matriz do grupo mostra CA 17 e iniciativa +7", () => {
		seed([lyra()]);
		render(<PartyStatsMatrix />);
		expect(screen.getByText("17")).toBeTruthy();
		expect(screen.getByText("+7")).toBeTruthy();
	});
});
