// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Character, Item, Npc } from "@/lib/store/types";

const linkClick = vi.fn();
const parentClick = vi.fn();
const resolveItem = vi.fn<(item: Item) => string>();
const storeState: { characters: Character[] } = { characters: [] };

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		className,
	}: {
		children?: ReactNode;
		className?: string;
	}) => (
		// biome-ignore lint/a11y/useValidAnchor: stub do Link do router
		<a
			href="#link"
			className={className}
			onClick={(event) => {
				event.preventDefault();
				linkClick();
			}}
		>
			{children}
		</a>
	),
}));

vi.mock("@/components/party-loot-dialog", () => ({
	PartyLootDialog: () => null,
}));

vi.mock("@/lib/character-images", () => ({
	resolveItemImageUrl: (item: Item) => resolveItem(item),
}));

vi.mock("@/lib/store", () => ({
	useRPGStore: (selector: (s: typeof storeState) => unknown) =>
		selector(storeState),
	useActiveCampaignRole: () => "player",
	useImageAssetLookup: () => new Map(),
}));

import { PartyStatsMatrix } from "../party-stats-matrix";
import { DashboardKeyNpcs } from "./dashboard-key-npcs";
import { DashboardPartyRoster } from "./dashboard-party-roster";
import { DashboardQuickVault } from "./dashboard-quick-vault";

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	storeState.characters = [];
});

const character = (over: Partial<Character>): Character =>
	({
		id: "c1",
		characterName: "Lyra",
		playerName: "Ana",
		race: "Elfa",
		class: "Maga",
		level: 3,
		health: 10,
		healthMax: 20,
		armorClass: 12,
		initiative: 2,
		speed: 9,
		imageUrl: "https://img.test/lyra.png",
		...over,
	}) as Character;

const npc = (over: Partial<Npc>): Npc =>
	({
		id: "n1",
		name: "Borin",
		race: "Anão",
		role: "Ferreiro",
		importance: "major",
		isAlive: true,
		disposition: "friendly",
		imageUrl: "https://img.test/borin.png",
		...over,
	}) as Npc;

const item = (over: Partial<Item>): Item =>
	({
		id: "i1",
		name: "Espada Solar",
		rarity: "legendary",
		imageUrl: "https://img.test/espada.png",
		...over,
	}) as Item;

async function openAndClose(label: string, title: string, src?: string) {
	const trigger = screen.getByRole("button", { name: label });
	expect(trigger.className).toContain("cursor-zoom-in");
	expect(trigger.className).toContain("focus-visible:ring-2");
	expect(trigger.getAttribute("title")).toBeNull();
	await act(async () => {
		fireEvent.click(trigger);
	});
	expect(await screen.findByRole("dialog")).toBeTruthy();
	expect(screen.getAllByText(title).length).toBeGreaterThan(0);
	if (src) {
		expect(
			screen.getByRole("dialog").querySelector(`img[src="${src}"]`),
		).toBeTruthy();
	}
	expect(linkClick).not.toHaveBeenCalled();
	expect(parentClick).not.toHaveBeenCalled();
	await act(async () => {
		fireEvent.keyDown(document.activeElement ?? document.body, {
			key: "Escape",
		});
	});
	await vi.waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
}

describe("tela cheia no painel da campanha (1c-2)", () => {
	it("NPCs-chave: avatar abre a imagem, não navega nem propaga, Esc devolve o foco", async () => {
		render(
			// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: simula um card que abre a ficha no clique
			<div onClick={parentClick}>
				<DashboardKeyNpcs npcs={[npc({})]} isViewer={false} />
			</div>,
		);
		await openAndClose("Ver em tela cheia: Borin", "Borin");
		fireEvent.click(screen.getByText("Borin"));
		expect(linkClick).toHaveBeenCalledTimes(1);
	});

	it("NPC só com iniciais não tem gatilho nem cursor de zoom", () => {
		const { container } = render(
			<DashboardKeyNpcs npcs={[npc({ imageUrl: "" })]} isViewer={false} />,
		);
		expect(screen.queryByRole("button", { name: /tela cheia/ })).toBeNull();
		expect(container.querySelector(".cursor-zoom-in")).toBeNull();
	});

	it("Grupo: avatar do personagem abre a imagem", async () => {
		render(
			// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: simula um card que abre a ficha no clique
			<div onClick={parentClick}>
				<DashboardPartyRoster characters={[character({})]} isViewer={false} />
			</div>,
		);
		await openAndClose("Ver em tela cheia: Lyra", "Lyra");
	});

	it("Cofre rápido: usa a URL resolvida; item privado sem URL não tem gatilho", async () => {
		resolveItem.mockImplementation((i) =>
			i.id === "i2" ? "" : "https://img.test/resolvida.png",
		);
		render(
			<DashboardQuickVault
				items={[item({}), item({ id: "i2", name: "Anel Oculto" })]}
				isViewer={false}
			/>,
		);
		expect(
			screen.queryByRole("button", { name: "Ver em tela cheia: Anel Oculto" }),
		).toBeNull();
		await openAndClose(
			"Ver em tela cheia: Espada Solar",
			"Espada Solar",
			"https://img.test/resolvida.png",
		);
	});

	it("Matriz do grupo: avatar abre; sem imagem não abre", async () => {
		storeState.characters = [
			character({}),
			character({ id: "c2", characterName: "Thorn", imageUrl: "" }),
		];
		render(<PartyStatsMatrix />);
		expect(
			screen.queryByRole("button", { name: "Ver em tela cheia: Thorn" }),
		).toBeNull();
		await openAndClose("Ver em tela cheia: Lyra", "Lyra");
	});
});
