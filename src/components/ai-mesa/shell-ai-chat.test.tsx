// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
	pathname: "/sheets",
	user: { id: "gm" } as { id: string } | null,
	state: {
		activeCampaignId: "rise" as string | null,
		campaigns: [
			{ id: "rise", name: "Rise of Tiamat", ownerId: "gm", myRole: "owner" },
			{ id: "other", name: "Outra", ownerId: "gm", myRole: "owner" },
			{ id: "guest", name: "Mesa alheia", ownerId: "x", myRole: "viewer" },
		],
	},
	allowlist: new Set(["rise", "guest"]),
	fetchMesaPilotEnabled: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
	useLocation: () => ({ pathname: h.pathname }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock("@/lib/store", () => {
	const useRPGStore = (selector: (s: typeof h.state) => unknown) =>
		selector(h.state);
	useRPGStore.getState = () => h.state;
	return { useRPGStore };
});
vi.mock("@/lib/ai-mesa/client", () => ({
	fetchMesaPilotEnabled: h.fetchMesaPilotEnabled,
	askMesaAssistant: vi.fn(),
}));

import { ShellAiChat } from "./shell-ai-chat";

const FAB = "Abrir assistente da mesa";

beforeEach(() => {
	h.pathname = "/sheets";
	h.user = { id: "gm" };
	h.state.activeCampaignId = "rise";
	h.fetchMesaPilotEnabled.mockReset();
	h.fetchMesaPilotEnabled.mockImplementation(async (id: string) =>
		h.allowlist.has(id),
	);
});
afterEach(cleanup);

describe("ShellAiChat", () => {
	it("mostra um FAB fixo quando a campanha ativa está na allowlist", async () => {
		render(<ShellAiChat />);
		const fab = await screen.findByRole("button", { name: FAB });
		expect(fab.className).toContain("fixed");
		expect(screen.getAllByRole("button", { name: FAB })).toHaveLength(1);
		expect(h.fetchMesaPilotEnabled).toHaveBeenCalledWith("rise");
	});

	it("não mostra nada fora da allowlist", async () => {
		h.state.activeCampaignId = "other";
		render(<ShellAiChat />);
		await waitFor(() =>
			expect(h.fetchMesaPilotEnabled).toHaveBeenCalledWith("other"),
		);
		expect(screen.queryByRole("button", { name: FAB })).toBeNull();
	});

	it("não mostra para quem não é mestre/editor (nem consulta a allowlist)", async () => {
		h.state.activeCampaignId = "guest";
		render(<ShellAiChat />);
		await Promise.resolve();
		expect(h.fetchMesaPilotEnabled).not.toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: FAB })).toBeNull();
	});

	it("não mostra sem campanha ativa", async () => {
		h.state.activeCampaignId = null;
		render(<ShellAiChat />);
		await Promise.resolve();
		expect(h.fetchMesaPilotEnabled).not.toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: FAB })).toBeNull();
	});

	it("não duplica o FAB na aba VTT (o VTT monta o dele)", async () => {
		h.pathname = "/campaigns/rise/vtt";
		render(<ShellAiChat />);
		await Promise.resolve();
		expect(h.fetchMesaPilotEnabled).not.toHaveBeenCalled();
		expect(screen.queryByRole("button", { name: FAB })).toBeNull();
	});
});
