// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import { Sidebar } from "./sidebar";

const auth = vi.hoisted(() => ({
	planLoading: false,
	planStatus: "ready" as "loading" | "ready" | "error",
	isPro: false,
}));

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({
		isPro: auth.isPro,
		planLoading: auth.planLoading,
		planStatus: auth.planStatus,
		storageUsedBytes: 0,
	}),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock("./campaign-switcher", () => ({ CampaignSwitcher: () => null }));
vi.mock("./sidebar-nav", () => ({
	SidebarNav: ({
		items,
	}: {
		items: { to: string; label: string; labelPending?: boolean }[];
	}) => (
		<ul>
			{items.map((item) => (
				<li
					key={item.to}
					data-testid={`nav-${item.to}`}
					data-pending={String(Boolean(item.labelPending))}
				>
					{item.labelPending ? "" : item.label}
				</li>
			))}
		</ul>
	),
}));
vi.mock("@/lib/library/use-library-pilot", () => ({
	useLibraryPilot: () => false,
}));

function renderWith(state: {
	isLoadingRemote: boolean;
	hasLoadedCampaigns: boolean;
	planLoading?: boolean;
	awaitingMesaData?: boolean;
	loadError?: string;
}) {
	auth.planLoading = state.planLoading ?? false;
	auth.planStatus = state.planLoading ? "loading" : "ready";
	auth.isPro = false;
	useRPGStore.setState({
		isLoadingRemote: state.isLoadingRemote,
		hasLoadedCampaigns: state.hasLoadedCampaigns,
		remoteLoadError: state.loadError ?? null,
		activeCampaignId: "camp-1",
		remoteLoadedCampaignId: state.awaitingMesaData ? null : "camp-1",
		globalRecordsCount: 7,
	});
	render(<Sidebar isOpen />);
}

describe("Sidebar: Registros", () => {
	afterEach(cleanup);

	it("mostra skeleton enquanto os dados carregam, sem 0/20", () => {
		renderWith({ isLoadingRemote: true, hasLoadedCampaigns: true });
		expect(
			screen.getByRole("status", { name: "Carregando registros" }),
		).toBeTruthy();
		expect(screen.queryByText(/7 \//)).toBeNull();
	});

	it("mostra skeleton enquanto o plano carrega", () => {
		renderWith({
			isLoadingRemote: false,
			hasLoadedCampaigns: true,
			planLoading: true,
		});
		expect(
			screen.getByRole("status", { name: "Carregando registros" }),
		).toBeTruthy();
	});

	it("após reload, antes da carga começar: skeleton, não 0", () => {
		renderWith({
			isLoadingRemote: false,
			hasLoadedCampaigns: true,
			awaitingMesaData: true,
		});
		expect(
			screen.getByRole("status", { name: "Carregando registros" }),
		).toBeTruthy();
	});

	it("falha na carga: mostra —, sem 0/20 e sem skeleton", () => {
		renderWith({
			isLoadingRemote: false,
			hasLoadedCampaigns: true,
			awaitingMesaData: true,
			loadError: "falhou",
		});
		expect(screen.getByText("Registros indisponíveis")).toBeTruthy();
		expect(screen.getByTestId("unavailable-value").textContent).toContain("—");
		expect(screen.queryByText(/\d+ \/ (20|∞)/)).toBeNull();
		expect(
			screen.queryByRole("status", { name: "Carregando registros" }),
		).toBeNull();
	});

	it("mostra a contagem quando terminou de carregar", () => {
		renderWith({ isLoadingRemote: false, hasLoadedCampaigns: true });
		expect(
			screen.queryByRole("status", { name: "Carregando registros" }),
		).toBeNull();
		expect(screen.getByText("7 / 20")).toBeTruthy();
	});
});

describe("Sidebar: plano e rótulos do mundo sem valor padrão falso", () => {
	afterEach(cleanup);

	function renderPlan(planStatus: "loading" | "ready" | "error") {
		auth.planLoading = planStatus === "loading";
		auth.planStatus = planStatus;
		auth.isPro = false;
		useRPGStore.setState({
			isLoadingRemote: false,
			hasLoadedCampaigns: true,
			remoteLoadError: null,
			baseLoadError: null,
			campaignLoadStatus: "ready",
			activeCampaignId: "camp-1",
			remoteLoadedCampaignId: "camp-1",
		});
		render(<Sidebar isOpen />);
	}

	it("plano falhou (user_plans): —, nunca 'Plano Free' nem 0.0MB", () => {
		renderPlan("error");
		expect(screen.queryByText("Plano Free")).toBeNull();
		expect(screen.queryByText("Free")).toBeNull();
		expect(screen.queryByText(/0\.0MB/)).toBeNull();
		expect(screen.queryByText("Fazer Upgrade")).toBeNull();
		expect(screen.getByText("Plano indisponível")).toBeTruthy();
		expect(screen.getByText("Arquivos indisponíveis")).toBeTruthy();
	});

	it("plano carregando: skeleton em Arquivos, sem Free", () => {
		renderPlan("loading");
		expect(screen.queryByText("Plano Free")).toBeNull();
		expect(screen.queryByText(/0\.0MB/)).toBeNull();
		expect(
			screen.getByRole("status", { name: "Carregando arquivos" }),
		).toBeTruthy();
		// Título "Plano" fica fixo; só o valor vira barra curta.
		expect(screen.getByText("Plano")).toBeTruthy();
		expect(
			screen.getByRole("status", { name: "Carregando plano" }),
		).toBeTruthy();
		expect(screen.queryByText("Verificando")).toBeNull();
	});

	it("plano real chegou: mostra o valor", () => {
		renderPlan("ready");
		expect(screen.getByText("Plano Free")).toBeTruthy();
		expect(screen.getByText(/0\.0MB \/ 100MB/)).toBeTruthy();
	});

	it("campanhas ainda não confirmadas: rótulo do mundo pendente, sem 'Facções & Ordens'", () => {
		auth.planStatus = "ready";
		useRPGStore.setState({
			campaignLoadStatus: "error",
			activeCampaignId: "camp-1",
			campaigns: [
				{
					id: "camp-1",
					name: "QA Designer (teste)",
					description: "",
					ownerId: "o",
					worldId: "w",
					myRole: "editor",
					createdAt: 1,
				},
			],
		});
		render(<Sidebar isOpen />);
		expect(screen.getByTestId("nav-/factions").dataset.pending).toBe("true");
		expect(screen.queryByText("Facções & Ordens")).toBeNull();
	});
});
