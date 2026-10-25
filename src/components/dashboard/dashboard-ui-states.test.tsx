// @vitest-environment jsdom

import type { User } from "@supabase/supabase-js";
import {
	act,
	cleanup,
	fireEvent,
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
	ActivityFeed: ({
		isLoading,
		isUnavailable,
	}: {
		isLoading?: boolean;
		isUnavailable?: boolean;
	}) => (
		<div
			data-testid="activity-feed"
			data-loading={String(Boolean(isLoading))}
			data-unavailable={String(Boolean(isUnavailable))}
		/>
	),
}));
const remote = vi.hoisted(() => ({
	loadRemoteState: vi.fn(),
	fetchGlobalTotalCount: vi.fn(),
}));
vi.mock("@/lib/remote-store", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/remote-store")>()),
	loadRemoteState: remote.loadRemoteState,
	fetchGlobalTotalCount: remote.fetchGlobalTotalCount,
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
		baseLoadError: null,
		isBaseLoadSlow: false,
		isRetryingBase: false,
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
	// O topo e o Grimório podem ter o mesmo nome ("Abrir Itens"); o do
	// Grimório vem depois no DOM.
	const card = screen
		.getAllByRole("link", { name: `Abrir ${title}` })
		.at(-1)?.parentElement;
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
		for (const title of ["Personagens", "Sessões", "Missões", "Itens"]) {
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

	it("Missões: lista ou vazio na hora, sem skeleton, com Nova Missão fixa no título", () => {
		setDashboardState(beforeMesaData);
		const loading = render(<Dashboard />);
		const quests = document.querySelector(
			'[data-dash-section="active-quests"]',
		);
		if (!quests) throw new Error("seção de missões não encontrada");
		expect(quests.querySelector("[data-dashboard-skeleton]")).toBeNull();
		expect(screen.getByText("Nenhuma missão ativa")).toBeTruthy();
		const nova = screen.getByRole("link", { name: "Nova Missão" });
		expect(nova.tagName).toBe("A");
		expect(nova.querySelector("button")).toBeNull();
		expect(nova.closest("button")).toBeNull();
		expect(nova.className).toContain("min-h-[44px]");
		expect(nova.className).toContain("sm:min-h-8");
		expect(nova.closest(".border-dashed")).toBeNull();
		expect(
			within(quests.firstElementChild as HTMLElement).getByText(/Ver todas/),
		).toBeTruthy();
		loading.unmount();

		setDashboardState({});
		render(<Dashboard />);
		const after = screen.getByRole("link", { name: "Nova Missão" });
		const loaded = document.querySelector(
			'[data-dash-section="active-quests"]',
		);
		if (!loaded?.firstElementChild) throw new Error("cabeçalho não encontrado");
		expect(after.closest(".border-dashed")).toBeNull();
		expect(
			within(loaded.firstElementChild as HTMLElement).getByText(/Ver todas/),
		).toBeTruthy();
		expect(loaded.querySelector("[data-dashboard-skeleton]")).toBeNull();
	});

	it("Missões em memória aparecem enquanto o resto do painel carrega", () => {
		setDashboardState({
			...beforeMesaData,
			isLoadingRemote: true,
			quests: [
				{
					id: "q-mem",
					worldId: "world-shared",
					publicationScope: "restricted",
					campaignIds: [campaign.id],
					visibility: "public",
					createdAt: 1,
					title: "Selo na memória",
					description: "",
					status: "active",
					category: "main",
				},
			],
		});
		render(<Dashboard />);
		expect(screen.getByText("Selo na memória")).toBeTruthy();
		expect(screen.queryByText("Nenhuma missão ativa")).toBeNull();
		expect(
			document.querySelector(
				'[data-dash-section="active-quests"] [data-dashboard-skeleton]',
			),
		).toBeNull();
	});

	it("jogador não vê Nova Missão e o título não reserva o espaço", () => {
		setDashboardState({
			campaigns: [{ ...campaign, myRole: "viewer" }],
		});
		render(<Dashboard />);
		const quests = document.querySelector(
			'[data-dash-section="active-quests"]',
		);
		if (!(quests instanceof HTMLElement)) {
			throw new Error("seção de missões não encontrada");
		}
		expect(
			within(quests).queryByRole("link", { name: "Nova Missão" }),
		).toBeNull();
		expect(within(quests).queryByText("Nova Missão")).toBeNull();
		expect(within(quests).getByText(/Ver todas/)).toBeTruthy();
		expect(quests.querySelector("[data-dashboard-skeleton]")).toBeNull();
	});

	it("Mochila usa o mesmo selo 'Abrir' da Mesa Virtual (sem mono âmbar)", () => {
		setDashboardState({});
		const { container } = render(<Dashboard />);
		const pills = container.querySelectorAll('[data-slot="open-pill"]');
		expect(pills).toHaveLength(2);
		expect(pills[0].className).toBe(pills[1].className);
		expect(pills[1].className).not.toContain("font-mono");
		expect(pills[1].className).not.toContain("amber");
	});

	it("Mochila: nunca mostra contagem (carregando, vazio ou com saque), só 'Abrir'", () => {
		setDashboardState(beforeMesaData);
		const { unmount } = render(<Dashboard />);
		expect(screen.queryByText(/^\d+\s*itens?$/)).toBeNull();
		unmount();
		setDashboardState({
			partyLoot: [
				{ id: "l1", name: "Ouro", isClaimed: false, createdAt: 1 },
			] as RPGState["partyLoot"],
		});
		render(<Dashboard />);
		expect(screen.queryByText(/^\d+\s*itens?$/)).toBeNull();
		expect(
			screen.getByRole("button", { name: /Mochila do Grupo/ }).textContent,
		).toContain("Abrir");
	});

	it("Itens: topo e Grimório dizem 'Itens' e contam só os itens visíveis", () => {
		const item = (id: string, extra: Partial<Item> = {}) =>
			({
				id,
				name: id,
				worldId: "world-shared",
				campaignIds: [],
				visibility: "public",
				publicationScope: "global",
				createdAt: 1,
				...extra,
			}) as Item;
		setDashboardState({
			items: [
				item("a"),
				item("b"),
				item("c", { publicationScope: "restricted", campaignIds: ["camp-x"] }),
				item("d", { worldId: "outro-mundo" }),
			],
		});
		render(<Dashboard />);
		expect(screen.queryByText("Inventário")).toBeNull();
		expect(screen.queryByText("Itens & Inventário")).toBeNull();
		expect(
			screen.getAllByRole("link", { name: "Abrir Itens" }).length,
		).toBeGreaterThan(0);
		expect(screen.queryByText("Itens & Saques")).toBeNull();
		expect(within(quickNavCount("Itens")).getByText("2")).toBeTruthy();
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
		// 4 números do topo + 8 do Grimório (o selo de papel é à parte)
		expect(
			screen
				.getAllByRole("status", { name: /^Carregando/ })
				.filter(
					(el) => el.getAttribute("aria-label") !== "Carregando papel na mesa",
				),
		).toHaveLength(12);
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

describe("Painel com falha na carga", () => {
	afterEach(cleanup);

	const failed = { remoteLoadedCampaignId: null, remoteLoadError: "falhou" };

	const sections = [
		{
			title: "Última Sessão & Crônica",
			empty: "Nenhuma sessão registrada",
			cta: "Registrar 1ª Sessão",
		},
		{
			title: "Missões em Andamento",
			empty: "Nenhuma missão ativa",
			cta: "Nova Missão",
		},
		{
			title: "Grupo de Aventureiros",
			empty: "Nenhum personagem cadastrado",
			cta: "Criar Primeira Ficha",
		},
		{
			title: "NPCs Importantes & Ameaças",
			empty: "Nenhum NPC registrado",
			cta: "Criar NPC",
		},
		{
			title: "Itens & Tesouros Relevantes",
			empty: "Nenhum item cadastrado",
			cta: null,
		},
	];

	it("conexão lenta: mantém o carregamento, uma linha, sem Indisponível", () => {
		setDashboardState({
			remoteLoadedCampaignId: null,
			isLoadingRemote: true,
			isBaseLoadSlow: true,
		});
		render(<Dashboard />);
		const line = screen.getByText("Conexão lenta, ainda carregando…");
		expect(
			screen.getAllByText("Conexão lenta, ainda carregando…"),
		).toHaveLength(1);
		expect(line.getAttribute("role")).toBe("status");
		expect(line.getAttribute("aria-live")).toBe("polite");
		expect(screen.getAllByRole("status")).toContain(line);
		expect(line.className).not.toContain("absolute");
		expect(line.className).toContain("text-muted-foreground");
		expect(line.className).not.toMatch(/animate|pulse/);
		expect(line.querySelector("svg")).toBeNull();
		const hero = document.querySelector('[data-dash-section="hero"]');
		const band = hero?.querySelector("[data-dash-status-band]");
		expect(band?.contains(line)).toBe(true);
		expect(band?.className).toContain("min-h-");
		expect(screen.queryByRole("alert")).toBeNull();
		expect(screen.queryByText(/Indisponível/)).toBeNull();
		expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
		expect(screen.getByRole("link", { name: "Nova Missão" })).toBeTruthy();
	});

	it("aviso de erro cabe no celular: texto quebra e o botão não some", () => {
		setDashboardState(failed);
		render(<Dashboard />);
		const alert = screen.getByRole("alert", {
			name: "Falha ao carregar a mesa",
		});
		expect(alert.className).toContain("min-w-0");
		expect(alert.className).toContain("w-full");
		expect(alert.className).toContain("flex-col");
		expect(alert.className).not.toContain("absolute");
		expect(alert.className).not.toContain("truncate");
		expect(alert.className).not.toContain("overflow-hidden");
		expect(alert.className).not.toContain("whitespace-nowrap");
		const title = screen.getByText(
			"Não foi possível carregar os dados da mesa",
		);
		expect(title.className).toContain("break-words");
		expect(title.className).not.toContain("truncate");
		const detail = screen.getByText(/Confira sua conexão/);
		expect(detail.className).toContain("break-words");
		const button = screen.getByRole("button", { name: "Tentar de novo" });
		expect(alert.contains(button)).toBe(true);
		expect(button.className).not.toContain("hidden");
		expect(button.className).toContain("min-h-[44px]");
	});

	it("falha global: UM aviso na faixa do hero, com um único 'Tentar de novo'", () => {
		setDashboardState(failed);
		render(<Dashboard />);
		const alerts = screen.getAllByRole("alert");
		expect(alerts).toHaveLength(1);
		expect(alerts[0].textContent).toContain(
			"Não foi possível carregar os dados da mesa",
		);
		const hero = document.querySelector('[data-dash-section="hero"]');
		expect(hero?.contains(alerts[0])).toBe(true);
		expect(alerts[0].closest("[data-dash-status-band]")).toBeTruthy();
		expect(
			screen.getAllByRole("button", { name: "Tentar de novo" }),
		).toHaveLength(1);
		// Papel ainda desconhecido: o botão fica, desativado, no mesmo lugar.
		const session = screen.getByRole("button", { name: "Registrar Sessão" });
		expect(session.hasAttribute("disabled")).toBe(true);
	});

	for (const section of sections) {
		it(`${section.title}: erro x vazio x carregando`, () => {
			// erro: neutro, sem vazio e sem CTA
			setDashboardState(failed);
			const first = render(<Dashboard />);
			expect(
				screen.getByRole("region", { name: `${section.title}: indisponível` }),
			).toBeTruthy();
			expect(screen.queryByText(section.empty)).toBeNull();
			if (section.cta) expect(screen.queryByText(section.cta)).toBeNull();
			first.unmount();

			// carregando: skeleton, sem aviso e sem neutro
			setDashboardState({ remoteLoadedCampaignId: null });
			const second = render(<Dashboard />);
			expect(screen.queryByRole("alert")).toBeNull();
			expect(
				screen.queryByRole("region", {
					name: `${section.title}: indisponível`,
				}),
			).toBeNull();
			// Missões não dependem da carga remota: vazio e o botão já estão no título.
			if (section.title === "Missões em Andamento") {
				expect(screen.getByText(section.empty)).toBeTruthy();
				if (section.cta) expect(screen.getByText(section.cta)).toBeTruthy();
			} else {
				expect(screen.queryByText(section.empty)).toBeNull();
			}
			second.unmount();

			// vazio de verdade: texto e CTA
			setDashboardState({});
			render(<Dashboard />);
			expect(screen.queryByRole("alert")).toBeNull();
			expect(screen.getByText(section.empty)).toBeTruthy();
			if (section.cta) expect(screen.getByText(section.cta)).toBeTruthy();
		});
	}

	it("Ações da Mesa: neutro no erro, sem '0 itens' e sem 'Criar'", () => {
		setDashboardState(failed);
		render(<Dashboard />);
		expect(
			screen.getByRole("region", { name: "Ações da Mesa: indisponível" }),
		).toBeTruthy();
		expect(screen.queryByText(/^0\s*itens$/)).toBeNull();
	});

	it("Timeline: recebe o estado neutro no erro, não o de carregando", () => {
		setDashboardState(failed);
		render(<Dashboard />);
		const feed = screen.getByTestId("activity-feed");
		expect(feed.dataset.unavailable).toBe("true");
		expect(feed.dataset.loading).toBe("false");
	});

	it("botão de nova tentativa: nativo, focável e com 44px no celular", () => {
		setDashboardState(failed);
		render(<Dashboard />);
		const button = screen.getByRole("button", { name: "Tentar de novo" });
		expect(button.tagName).toBe("BUTTON");
		expect(button.getAttribute("type")).toBe("button");
		expect(button.hasAttribute("disabled")).toBe(false);
		expect(button.className).toContain("min-h-[44px]");
		button.focus();
		expect(document.activeElement).toBe(button);
	});

	it("'Tentar de novo' chama a carga e volta ao skeleton (sem spinner)", async () => {
		let resolve: (value: unknown) => void = () => {};
		remote.loadRemoteState.mockReturnValue(
			new Promise((r) => {
				resolve = r;
			}),
		);
		remote.fetchGlobalTotalCount.mockResolvedValue(0);
		setDashboardState(failed);
		render(<Dashboard />);

		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		});

		expect(remote.loadRemoteState).toHaveBeenCalledWith(campaign.id);
		expect(screen.queryByRole("alert")).toBeNull();
		expect(screen.getByText("Nenhuma missão ativa")).toBeTruthy();
		expect(screen.getByRole("link", { name: "Nova Missão" })).toBeTruthy();
		expect(
			screen.getAllByRole("status", { name: /^Carregando/ }).length,
		).toBeGreaterThan(0);
		expect(document.querySelector(".animate-spin")).toBeNull();
		expect(screen.getByTestId("activity-feed").dataset.loading).toBe("true");

		await act(async () => {
			resolve({
				characters: [],
				npcs: [],
				sessions: [],
				items: [],
				locations: [],
				lores: [],
				customTemplates: [],
				imageAssets: [],
				activityLog: [],
				factions: [],
				factionReputations: [],
				worldNews: [],
			});
		});
		await waitFor(() =>
			expect(screen.getByText("Nenhuma missão ativa")).toBeTruthy(),
		);
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("nova tentativa que falha de novo volta ao aviso único", async () => {
		remote.loadRemoteState.mockRejectedValue(new Error("offline"));
		remote.fetchGlobalTotalCount.mockResolvedValue(0);
		setDashboardState(failed);
		render(<Dashboard />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		});
		await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(1));
	});

	it("seletor de mundo: — no erro, não 'Selecione um Mundo'", () => {
		setDashboardState({ ...failed, worlds: [] });
		render(
			<ToastProvider>
				<CampaignSwitcher isCollapsed={false} />
			</ToastProvider>,
		);
		expect(screen.queryByText("Selecione um Mundo")).toBeNull();
		expect(screen.getByText("Mundo indisponível")).toBeTruthy();
		expect(screen.getByTestId("unavailable-value").textContent).toContain("—");
	});
});

describe("Painel: falha das consultas base (campanhas, vínculos, plano, convites)", () => {
	afterEach(cleanup);

	const baseFailures: Array<[string, Partial<RPGState>]> = [
		// campanhas/vínculos falharam: nada da mesa foi pedido ainda
		[
			"campanhas",
			{
				campaignLoadStatus: "error",
				hasLoadedCampaigns: false,
				remoteLoadedCampaignId: null,
				baseLoadError: "Não foi possível carregar os dados da mesa.",
			},
		],
		// plano do mestre ou convites falharam
		[
			"plano/convites",
			{ baseLoadError: "Não foi possível carregar os dados da mesa." },
		],
	];

	for (const [name, partial] of baseFailures) {
		it(`${name}: aviso único na faixa do hero, Registrar Sessão desativado`, () => {
			setDashboardState(partial);
			render(<Dashboard />);
			const alert = screen.getByRole("alert", {
				name: "Falha ao carregar a mesa",
			});
			expect(
				alert.closest('[data-dash-section="hero"] [data-dash-status-band]'),
			).toBeTruthy();
			expect(
				screen.getByText("Não foi possível carregar os dados da mesa"),
			).toBeTruthy();
			expect(screen.queryByText(/Failed to fetch|Erro ao carregar/)).toBeNull();
			const session = screen.getByRole("button", { name: "Registrar Sessão" });
			expect(session.hasAttribute("disabled")).toBe(true);
			expect(
				screen.queryAllByRole("status", { name: /^Carregando/ }),
			).toHaveLength(0);
		});
	}

	it("campanhas em erro sem flag base (estado antigo) também vira erro, não skeleton", () => {
		setDashboardState({
			campaignLoadStatus: "error",
			hasLoadedCampaigns: false,
			remoteLoadedCampaignId: null,
		});
		render(<Dashboard />);
		expect(screen.getAllByRole("alert")).toHaveLength(1);
	});

	it("Registrar Sessão fica presente e desativado durante o carregamento", () => {
		setDashboardState({ isLoadingRemote: true });
		render(<Dashboard />);
		const session = screen.getByRole("button", { name: "Registrar Sessão" });
		expect(session.hasAttribute("disabled")).toBe(true);
	});

	it("jogador: Registrar Sessão fica escondido quando o papel já é conhecido", () => {
		setDashboardState({
			campaigns: [{ ...campaign, myRole: "viewer" }],
		});
		render(<Dashboard />);
		expect(screen.getByText("Jogador (Visualizador)")).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Registrar Sessão" }),
		).toBeNull();
		expect(screen.queryByText("Registrar Sessão")).toBeNull();
	});

	it("'Tentar de novo' na falha base chama a carga completa e volta ao skeleton", async () => {
		const retryBaseLoad = vi.fn(async () => {
			useRPGStore.setState({
				baseLoadError: null,
				isRetryingBase: true,
				campaignLoadStatus: "loading",
			});
		});
		setDashboardState({
			campaignLoadStatus: "error",
			hasLoadedCampaigns: false,
			remoteLoadedCampaignId: null,
			baseLoadError: "Não foi possível carregar os dados da mesa.",
			retryBaseLoad,
		});
		render(<Dashboard />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		});
		expect(retryBaseLoad).toHaveBeenCalledTimes(1);
		// Skeleton do painel, não a tela de texto "Carregando grimório...".
		expect(screen.queryByText("Carregando grimório...")).toBeNull();
		expect(screen.queryByRole("alert")).toBeNull();
		expect(
			screen.getAllByRole("status", { name: /^Carregando/ }).length,
		).toBeGreaterThan(0);
		const session = screen.getByRole("button", { name: "Registrar Sessão" });
		expect(session.hasAttribute("disabled")).toBe(true);
	});
});

describe("Selo de papel: só com o dado real", () => {
	afterEach(cleanup);

	const cachedEditor = {
		campaigns: [{ ...campaign, myRole: "editor" as const }],
	};
	const roleText = /Co-Mestre|Mestre|Jogador/;

	function renderBoth() {
		render(
			<ToastProvider>
				<CampaignSwitcher isCollapsed={false} />
				<Dashboard />
			</ToastProvider>,
		);
	}

	it("carregando: skeleton no hero e na barra lateral, sem papel padrão", () => {
		setDashboardState({ ...cachedEditor, isLoadingRemote: true });
		renderBoth();
		expect(
			screen.getAllByRole("status", { name: "Carregando papel na mesa" }),
		).toHaveLength(2);
		expect(screen.queryByText(roleText)).toBeNull();
		const hero = document.querySelector('[data-dash-section="hero"]');
		const heroRole = within(hero as HTMLElement).getByRole("status", {
			name: "Carregando papel na mesa",
		});
		expect(heroRole.getAttribute("data-seal")).toBe("role");
		expect(
			heroRole.querySelector('[data-slot="skeleton"]')?.className,
		).toContain("bg-muted-foreground/20");
		expect(
			heroRole
				.querySelector("[data-seal-label]")
				?.getAttribute("data-seal-label"),
		).toBe("Co-Mestre");
	});

	it("retry da falha base: skeleton, sem 'Co-Mestre'", () => {
		setDashboardState({
			...cachedEditor,
			isRetryingBase: true,
			campaignLoadStatus: "loading",
		});
		renderBoth();
		expect(
			screen.getAllByRole("status", { name: "Carregando papel na mesa" }),
		).toHaveLength(2);
		expect(screen.queryByText(roleText)).toBeNull();
	});

	it("erro: papel escondido nos dois lugares", () => {
		setDashboardState({
			...cachedEditor,
			baseLoadError: "Não foi possível carregar os dados da mesa.",
		});
		renderBoth();
		expect(
			screen.queryAllByRole("status", { name: "Carregando papel na mesa" }),
		).toHaveLength(0);
		expect(screen.queryByText(roleText)).toBeNull();
	});

	it("pronto: mostra o papel real (Mestre)", () => {
		setDashboardState({});
		renderBoth();
		expect(screen.getByText("Mestre da Mesa")).toBeTruthy();
		expect(screen.getByText("Mestre")).toBeTruthy();
		expect(screen.queryByText("Co-Mestre")).toBeNull();
	});
});

describe("Skeleton do painel com a forma real", () => {
	afterEach(cleanup);

	function section(name: string): HTMLElement {
		const el = document.querySelector<HTMLElement>(
			`[data-dash-section="${name}"]`,
		);
		if (!el) throw new Error(`seção ${name} não encontrada`);
		return el;
	}

	it("Ações da Mesa: cabeçalho real + 4 linhas; Missões sem skeleton", () => {
		setDashboardState({ isLoadingRemote: true });
		render(<Dashboard />);
		const actions = section("quick-actions");
		expect(within(actions).getByText("Ações da Mesa")).toBeTruthy();
		const actionRows = actions.querySelectorAll(
			"[data-dashboard-skeleton] > div",
		);
		expect(actionRows).toHaveLength(4);
		const quests = section("active-quests");
		expect(within(quests).getByText("Missões em Andamento")).toBeTruthy();
		expect(quests.querySelector("[data-dashboard-skeleton]")).toBeNull();
		expect(within(quests).getByText("Nenhuma missão ativa")).toBeTruthy();
		expect(
			within(quests).getByRole("link", { name: "Nova Missão" }),
		).toBeTruthy();
	});

	it("Grimório: grade 2×N com rótulos reais e barra só na contagem", () => {
		setDashboardState({ isLoadingRemote: true });
		render(<Dashboard />);
		const nav = section("quick-nav");
		expect(within(nav).getByText("Locais & Mapas")).toBeTruthy();
		expect(
			within(nav).getAllByRole("status", { name: /^Carregando/ }),
		).toHaveLength(8);
	});

	it("um único pulse por contêiner: nenhuma barra anima sozinha fora dele", () => {
		setDashboardState({ isLoadingRemote: true });
		render(<Dashboard />);
		const bars = Array.from(
			document.querySelectorAll<HTMLElement>('[data-slot="skeleton"]'),
		);
		expect(bars.length).toBeGreaterThan(0);
		const loose = bars
			.filter((bar) => bar.closest(".dashboard-skeleton") === null)
			.map((bar) => bar.getAttribute("aria-label") ?? bar.className);
		expect(loose).toEqual([]);
	});

	it("carregando: selos do topo reservam sistema e papel no tamanho real", () => {
		setDashboardState({
			isLoadingRemote: true,
			campaigns: [{ ...campaign, system: "dnd5e", myRole: "owner" }],
		});
		render(<Dashboard />);
		const hero = section("hero");
		const system = hero.querySelector('[data-seal="system"]');
		const role = within(hero).getByRole("status", {
			name: "Carregando papel na mesa",
		});
		expect(system).toBeTruthy();
		expect(system?.querySelector('[data-slot="skeleton"]')).toBeTruthy();
		expect(
			system
				?.querySelector("[data-seal-label]")
				?.getAttribute("data-seal-label"),
		).toBe("D&D 5ª Edição (2014)");
		expect(role.getAttribute("data-seal")).toBe("role");
		expect(
			role.querySelector("[data-seal-label]")?.getAttribute("data-seal-label"),
		).toBe("Mestre da Mesa");
		expect(screen.queryByText("D&D 5ª Edição (2014)")).toBeNull();
		expect(screen.queryByText("Mestre da Mesa")).toBeNull();
		expect(hero.querySelector(".flex-wrap")).toBeTruthy();
	});

	it("carregando sem retrato da mesa: ainda reserva o selo de sistema", () => {
		setDashboardState({
			isLoadingRemote: true,
			hasLoadedCampaigns: false,
			campaignLoadStatus: "loading",
			remoteLoadedCampaignId: null,
		});
		render(<Dashboard />);
		const hero = section("hero");
		const system = hero.querySelector('[data-seal="system"]');
		expect(system).toBeTruthy();
		expect(
			system
				?.querySelector("[data-seal-label]")
				?.getAttribute("data-seal-label"),
		).toBe("D&D 5ª Edição (2014)");
	});

	it("campanhas prontas e mesa ainda não: selos ficam em placeholder", () => {
		// loadCampaigns grava a lista antes de escolher a mesa ativa. Nesse
		// intervalo o sistema e o papel ainda não existem — os placeholders
		// não podem sair, nem o vazio da Última Sessão.
		setDashboardState({
			campaigns: [{ ...campaign, system: "dnd5e", myRole: "owner" }],
			activeCampaignId: null,
			activeWorldId: null,
			hasLoadedCampaigns: true,
			campaignLoadStatus: "ready",
			isLoadingRemote: false,
			remoteLoadedCampaignId: null,
		});
		render(<Dashboard />);
		const hero = section("hero");
		const system = hero.querySelector('[data-seal="system"]');
		const role = within(hero).getByRole("status", {
			name: "Carregando papel na mesa",
		});
		expect(system?.querySelector('[data-slot="skeleton"]')).toBeTruthy();
		expect(
			system
				?.querySelector("[data-seal-label]")
				?.getAttribute("data-seal-label"),
		).toBe("D&D 5ª Edição (2014)");
		expect(role.getAttribute("data-seal")).toBe("role");
		expect(role.querySelector('[data-slot="skeleton"]')).toBeTruthy();
		expect(
			role.querySelector("[data-seal-label]")?.getAttribute("data-seal-label"),
		).toBe("Mestre da Mesa");
		expect(screen.queryByText("D&D 5ª Edição (2014)")).toBeNull();
		expect(screen.queryByText("Mestre da Mesa")).toBeNull();
		expect(screen.queryByText("Jogador (Visualizador)")).toBeNull();
		expect(screen.queryByText("Nenhuma sessão registrada")).toBeNull();
		expect(screen.queryByText("Registrar 1ª Sessão")).toBeNull();
	});

	it("mesa sem sistema: não inventa selo de sistema no carregamento", () => {
		setDashboardState({ isLoadingRemote: true });
		render(<Dashboard />);
		const hero = section("hero");
		expect(hero.querySelector('[data-seal="system"]')).toBeNull();
		expect(hero.querySelector('[data-seal="role"]')).toBeTruthy();
	});

	it("título em carregamento reserva uma linha, não duas", () => {
		setDashboardState({
			campaigns: [],
			activeCampaignId: null,
			hasLoadedCampaigns: false,
			campaignLoadStatus: "loading",
			remoteLoadedCampaignId: null,
		});
		render(<Dashboard />);
		const title = section("hero").querySelector("h1");
		expect(title?.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(1);
	});

	it("faixa do hero fica reservada na carga normal e com a mesa pronta", () => {
		setDashboardState({ isLoadingRemote: true });
		const loading = render(<Dashboard />);
		const loadingBand = document.querySelector(
			'[data-dash-section="hero"] [data-dash-status-band]',
		);
		expect(loadingBand).toBeTruthy();
		expect(loadingBand?.className).toContain("min-h-");
		expect(loadingBand?.textContent?.trim()).toBe("");
		loading.unmount();

		setDashboardState({});
		render(<Dashboard />);
		const readyBand = document.querySelector(
			'[data-dash-section="hero"] [data-dash-status-band]',
		);
		expect(readyBand?.textContent?.trim()).toBe("");
		expect(readyBand?.className).toContain(loadingBand?.className);
	});

	it("campanhas ainda chegando: o painel em skeleton, sem tela de texto", () => {
		setDashboardState({
			campaigns: [],
			activeCampaignId: null,
			hasLoadedCampaigns: false,
			campaignLoadStatus: "loading",
			remoteLoadedCampaignId: null,
		});
		render(<Dashboard />);
		expect(screen.queryByText("Carregando grimório...")).toBeNull();
		expect(section("hero")).toBeTruthy();
		expect(section("quick-actions")).toBeTruthy();
		expect(screen.queryByText("Campanha em Foco")).toBeNull();
	});

	it("carregado: mesmas seções, sem skeleton", () => {
		setDashboardState({});
		render(<Dashboard />);
		expect(section("quick-actions")).toBeTruthy();
		expect(document.querySelectorAll("[data-dashboard-skeleton]")).toHaveLength(
			0,
		);
	});
});
