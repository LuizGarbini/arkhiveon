// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";

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

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => null,
}));
vi.mock("@tanstack/react-router", async (orig) => ({
	...(await orig<typeof import("@tanstack/react-router")>()),
	useNavigate: () => vi.fn(),
	Link: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("@/lib/auth", async (orig) => ({
	...(await orig<typeof import("@/lib/auth")>()),
	useAuth: () => ({ user: { id: "u1" }, session: null }),
}));

const toastError = vi.fn();
vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({
		error: toastError,
		success: vi.fn(),
		info: vi.fn(),
		dismiss: vi.fn(),
	}),
}));
vi.mock("./campaign-form", () => ({
	CampaignForm: () => null,
}));
vi.mock("./world-form", () => ({
	WorldForm: () => null,
}));

import { CampaignSwitcher } from "./campaign-switcher";

const deleteCampaign = vi.fn();
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

function seedStore() {
	useRPGStore.setState({
		campaigns: [
			{
				id: "camp-1",
				name: "Mesa A",
				description: "",
				ownerId: "u1",
				worldId: "world-1",
				system: "dnd5e",
				myRole: "owner",
				createdAt: 1,
			},
			{
				id: "camp-2",
				name: "Mesa B",
				description: "",
				ownerId: "u1",
				worldId: "world-1",
				system: "dnd5e",
				myRole: "owner",
				createdAt: 2,
			},
		] as never,
		worlds: [
			{
				id: "world-1",
				name: "Mundo A",
				isDefault: true,
				ownerUserId: "u1",
				createdAt: 1,
			},
		] as never,
		activeCampaignId: "camp-1",
		activeWorldId: "world-1",
		remoteLoadedCampaignId: "camp-1",
		hasLoadedCampaigns: true,
		campaignLoadStatus: "ready",
		isLoadingRemote: false,
		isRetryingBase: false,
		remoteLoadError: null,
		baseLoadError: null,
		pendingInvites: [],
		userPlan: "pro",
		deleteCampaign: deleteCampaign as never,
		deleteWorld: vi.fn() as never,
		switchCampaign: vi.fn() as never,
		switchWorld: vi.fn() as never,
		acceptInvite: vi.fn() as never,
		syncError: null,
	} as never);
}

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	deleteCampaign.mockReset();
	toastError.mockReset();
	consoleError.mockClear();
	seedStore();
});

async function openDeleteDialog() {
	fireEvent.click(
		screen.getByRole("button", { name: "Trocar Mundo ou campanha" }),
	);
	fireEvent.click(
		screen.getByRole("button", { name: "Excluir campanha Mesa A" }),
	);
	expect(
		screen.getByRole("heading", { name: "Excluir Campanha?" }),
	).toBeTruthy();
}

describe("CampaignSwitcher (excluir campanha)", () => {
	it("fecha o menu ao abrir o diálogo de exclusão", async () => {
		render(<CampaignSwitcher isCollapsed={false} />);
		await openDeleteDialog();
		expect(
			screen.queryByRole("button", { name: "Excluir campanha Mesa A" }),
		).toBeNull();
		expect(
			screen.getByRole("heading", { name: "Excluir Campanha?" }),
		).toBeTruthy();
	});

	it("mostra o toast de produto, registra o erro técnico e mantém o diálogo", async () => {
		deleteCampaign.mockRejectedValueOnce(
			new Error("transferência de mestre não permitida"),
		);
		render(<CampaignSwitcher isCollapsed={false} />);
		await openDeleteDialog();
		fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
		await waitFor(() => {
			expect(toastError).toHaveBeenCalledWith({
				title: "Erro ao excluir campanha",
				description: "Não foi possível excluir a campanha. Tente de novo.",
				noBlur: true,
				closeTouch: true,
			});
		});
		expect(consoleError).toHaveBeenCalledWith(
			"Falha ao excluir campanha:",
			"transferência de mestre não permitida",
		);
		expect(toastError.mock.calls[0][0].description).not.toContain(
			"transferência de mestre não permitida",
		);
		expect(
			screen.getByRole("heading", { name: "Excluir Campanha?" }),
		).toBeTruthy();
		expect(deleteCampaign).toHaveBeenCalledWith("camp-1");
	});

	it("desativa o Excluir e mostra Excluindo... enquanto a exclusão roda", async () => {
		let resolveDelete: (() => void) | undefined;
		deleteCampaign.mockImplementationOnce(
			() =>
				new Promise<void>((resolve) => {
					resolveDelete = resolve;
				}),
		);
		render(<CampaignSwitcher isCollapsed={false} />);
		await openDeleteDialog();
		fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
		const busy = await screen.findByRole("button", { name: "Excluindo..." });
		expect((busy as HTMLButtonElement).disabled).toBe(true);
		expect(
			screen.getByRole("heading", { name: "Excluir Campanha?" }),
		).toBeTruthy();
		resolveDelete?.();
		await waitFor(() => {
			expect(
				screen.queryByRole("heading", { name: "Excluir Campanha?" }),
			).toBeNull();
		});
	});

	it("fecha o diálogo e não mostra toast quando a exclusão passa", async () => {
		deleteCampaign.mockResolvedValueOnce(undefined);
		render(<CampaignSwitcher isCollapsed={false} />);
		await openDeleteDialog();
		fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
		await waitFor(() => {
			expect(
				screen.queryByRole("heading", { name: "Excluir Campanha?" }),
			).toBeNull();
		});
		expect(toastError).not.toHaveBeenCalled();
	});
});
