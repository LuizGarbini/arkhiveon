// @vitest-environment jsdom

import type { User } from "@supabase/supabase-js";
import {
	cleanup,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CampaignSwitcher } from "@/components/campaign-switcher";
import { ToastProvider } from "@/components/ui/toast";
import { useRPGStore } from "@/lib/store";
import type {
	Campaign,
	GameLocation,
	Item,
	Npc,
	RPGState,
	World,
} from "@/lib/store/types";
import { Route as DashboardRoute } from "@/routes/dashboard";

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

const ME = "user-me";
const OTHER = "user-other";

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({ user: { id: "user-me" } as unknown as User }),
}));

vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		...props
	}: {
		children?: ReactNode;
		to: string;
		className?: string;
		"aria-label"?: string;
	}) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
	useNavigate: () => vi.fn(),
	createFileRoute: () => (options: { component: () => ReactNode }) => ({
		options,
	}),
}));

vi.mock("@/components/dashboard-hero-background", () => ({
	DashboardHeroBackground: () => null,
}));
vi.mock("@/components/discord-dither-banner", () => ({
	DiscordDitherBanner: () => null,
}));
vi.mock("@/components/invite-banner", () => ({ InviteBanner: () => null }));
vi.mock("@/components/activity-feed", () => ({
	ActivityFeed: ({ isLoading }: { isLoading?: boolean }) => (
		<div
			data-testid="activity-feed"
			data-loading={String(Boolean(isLoading))}
		/>
	),
}));
vi.mock("@/components/campaign-form", () => ({ CampaignForm: () => null }));
vi.mock("@/components/world-form", () => ({ WorldForm: () => null }));

const campaign: Campaign = {
	id: "camp-qa",
	name: "QA Designer (teste)",
	description: "",
	ownerId: ME,
	worldId: "world-shared",
	myRole: "owner",
	createdAt: 1,
};

function location(
	id: string,
	overrides: Partial<GameLocation> = {},
): GameLocation {
	return {
		id,
		name: id,
		type: "",
		region: "",
		description: "",
		worldId: "world-shared",
		campaignIds: [],
		visibility: "public",
		publicationScope: "global",
		createdAt: 1,
		...overrides,
	} as GameLocation;
}

const Dashboard = (
	DashboardRoute as unknown as { options: { component: () => ReactNode } }
).options.component;

function setDashboardState(partial: Partial<RPGState>) {
	useRPGStore.setState({
		campaigns: [campaign],
		activeCampaignId: campaign.id,
		activeWorldId: campaign.worldId,
		hasLoadedCampaigns: true,
		campaignLoadStatus: "ready",
		isLoadingRemote: false,
		remoteLoadError: null,
		remoteLoadedCampaignId: campaign.id,
		characters: [],
		npcs: [],
		sessions: [],
		items: [],
		locations: [],
		lores: [],
		quests: [],
		factions: [],
		partyLoot: [],
		loadInvites: vi.fn().mockResolvedValue(undefined),
	});
	useRPGStore.setState(partial);
}

function quickNavCount(title: string): HTMLElement {
	const card = screen.getByRole("link", {
		name: `Abrir ${title}`,
	}).parentElement;
	if (!card) throw new Error(`card ${title} não encontrado`);
	return card;
}

describe("Painel: estados dos números", () => {
	afterEach(cleanup);

	it("carregando: skeleton no lugar do número, sem 0 e sem spinner", () => {
		setDashboardState({ isLoadingRemote: true });
		render(<Dashboard />);
		const link = quickNavCount("Locais & Mapas");
		expect(
			within(link).getByRole("status", { name: "Carregando locais & mapas" }),
		).toBeTruthy();
		expect(within(link).queryByText("0")).toBeNull();
		expect(
			screen.getAllByRole("status", { name: "Carregando personagens" }).length,
		).toBeGreaterThan(0);
		expect(document.querySelector(".animate-spin")).toBeNull();
	});

	it("vazio: mostra 0 real quando a carga terminou sem registros", () => {
		setDashboardState({});
		render(<Dashboard />);
		expect(within(quickNavCount("Locais & Mapas")).getByText("0")).toBeTruthy();
		expect(screen.queryAllByRole("status")).toHaveLength(0);
	});

	it("erro: mostra — num botão que abre o Popover do DS por clique, sem navegar", async () => {
		setDashboardState({ remoteLoadError: "falhou" });
		render(<Dashboard />);
		expect(document.querySelector("[title]")).toBeNull();
		const buttons = screen.getAllByRole("button", {
			name: /Não foi possível carregar/,
		});
		// 4 números do topo + 8 do Grimório
		expect(buttons.length).toBe(12);
		// o primeiro é o número do topo (o segundo é o do Grimório)
		const [personagens] = screen.getAllByRole("button", {
			name: "personagens: Não foi possível carregar. Ver detalhes",
		});
		expect(personagens.className).toContain("min-h-[44px]");
		expect(personagens.className).toContain("min-w-[44px]");
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		personagens.dispatchEvent(click);
		expect(click.defaultPrevented).toBe(true);
		await waitFor(() =>
			expect(
				screen.getByText(
					"Os personagens não carregaram. Recarregue a página para tentar de novo.",
				),
			).toBeTruthy(),
		);
	});

	it("cards de NPCs e itens contam só a campanha ativa (mesmo filtro do topo)", () => {
		const scoped = (id: string) => [
			location(`${id}-global`),
			location(`${id}-outra`, {
				publicationScope: "restricted",
				campaignIds: ["camp-outra"],
			}),
			location(`${id}-outra-2`, {
				publicationScope: "restricted",
				campaignIds: ["camp-outra"],
			}),
		];
		setDashboardState({
			npcs: scoped("npc") as unknown as Npc[],
			items: scoped("item") as unknown as Item[],
		});
		render(<Dashboard />);
		expect(screen.getByText("1 Registrado")).toBeTruthy();
		expect(screen.getByText("Ver todos (1)")).toBeTruthy();
		expect(screen.queryByText("npc-outra")).toBeNull();
		expect(screen.queryByText("item-outra")).toBeNull();
	});

	it("'Ver todas (N)' dos cards fica numa linha só", () => {
		setDashboardState({});
		render(<Dashboard />);
		const links = screen.getAllByText(/^Ver tod(a|o)s/);
		expect(links.length).toBeGreaterThanOrEqual(5);
		for (const link of links) {
			const anchor = link.closest("a") ?? link;
			expect(anchor.className).toContain("whitespace-nowrap");
			expect(anchor.className).toContain("shrink-0");
		}
		for (const pill of [/Herói/, /Ativa/, /Registrado/]) {
			expect(screen.getByText(pill).className).toContain("whitespace-nowrap");
		}
	});

	it("erro: botão e link do card são irmãos (nenhum botão dentro de <a>)", () => {
		setDashboardState({ remoteLoadError: "falhou" });
		render(<Dashboard />);
		const countButtons = screen.getAllByRole("button", {
			name: /Ver detalhes/,
		});
		expect(countButtons).toHaveLength(12);
		for (const button of countButtons) expect(button.closest("a")).toBeNull();
		for (const title of ["Personagens", "Sessões", "Missões", "Inventário"]) {
			const [link] = screen.getAllByRole("link", { name: `Abrir ${title}` });
			const card = link.parentElement;
			expect(card?.querySelector("button")).toBeTruthy();
			expect(link.className).toContain("absolute inset-0");
		}
		const nav = quickNavCount("Sessões & Diários");
		expect(nav.querySelector(":scope > a")).toBeTruthy();
		expect(nav.querySelector("button")?.className).toContain("min-h-[44px]");
	});

	it("rótulos do Grimório quebram em até 2 linhas em vez de cortar", () => {
		setDashboardState({});
		render(<Dashboard />);
		const label = screen.getByText("Sessões & Diários");
		expect(label.className).toContain("line-clamp-2");
		expect(label.className).not.toContain("truncate");
	});

	it("conta só o que a lista mostra (mesmo filtro de visibilidade)", () => {
		setDashboardState({
			locations: [
				location("global"),
				location("restrita-a-outra", {
					publicationScope: "restricted",
					campaignIds: ["camp-outra"],
				}),
				location("restrita-a-esta", {
					publicationScope: "restricted",
					campaignIds: [campaign.id],
				}),
			],
		});
		render(<Dashboard />);
		expect(within(quickNavCount("Locais & Mapas")).getByText("2")).toBeTruthy();
	});
});

describe("Seletor de mundo: compartilhado x próprio", () => {
	const ownWorld: World = {
		id: "world-own",
		name: "Toril",
		isDefault: false,
		ownerUserId: ME,
		createdAt: 1,
	};
	const sharedWorld: World = {
		id: "world-shared",
		name: "faerun",
		isDefault: false,
		ownerUserId: OTHER,
		createdAt: 1,
	};

	beforeEach(() => {
		useRPGStore.setState({
			worlds: [ownWorld, sharedWorld],
			campaigns: [
				campaign,
				{ ...campaign, id: "camp-own", worldId: ownWorld.id, name: "Avernus" },
			],
			pendingInvites: [],
		});
	});
	afterEach(cleanup);

	it("mundo de outra pessoa aparece como compartilhado no gatilho", () => {
		useRPGStore.setState({
			activeCampaignId: campaign.id,
			activeWorldId: sharedWorld.id,
		});
		render(
			<ToastProvider>
				<CampaignSwitcher isCollapsed={false} />
			</ToastProvider>,
		);
		expect(screen.getByText("faerun")).toBeTruthy();
		expect(screen.getByText("Mundo compartilhado")).toBeTruthy();
	});

	it("mundo próprio não ganha o aviso", () => {
		useRPGStore.setState({
			activeCampaignId: "camp-own",
			activeWorldId: ownWorld.id,
		});
		render(
			<ToastProvider>
				<CampaignSwitcher isCollapsed={false} />
			</ToastProvider>,
		);
		expect(screen.getByText("Toril")).toBeTruthy();
		expect(screen.queryByText(/Mundo compartilhado/)).toBeNull();
	});

	it("após reload sem mundos ainda: skeleton, não 'Selecione um Mundo'", () => {
		useRPGStore.setState({
			worlds: [],
			activeCampaignId: campaign.id,
			activeWorldId: null,
			hasLoadedCampaigns: true,
			isLoadingRemote: false,
			remoteLoadError: null,
			remoteLoadedCampaignId: null,
		});
		const { unmount } = render(
			<ToastProvider>
				<CampaignSwitcher isCollapsed={false} />
			</ToastProvider>,
		);
		expect(
			screen.getByRole("status", { name: "Carregando mundo" }),
		).toBeTruthy();
		expect(screen.queryByText("Selecione um Mundo")).toBeNull();
		unmount();

		useRPGStore.setState({ remoteLoadedCampaignId: campaign.id });
		render(
			<ToastProvider>
				<CampaignSwitcher isCollapsed={false} />
			</ToastProvider>,
		);
		expect(screen.getByText("Selecione um Mundo")).toBeTruthy();
	});
});

describe("Painel após reload: nada de vazio/CTA/0 antes dos dados", () => {
	afterEach(cleanup);

	// Reload: campanhas já vieram, mas a carga da mesa nem começou
	// (isLoadingRemote ainda false). Antes disso virava estado vazio.
	const beforeMesaData = { remoteLoadedCampaignId: null };

	const sections = [
		{
			name: "Sessões",
			empty: "Nenhuma sessão registrada",
			cta: "Registrar 1ª Sessão",
		},
		{ name: "Missões", empty: "Nenhuma missão ativa", cta: "Nova Missão" },
		{
			name: "Grupo",
			empty: "Nenhum personagem cadastrado",
			cta: "Criar Primeira Ficha",
		},
		{ name: "NPCs", empty: "Nenhum NPC registrado", cta: "Criar NPC" },
		{ name: "Itens", empty: "Nenhum item cadastrado", cta: null },
	];

	for (const section of sections) {
		it(`${section.name}: skeleton enquanto carrega, vazio só depois`, () => {
			setDashboardState(beforeMesaData);
			const { unmount } = render(<Dashboard />);
			expect(screen.queryByText(section.empty)).toBeNull();
			if (section.cta) expect(screen.queryByText(section.cta)).toBeNull();
			unmount();

			setDashboardState({});
			render(<Dashboard />);
			expect(screen.getByText(section.empty)).toBeTruthy();
			if (section.cta) expect(screen.getByText(section.cta)).toBeTruthy();
		});
	}

	it("Mochila: sem '0 itens' enquanto carrega", () => {
		setDashboardState(beforeMesaData);
		const { unmount } = render(<Dashboard />);
		expect(screen.queryByText(/^0\s*itens$/)).toBeNull();
		unmount();
		setDashboardState({});
		render(<Dashboard />);
		expect(screen.getByText(/^0\s*itens$/)).toBeTruthy();
	});

	it("Timeline: recebe isLoading enquanto carrega", () => {
		setDashboardState(beforeMesaData);
		const { unmount } = render(<Dashboard />);
		expect(screen.getByTestId("activity-feed").dataset.loading).toBe("true");
		unmount();
		setDashboardState({});
		render(<Dashboard />);
		expect(screen.getByTestId("activity-feed").dataset.loading).toBe("false");
	});

	it("Grimório e topo: skeleton no lugar de 0 enquanto carrega", () => {
		setDashboardState(beforeMesaData);
		render(<Dashboard />);
		expect(screen.getAllByRole("status", { name: /^Carregando/ }).length).toBe(
			12,
		);
		expect(within(quickNavCount("Locais & Mapas")).queryByText("0")).toBeNull();
	});

	it("erro não é carregamento: mostra '—', sem skeleton", () => {
		setDashboardState({ ...beforeMesaData, remoteLoadError: "falhou" });
		render(<Dashboard />);
		expect(
			screen.queryAllByRole("status", { name: /^Carregando/ }),
		).toHaveLength(0);
		expect(
			screen.getAllByRole("button", { name: /Ver detalhes/ }),
		).toHaveLength(12);
	});
});
