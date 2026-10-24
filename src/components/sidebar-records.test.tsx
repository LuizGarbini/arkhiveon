// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import { Sidebar } from "./sidebar";

const auth = vi.hoisted(() => ({ planLoading: false }));

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({
		isPro: false,
		planLoading: auth.planLoading,
		storageUsedBytes: 0,
	}),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children?: ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock("./campaign-switcher", () => ({ CampaignSwitcher: () => null }));
vi.mock("./sidebar-nav", () => ({ SidebarNav: () => null }));
vi.mock("@/lib/library/use-library-pilot", () => ({
	useLibraryPilot: () => false,
}));

function renderWith(state: {
	isLoadingRemote: boolean;
	hasLoadedCampaigns: boolean;
	planLoading?: boolean;
}) {
	auth.planLoading = state.planLoading ?? false;
	useRPGStore.setState({
		isLoadingRemote: state.isLoadingRemote,
		hasLoadedCampaigns: state.hasLoadedCampaigns,
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

	it("mostra a contagem quando terminou de carregar", () => {
		renderWith({ isLoadingRemote: false, hasLoadedCampaigns: true });
		expect(
			screen.queryByRole("status", { name: "Carregando registros" }),
		).toBeNull();
		expect(screen.getByText("7 / 20")).toBeTruthy();
	});
});
