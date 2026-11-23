// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StorageContext } from "@/lib/storage/storage-context";
import { useRPGStore } from "@/lib/store";

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
	isPro: false,
	retry: vi.fn(),
}));

vi.mock("@/lib/storage/use-storage-context", () => ({
	useStorageContext: () => storage.context,
	useRetryStorage: () => storage.retry,
}));
vi.mock("@/lib/auth", () => ({
	useAuth: () => ({ isPro: storage.isPro, reloadPlan: storage.retry }),
}));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (opts: { component: () => ReactNode }) => opts,
	Link: ({ children, ...props }: { children?: ReactNode; to?: string }) => (
		<a href={props.to ?? "/"}>{children}</a>
	),
}));

import { ConsumoRoute } from "@/routes/consumo";

describe("/consumo", () => {
	afterEach(() => {
		cleanup();
		storage.context = {
			...storage.context,
			status: "ready",
			label: "free",
			usedBytes: 38_400_000,
			limitBytes: 100_000_000,
		};
		storage.isPro = false;
		storage.retry.mockReset();
	});

	it("Free mostra n / 20 e o total de uso", () => {
		useRPGStore.setState({
			globalRecordsCount: 7,
			isLoadingRemote: false,
			hasLoadedCampaigns: true,
			campaignLoadStatus: "ready",
			remoteLoadError: null,
			baseLoadError: null,
			isRetryingBase: false,
			activeCampaignId: "camp-1",
			remoteLoadedCampaignId: "camp-1",
		});
		render(<ConsumoRoute />);
		expect(screen.getByText("7 / 20")).toBeTruthy();
		expect(screen.getByText("38,4 MB de 100 MB")).toBeTruthy();
		expect(screen.queryByText(/sem limite/i)).toBeNull();
	});

	it("Pro mostra sem limite e o total em GB", () => {
		storage.isPro = true;
		storage.context = {
			...storage.context,
			label: "pro",
			usedBytes: 1_310_000_000,
			limitBytes: 10_000_000_000,
		};
		useRPGStore.setState({
			globalRecordsCount: 42,
			isLoadingRemote: false,
			hasLoadedCampaigns: true,
			campaignLoadStatus: "ready",
			remoteLoadError: null,
			baseLoadError: null,
			isRetryingBase: false,
			activeCampaignId: "camp-1",
			remoteLoadedCampaignId: "camp-1",
		});
		render(<ConsumoRoute />);
		expect(screen.getByText("sem limite")).toBeTruthy();
		expect(screen.getByText("1,3 GB de 10 GB")).toBeTruthy();
		expect(screen.queryByText(/\/ 20/)).toBeNull();
	});

	it("carregando: esqueleto, nunca 0 / 20 nem 0 MB", () => {
		storage.context = { ...storage.context, status: "loading" };
		useRPGStore.setState({
			isLoadingRemote: true,
			hasLoadedCampaigns: false,
			campaignLoadStatus: "loading",
		});
		render(<ConsumoRoute />);
		expect(
			screen.getByRole("status", { name: "Carregando armazenamento" }),
		).toBeTruthy();
		expect(
			screen.getByRole("status", { name: "Carregando registros" }),
		).toBeTruthy();
		expect(screen.queryByText(/0 \/ 20/)).toBeNull();
		expect(screen.queryByText(/0 MB/)).toBeNull();
		expect(screen.queryByText(/sem limite/i)).toBeNull();
	});
});
