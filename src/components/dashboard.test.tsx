// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardActiveQuests } from "@/components/dashboard/dashboard-active-quests";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardKeyNpcs } from "@/components/dashboard/dashboard-key-npcs";
import { DashboardLatestSession } from "@/components/dashboard/dashboard-latest-session";
import { DashboardPartyRoster } from "@/components/dashboard/dashboard-party-roster";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { DashboardQuickNav } from "@/components/dashboard/dashboard-quick-nav";
import { DashboardQuickVault } from "@/components/dashboard/dashboard-quick-vault";
import type {
	Campaign,
	Character,
	Item,
	Npc,
	Quest,
	Session,
} from "@/lib/store/types";

// Mock matchMedia for jsdom environment
window.matchMedia =
	window.matchMedia ||
	(() => ({
		matches: false,
		media: "",
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));

// Mock @tanstack/react-router Link and components
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		className,
	}: {
		children: React.ReactNode;
		to: string;
		className?: string;
	}) => (
		<a href={to} className={className}>
			{children}
		</a>
	),
	createFileRoute: () => () => ({ component: () => null }),
}));

describe("Dashboard Components", () => {
	afterEach(() => {
		cleanup();
	});

	describe("DashboardHeader", () => {
		const mockCampaign: Campaign = {
			id: "camp-1",
			name: "Crônicas de Eldoria",
			description: "Uma campanha épica pelas terras antigas",
			ownerId: "user-1",
			worldId: "world-1",
			system: "dnd5e",
			myRole: "owner",
			createdAt: Date.now(),
		};

		const counts = {
			characters: 4,
			npcs: 12,
			sessions: 8,
			quests: 5,
			items: 20,
			locations: 7,
			lores: 15,
		};

		it("renders campaign title, system badge, and role", () => {
			render(
				<DashboardHeader
					activeCampaign={mockCampaign}
					campaignRole="owner"
					isViewer={false}
					counts={counts}
				/>,
			);

			expect(screen.getByText("Crônicas de Eldoria")).toBeDefined();
			expect(screen.getByText("Mestre da Mesa")).toBeDefined();
			expect(screen.getByText("D&D 5ª Edição (2014)")).toBeDefined();
			expect(screen.getByText("Registrar Sessão")).toBeDefined();
			expect(screen.getByText("Itens")).toBeDefined();
			expect(screen.queryByText("Inventário")).toBeNull();
		});

		it("renders viewer status with disabled action buttons", () => {
			render(
				<DashboardHeader
					activeCampaign={{ ...mockCampaign, myRole: "viewer" }}
					campaignRole="viewer"
					isViewer={true}
					counts={counts}
				/>,
			);

			expect(screen.getByText("Jogador (Visualizador)")).toBeDefined();
		});
	});

	describe("DashboardLatestSession", () => {
		const mockSession: Session = {
			id: "session-1",
			number: 5,
			title: "O Despertar do Dragão",
			date: "19/08/2026",
			inGameDate: "Ano 422 da 3ª Era",
			duration: "3h 30m",
			location: "Caverna Carmesim",
			attendees: "Arthur, Lyra, Thokk",
			npcsPresent: "Lord Malakor",
			locationsVisited: "Montanhas Cinzentas",
			summary: "O grupo finalmente confrontou a besta ancestral.",
			keyEvents: "",
			combatLog: "",
			loot: "",
			xpAwarded: "1500",
			cliffhanger: "A fenda começou a se fechar com Thokk preso do outro lado!",
			dmNotes: "",
			mood: "tenso",
			entityLinks: [],
			createdAt: Date.now(),
		};

		it("renders full session details including cliffhanger and tags", () => {
			render(
				<DashboardLatestSession
					lastSession={mockSession}
					sessionCount={5}
					isViewer={false}
				/>,
			);

			expect(screen.getByText("O Despertar do Dragão")).toBeDefined();
			expect(screen.getByText("Sessão #5")).toBeDefined();
			expect(
				screen.getByText("O grupo finalmente confrontou a besta ancestral."),
			).toBeDefined();
			expect(
				screen.getByText(
					"A fenda começou a se fechar com Thokk preso do outro lado!",
				),
			).toBeDefined();
			expect(screen.getByText("Montanhas Cinzentas")).toBeDefined();
			expect(screen.getByText("Lord Malakor")).toBeDefined();
		});

		it("renders empty state when no session exists", () => {
			render(
				<DashboardLatestSession
					lastSession={undefined}
					sessionCount={0}
					isViewer={false}
				/>,
			);

			expect(screen.getByText("Nenhuma sessão registrada")).toBeDefined();
			expect(screen.getByText("Registrar 1ª Sessão")).toBeDefined();
		});
	});

	describe("DashboardActiveQuests", () => {
		const mockQuests: Quest[] = [
			{
				id: "q-1",
				worldId: "w-1",
				publicationScope: "global",
				campaignIds: ["camp-1"],
				visibility: "public",
				createdAt: Date.now(),
				title: "Recuperar a Espada Solar",
				description: "Buscar a relíquia no templo em ruínas.",
				status: "active",
				category: "main",
				giverNpcName: "Mago Elidor",
				locationName: "Templo do Sol",
				reward: "500 PO e a bênção de Lathander",
			},
			{
				id: "q-2",
				worldId: "w-1",
				publicationScope: "global",
				campaignIds: ["camp-1"],
				visibility: "public",
				createdAt: Date.now(),
				title: "Limpar o Porão da Taverna",
				description: "Eliminar ratos gigantes.",
				status: "completed",
				category: "side",
			},
		];

		it("renders only active quests with badges, NPC, location and reward", () => {
			render(<DashboardActiveQuests quests={mockQuests} isViewer={false} />);

			expect(screen.getByText("Recuperar a Espada Solar")).toBeDefined();
			expect(screen.getByText("Principal")).toBeDefined();
			expect(screen.getByText("Contratante: Mago Elidor")).toBeDefined();
			expect(screen.getByText("Templo do Sol")).toBeDefined();
			expect(screen.getByText("500 PO e a bênção de Lathander")).toBeDefined();
			expect(screen.queryByText("Limpar o Porão da Taverna")).toBeNull();
			const nova = screen.getByRole("link", { name: "Nova Missão" });
			expect(nova.tagName).toBe("A");
			expect(nova.querySelector("button")).toBeNull();
			expect(nova.closest("button")).toBeNull();
			expect(nova.closest(".border-dashed")).toBeNull();
		});

		it("renders empty state when there are no active quests", () => {
			render(<DashboardActiveQuests quests={[]} isViewer={false} />);

			expect(screen.getByText("Nenhuma missão ativa")).toBeDefined();
			const nova = screen.getByRole("link", { name: "Nova Missão" });
			expect(nova.tagName).toBe("A");
			expect(nova.getAttribute("href")).toBe("/quests");
			expect(nova.querySelector("button")).toBeNull();
			expect(nova.closest(".border-dashed")).toBeNull();
			expect(nova.className).toContain("min-h-[44px]");
			expect(nova.className).toContain("sm:min-h-8");
		});

		it("hides Nova Missão for a player without reserving the slot", () => {
			render(<DashboardActiveQuests quests={[]} isViewer />);

			expect(screen.queryByText("Nova Missão")).toBeNull();
			expect(screen.getByText(/Ver todas/)).toBeDefined();
		});
	});

	describe("DashboardPartyRoster", () => {
		const mockCharacters: Character[] = [
			{
				id: "char-1",
				createdAt: Date.now(),
				system: "dnd5e",
				characterName: "Valeros",
				playerName: "Gabriel",
				race: "Humano",
				class: "Guerreiro",
				subclass: "Mestre de Batalha",
				background: "Soldado",
				alignment: "Neutro Bom",
				level: 5,
				xp: 6500,
				age: "28",
				height: "1.80m",
				weight: "85kg",
				eyes: "Castanhos",
				hair: "Preto",
				skin: "Morena",
				appearance: "Cicatriz no olho esquerdo",
				strength: 18,
				dexterity: 14,
				constitution: 16,
				intelligence: 10,
				wisdom: 12,
				charisma: 11,
				power: 10,
				size: 10,
				education: 10,
				sanity: 50,
				sanityMax: 50,
				health: 45,
				healthMax: 52,
				tempHealth: 0,
				armorClass: 18,
				initiative: 2,
				speed: 9,
				proficiencyBonus: 3,
				hitDice: "5d10",
				deathSaves: { successes: 0, failures: 0 },
				savingThrows: "",
				skills: "",
				languages: "Comum",
				proficiencies: "",
				spellcastingClass: "",
				spellAbility: "",
				spellSaveDc: 0,
				spellAttackBonus: 0,
				spells: "",
				spellSlots: "",
				equipment: "",
				currency: "",
				personalityTraits: "",
				ideals: "",
				bonds: "",
				flaws: "",
				notes: "",
				imageUrl: "",
				sheetLayout: { version: 1, template: "dnd5e", modules: [] },
				familyRelations: [],
				entityLinks: [],
			},
		];

		it("renders party members with HP, AC, Initiative and class info", () => {
			render(
				<DashboardPartyRoster characters={mockCharacters} isViewer={false} />,
			);

			expect(screen.getByText("Valeros")).toBeDefined();
			expect(screen.getByText("Guerreiro • Humano")).toBeDefined();
			expect(screen.getByText("Jogador: Gabriel")).toBeDefined();
			expect(screen.getByText("45 / 52")).toBeDefined();
			expect(screen.getByText("18")).toBeDefined(); // AC
		});

		it("renders empty state when character list is empty", () => {
			render(<DashboardPartyRoster characters={[]} isViewer={false} />);

			expect(screen.getByText("Nenhum personagem cadastrado")).toBeDefined();
		});
	});

	describe("DashboardKeyNpcs", () => {
		const mockNpcs: Npc[] = [
			{
				id: "npc-1",
				worldId: "w-1",
				publicationScope: "global",
				campaignIds: ["camp-1"],
				visibility: "public",
				createdAt: Date.now(),
				kind: "npc",
				name: "Lorde Vaelen",
				race: "Elfo Negro",
				role: "Comandante da Guarda Real",
				location: "Castelo de Pedra",
				faction: "Guarda Real",
				alignment: "Leal e Neutro",
				disposition: "hostile",
				importance: "boss",
				cr: "12",
				appearance: "Armadura negra ornada",
				mannerisms: "Olhar frio e calculista",
				motivations: "Restaurar a ordem antiga a qualquer custo.",
				secrets: "Possui uma dívida de sangue com o culto.",
				relationships: "",
				stats: "",
				description: "",
				imageUrl: "",
				isAlive: true,
				linkedCharacterId: "",
				entityLinks: [],
			},
		];

		it("renders key NPCs with importance, disposition, and motivation", () => {
			render(<DashboardKeyNpcs npcs={mockNpcs} isViewer={false} />);

			expect(screen.getByText("Lorde Vaelen")).toBeDefined();
			expect(screen.getByText("Ameaça Maior / Boss")).toBeDefined();
			expect(screen.getByText("Hostil")).toBeDefined();
			expect(screen.getByText("Castelo de Pedra")).toBeDefined();
			expect(
				screen.getByText('"Restaurar a ordem antiga a qualquer custo."'),
			).toBeDefined();
		});
	});

	describe("DashboardQuickVault", () => {
		const mockItems: Item[] = [
			{
				id: "item-1",
				worldId: "w-1",
				publicationScope: "global",
				campaignIds: ["camp-1"],
				visibility: "public",
				createdAt: Date.now(),
				name: "Lâmina da Vorpalidade",
				type: "Arma Mágica",
				rarity: "legendary",
				subtype: "Espada Longa",
				weight: "3 lbs",
				value: "50.000 PO",
				requiresAttunement: true,
				attunedTo: "Valeros",
				charges: "",
				source: "DMG",
				stats: "+3 no ataque e dano",
				properties: "Decapita em 20 natural",
				description: "Uma lâmina lendária forjada em fogo estelar.",
				owner: "Valeros",
				imageUrl: "",
				equipped: true,
				entityLinks: [],
			},
		];

		it("renders relevant items with rarity and attunement status", () => {
			render(<DashboardQuickVault items={mockItems} isViewer={false} />);

			expect(screen.getByText("Lâmina da Vorpalidade")).toBeDefined();
			expect(screen.getByText("legendary")).toBeDefined();
			expect(screen.getByText("Sintonizado: Valeros")).toBeDefined();
			expect(screen.getByText("Equipado")).toBeDefined();
		});
	});

	describe("DashboardQuickActions", () => {
		const mockCampaign: Campaign = {
			id: "camp-1",
			name: "Crônicas de Eldoria",
			description: "",
			ownerId: "user-1",
			worldId: "world-1",
			myRole: "owner",
			createdAt: Date.now(),
		};

		it("renders quick actions: VTT, Party Loot, New Sheet, and Invite", () => {
			render(
				<DashboardQuickActions
					activeCampaign={mockCampaign}
					campaignRole="owner"
					isViewer={false}
					onInviteClick={vi.fn()}
				/>,
			);

			expect(screen.getByText("Ações da Mesa")).toBeDefined();
			expect(screen.getByText("Mesa Virtual (VTT)")).toBeDefined();
			expect(screen.getByText("Mochila do Grupo")).toBeDefined();
			// Mochila ainda não é salva: sem contagem, só "Abrir"
			expect(
				screen.getByRole("button", { name: /Mochila do Grupo/ }).textContent,
			).toContain("Abrir");
			expect(screen.queryByText(/^\d+\s*itens?$/)).toBeNull();
			expect(screen.getByText("Nova Ficha de Jogador")).toBeDefined();
			expect(screen.getByText("Convidar Jogadores")).toBeDefined();
		});
	});

	describe("DashboardQuickNav", () => {
		it("renders navigation grid with entity counts", () => {
			const counts = {
				characters: 3,
				npcs: 10,
				sessions: 4,
				quests: 2,
				items: 15,
				locations: 5,
				lores: 8,
				factions: 2,
			};

			render(<DashboardQuickNav counts={counts} />);

			expect(screen.getByText("Personagens")).toBeDefined();
			expect(screen.getByText("NPCs & Criaturas")).toBeDefined();
			expect(screen.getByText("Sessões & Diários")).toBeDefined();
			expect(screen.getByText("Missões & Objetivos")).toBeDefined();
		});
	});
});
