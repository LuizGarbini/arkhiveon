// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityFeed } from "@/components/activity-feed";
import { useRPGStore } from "@/lib/store";

const remote = vi.hoisted(() => ({ loadRemoteActivity: vi.fn() }));
vi.mock("@/lib/remote-store", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/remote-store")>()),
	loadRemoteActivity: remote.loadRemoteActivity,
}));

describe("Timeline: falha só desta seção", () => {
	beforeEach(() => {
		useRPGStore.setState({
			activityLog: [],
			activeCampaignId: "camp-1",
			activityLoadError: null,
			isLoadingActivity: false,
		});
	});
	afterEach(cleanup);

	it("erro: linha discreta com 'Tentar de novo', sem 'Nenhum registro ainda'", () => {
		const onRetry = vi.fn();
		render(<ActivityFeed loadError="falhou" onRetry={onRetry} />);
		const line = screen.getByRole("alert");
		expect(line.textContent).toContain(
			"Não foi possível carregar a atividade recente.",
		);
		expect(screen.queryByText("Nenhum registro ainda")).toBeNull();
		const button = screen.getByRole("button", { name: "Tentar de novo" });
		expect(button.className).toContain("min-h-[44px]");
		fireEvent.click(button);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("vazio de verdade: mostra o vazio, sem aviso", () => {
		render(<ActivityFeed onRetry={vi.fn()} />);
		expect(screen.getByText("Nenhum registro ainda")).toBeTruthy();
		expect(screen.queryByRole("alert")).toBeNull();
	});

	it("carregando/nova tentativa: skeleton, sem aviso e sem vazio", () => {
		const { container } = render(
			<ActivityFeed isLoading loadError={null} onRetry={vi.fn()} />,
		);
		expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
		expect(screen.queryByRole("alert")).toBeNull();
		expect(screen.queryByText("Nenhum registro ainda")).toBeNull();
	});

	it("falha global: estado neutro, sem vazio", () => {
		render(<ActivityFeed isUnavailable />);
		expect(
			screen.getByRole("region", { name: "Atividade recente: indisponível" }),
		).toBeTruthy();
		expect(screen.queryByText("Nenhum registro ainda")).toBeNull();
	});

	it("retryActivity: marca carregando, depois grava a timeline", async () => {
		let resolve: (v: unknown) => void = () => {};
		remote.loadRemoteActivity.mockReturnValue(
			new Promise((r) => {
				resolve = r;
			}),
		);
		useRPGStore.setState({ activityLoadError: "falhou" });
		const pending = useRPGStore.getState().retryActivity();
		expect(useRPGStore.getState().isLoadingActivity).toBe(true);
		expect(useRPGStore.getState().activityLoadError).toBeNull();
		resolve([]);
		await pending;
		expect(useRPGStore.getState().isLoadingActivity).toBe(false);
		expect(useRPGStore.getState().activityLoadError).toBeNull();
	});

	it("retryActivity que falha volta para a linha de erro", async () => {
		remote.loadRemoteActivity.mockRejectedValue(new Error("offline"));
		await useRPGStore.getState().retryActivity();
		expect(useRPGStore.getState().activityLoadError).toBeTruthy();
		expect(useRPGStore.getState().isLoadingActivity).toBe(false);
	});
});
