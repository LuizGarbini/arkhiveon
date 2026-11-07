// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { useRPGStore } from "@/lib/store";
import type { Campaign, Invite, World } from "@/lib/store/types";
import { CampaignForm } from "./campaign-form";

window.matchMedia =
	window.matchMedia ||
	((query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		}) as unknown as MediaQueryList);

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({ user: { id: "user-me" } }),
}));

const ME = "user-me";
const GENERIC = "Não foi possível transferir o mestre.";
const UNAVAILABLE = "transferência indisponível no momento";
const OWNER_CHANGED = "O mestre da campanha mudou.";
const AMBIGUOUS = "Não foi possível confirmar a transferência.";

function world(partial: Pick<World, "id" | "name" | "ownerUserId">): World {
	return { isDefault: false, createdAt: 1, ...partial };
}

function campaign(
	partial: Pick<Campaign, "id" | "name" | "worldId" | "myRole" | "ownerId">,
): Campaign {
	return { description: "", createdAt: 1, ...partial };
}

const ownWorld = world({ id: "w-own", name: "Valência", ownerUserId: ME });
const ownCampaign = campaign({
	id: "c-own",
	name: "Mesa da Aurora",
	worldId: ownWorld.id,
	ownerId: ME,
	myRole: "owner",
});
const coGmCampaign = campaign({
	id: "c-cogm",
	name: "Mesa Convidada",
	worldId: ownWorld.id,
	ownerId: "user-other",
	myRole: "editor",
});

const members = [
	{ id: "m-me", userId: ME, email: "eu@arkhiveon.app", role: "owner" as const },
	{
		id: "m-b",
		userId: "user-b",
		email: "bia@mesa.app",
		role: "editor" as const,
	},
	{
		id: "m-c",
		userId: "user-c",
		email: "caio@mesa.app",
		role: "viewer" as const,
	},
];
const invites: Invite[] = [
	{
		id: "inv-1",
		campaignId: ownCampaign.id,
		email: "pendente@mesa.app",
		role: "viewer",
		status: "pending",
		invitedBy: ME,
		createdAt: 1,
	},
];

const transferCampaignOwnership = vi.fn();

function renderForm(current: Campaign = ownCampaign) {
	return render(
		<ToastProvider>
			<CampaignForm
				open
				onOpenChange={() => {}}
				campaign={current}
				defaultTab="members"
			/>
		</ToastProvider>,
	);
}

function enableFlag(value = "true") {
	vi.stubEnv("VITE_ENABLE_TRANSFER_CAMPAIGN_OWNERSHIP", value);
}

async function openTransfer(email: string) {
	const button = await screen.findByRole("button", {
		name: `Transferir mestre para ${email}`,
	});
	await act(async () => {
		fireEvent.click(button);
	});
}

describe("Transferir mestre no diálogo da campanha", () => {
	beforeEach(() => {
		transferCampaignOwnership.mockReset();
		transferCampaignOwnership.mockResolvedValue({
			status: "success",
			message: "",
			members,
			invites: [],
		});
		enableFlag("true");
		useRPGStore.setState({
			worlds: [ownWorld],
			campaigns: [ownCampaign, coGmCampaign],
			activeCampaignId: ownCampaign.id,
			userPlan: "pro",
			notifications: [],
			loadCampaignMembersAndInvites: vi.fn(async () => ({
				members,
				invites,
			})),
			transferCampaignOwnership:
				transferCampaignOwnership as unknown as typeof transferCampaignOwnership,
		} as never);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllEnvs();
	});

	it("esconde a ação quando a flag não é exatamente true", async () => {
		enableFlag("");
		renderForm();
		expect(await screen.findByText("bia@mesa.app")).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: /Transferir mestre/ }),
		).toBeNull();
	});

	it("o mestre vê a ação só para viewer e editor da mesma campanha", async () => {
		renderForm();
		expect(
			await screen.findByRole("button", {
				name: "Transferir mestre para bia@mesa.app",
			}),
		).toBeTruthy();
		expect(
			screen.getByRole("button", {
				name: "Transferir mestre para caio@mesa.app",
			}),
		).toBeTruthy();
		expect(
			screen.queryByRole("button", {
				name: "Transferir mestre para eu@arkhiveon.app",
			}),
		).toBeNull();
		expect(
			screen.queryByRole("button", {
				name: /Transferir mestre para pendente@mesa.app/,
			}),
		).toBeNull();
		const target = screen.getByRole("button", {
			name: "Transferir mestre para bia@mesa.app",
		});
		expect(target.className).toContain("min-h-[44px]");
	});

	it("co-mestre e jogador não veem a ação", async () => {
		renderForm(coGmCampaign);
		expect(await screen.findByText("bia@mesa.app")).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: /Transferir mestre/ }),
		).toBeNull();
	});

	it("o diálogo nomeia o alvo e avisa que a troca não se desfaz sozinha", async () => {
		renderForm();
		await openTransfer("bia@mesa.app");
		expect(
			screen.getByText(/você vira co-mestre e não pode desfazer sozinho/),
		).toBeTruthy();
		expect(screen.getByRole("alertdialog").textContent).toContain(
			"bia@mesa.app",
		);
		expect(screen.getByRole("alertdialog").textContent).toMatch(
			/imagens privadas e os segredos de mestre/,
		);
		expect(transferCampaignOwnership).not.toHaveBeenCalled();
	});

	it("cancelar não escreve", async () => {
		renderForm();
		await openTransfer("caio@mesa.app");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		});
		expect(transferCampaignOwnership).not.toHaveBeenCalled();
		expect(screen.queryByRole("alertdialog")).toBeNull();
	});

	it("com a flag desligada no confirmar, o handler não chama a ação", async () => {
		renderForm();
		await openTransfer("bia@mesa.app");
		enableFlag("false");
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Transferir mestre" }),
			);
		});
		expect(transferCampaignOwnership).not.toHaveBeenCalled();
	});

	it.each([
		["unavailable", UNAVAILABLE],
		["forbidden", GENERIC],
		["owner-changed", OWNER_CHANGED],
		["invalid", GENERIC],
		["generic", GENERIC],
		["ambiguous", AMBIGUOUS],
		["offline", "A transferência de mestre só funciona com conexão."],
	] as const)(
		"mostra o erro %s sem repetir a ação",
		async (status, message) => {
			transferCampaignOwnership.mockResolvedValue({ status, message });
			renderForm();
			await openTransfer("bia@mesa.app");
			await act(async () => {
				fireEvent.click(
					screen.getByRole("button", { name: "Transferir mestre" }),
				);
			});
			expect((await screen.findByRole("alert")).textContent).toContain(message);
			expect(transferCampaignOwnership).toHaveBeenCalledTimes(1);
			expect(transferCampaignOwnership).toHaveBeenCalledWith(
				ownCampaign.id,
				"user-b",
			);
			expect(screen.queryByText("Mestre transferido")).toBeNull();
		},
	);

	it("ACK incerto mostra a mensagem e não dispara outra transferência", async () => {
		transferCampaignOwnership.mockResolvedValue({
			status: "ambiguous",
			message: AMBIGUOUS,
			members,
			invites,
		});
		renderForm();
		await openTransfer("bia@mesa.app");
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Transferir mestre" }),
			);
			fireEvent.click(
				screen.getByRole("button", { name: "Transferir mestre" }),
			);
		});
		expect((await screen.findByRole("alert")).textContent).toContain(AMBIGUOUS);
		expect(transferCampaignOwnership).toHaveBeenCalledTimes(1);
	});

	it("sessão ou campanha abortada não vira sucesso nem erro", async () => {
		transferCampaignOwnership.mockResolvedValue({
			status: "aborted",
			message: "",
		});
		renderForm();
		await openTransfer("bia@mesa.app");
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Transferir mestre" }),
			);
		});
		await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
		expect(screen.queryByRole("alert")).toBeNull();
		expect(screen.queryByText("Mestre transferido")).toBeNull();
		expect(transferCampaignOwnership).toHaveBeenCalledTimes(1);
	});

	it("sucesso avisa, troca os papéis e esconde as ações de mestre sem recarregar", async () => {
		transferCampaignOwnership.mockImplementation(async () => {
			useRPGStore.setState((state) => ({
				campaigns: state.campaigns.map((item) =>
					item.id === ownCampaign.id
						? { ...item, myRole: "editor" as const, ownerId: "user-b" }
						: item,
				),
			}));
			return {
				status: "success",
				message: "",
				members: [
					{
						id: "m-me",
						userId: ME,
						email: "eu@arkhiveon.app",
						role: "editor" as const,
					},
					{
						id: "m-b",
						userId: "user-b",
						email: "bia@mesa.app",
						role: "owner" as const,
					},
					{
						id: "m-c",
						userId: "user-c",
						email: "caio@mesa.app",
						role: "viewer" as const,
					},
				],
				invites: [],
			};
		});
		renderForm();
		await openTransfer("bia@mesa.app");
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Transferir mestre" }),
			);
		});
		expect(await screen.findByText("Mestre transferido")).toBeTruthy();
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(
			screen.queryByRole("button", { name: /Transferir mestre/ }),
		).toBeNull();
		expect(screen.queryByText("Limite de jogadores")).toBeNull();
		expect(
			screen.getByText("eu@arkhiveon.app").parentElement?.textContent,
		).toContain("Co-Mestre");
		expect(
			screen.getByText("bia@mesa.app").parentElement?.textContent,
		).toContain("Mestre");
		expect(useRPGStore.getState().notifications).toEqual([]);
	});
});
