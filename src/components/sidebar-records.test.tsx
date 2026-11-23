// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { Flag } from "lucide-react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorageContext } from "@/lib/storage/storage-context";
import { useRPGStore } from "@/lib/store";
import { getFactionsTabConfig } from "@/lib/systems";
import { Sidebar } from "./sidebar";

const storage = vi.hoisted(() => ({
	context: {
		status: "ready",
		label: "free",
		usedBytes: 38_400_000,
		limitBytes: 100_000_000,
		usedPdfs: null,
		usedImages: null,
		overLimitSince: null,
		payerName: null,
	} as StorageContext,
}));

vi.mock("@/lib/storage/use-storage-context", () => ({
	useStorageContext: () => storage.context,
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		...props
	}: {
		children?: ReactNode;
		to?: string;
		className?: string;
		onClick?: () => void;
		"aria-label"?: string;
		title?: string;
	}) => (
		<a href={to ?? "/"} {...props}>
			{children}
		</a>
	),
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

function baseStore() {
	useRPGStore.setState({
		isLoadingRemote: false,
		hasLoadedCampaigns: true,
		remoteLoadError: null,
		baseLoadError: null,
		campaignLoadStatus: "ready",
		activeCampaignId: "camp-1",
		remoteLoadedCampaignId: "camp-1",
		globalRecordsCount: 7,
	});
}

describe("Sidebar: card de cota (U1)", () => {
	afterEach(cleanup);

	it("sai o bloco Registros/Arquivos", () => {
		storage.context = {
			...storage.context,
			status: "ready",
			label: "free",
			usedBytes: 38_400_000,
		};
		baseStore();
		render(<Sidebar isOpen />);
		expect(screen.queryByText("Registros")).toBeNull();
		expect(screen.queryByText("Arquivos")).toBeNull();
		expect(screen.queryByText("Fazer Upgrade")).toBeNull();
		expect(screen.getByText("Free")).toBeTruthy();
		expect(screen.getByText("38,4 / 100 MB")).toBeTruthy();
	});

	it("plano carregando: esqueleto, nunca Free nem 0 MB", () => {
		storage.context = { ...storage.context, status: "loading" };
		baseStore();
		render(<Sidebar isOpen />);
		expect(
			screen.getByRole("status", { name: "Carregando consumo" }),
		).toBeTruthy();
		expect(screen.queryByText(/Free/i)).toBeNull();
		expect(screen.queryByText(/0 MB/)).toBeNull();
		expect(screen.queryByText(/0,0/)).toBeNull();
	});

	it("plano falhou: Consumo indisponível, nunca Free nem 0 MB", () => {
		storage.context = { ...storage.context, status: "error" };
		baseStore();
		render(<Sidebar isOpen />);
		expect(screen.getByText("Consumo")).toBeTruthy();
		expect(screen.getByText("indisponível")).toBeTruthy();
		expect(screen.queryByText(/Free/i)).toBeNull();
		expect(screen.queryByText(/0 MB/)).toBeNull();
	});
});

describe("Sidebar: rótulos do mundo", () => {
	afterEach(cleanup);

	it("campanhas ainda carregando: rótulo do mundo pendente, sem 'Facções & Ordens'", () => {
		storage.context = { ...storage.context, status: "ready", label: "free" };
		useRPGStore.setState({
			campaignLoadStatus: "loading",
			hasLoadedCampaigns: false,
			isRetryingBase: false,
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

	it("erro 500: item da bandeira entre NPCs e Mural mostra o nome", () => {
		storage.context = { ...storage.context, status: "ready", label: "free" };
		const fallback = getFactionsTabConfig(undefined);
		expect(fallback.Icon).toBe(Flag);
		useRPGStore.setState({
			campaignLoadStatus: "error",
			hasLoadedCampaigns: false,
			isRetryingBase: false,
			activeCampaignId: "camp-1",
			remoteLoadError: "falhou",
			baseLoadError: "Não foi possível carregar os dados da mesa.",
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
		const factions = screen.getByTestId("nav-/factions");
		expect(factions.dataset.pending).toBe("false");
		expect(factions.textContent).toBe(fallback.label);
		const items = screen
			.getAllByRole("listitem")
			.map((item) => item.textContent);
		const npcs = items.indexOf("NPCs");
		const flag = items.indexOf(fallback.label);
		const mural = items.indexOf("Mural");
		expect(flag).toBe(npcs + 1);
		expect(mural).toBe(flag + 1);
	});
});
