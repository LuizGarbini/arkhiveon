// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { useRPGStore } from "@/lib/store";
import type { Campaign, World } from "@/lib/store/types";
import { campaignPerWorldLimitError } from "@/lib/worldbuilding/plan-limits";
import { CampaignForm } from "./campaign-form";
import { CampaignSwitcher } from "./campaign-switcher";

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

function world(partial: Pick<World, "id" | "name" | "ownerUserId">): World {
	return {
		isDefault: false,
		createdAt: 1,
		...partial,
	};
}

function campaign(
	partial: Pick<Campaign, "id" | "name" | "worldId" | "myRole" | "ownerId">,
): Campaign {
	return {
		description: "",
		createdAt: 1,
		...partial,
	};
}

const ownWorld = world({ id: "w-own", name: "Valência", ownerUserId: ME });
const coGmWorld = world({
	id: "w-cogm",
	name: "Eberron",
	ownerUserId: "user-other",
});
const viewerWorld = world({
	id: "w-play",
	name: "Reinos Esquecidos",
	ownerUserId: "user-other",
});

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
	worldId: coGmWorld.id,
	ownerId: "user-other",
	myRole: "editor",
});
const viewerCampaign = campaign({
	id: "c-play",
	name: "Só Jogo",
	worldId: viewerWorld.id,
	ownerId: "user-other",
	myRole: "viewer",
});

const createCampaign = vi.fn(async () => ({
	...ownCampaign,
	id: "c-created",
	name: "Mesa Nova",
}));
const switchCampaign = vi.fn(async () => undefined);
const createWorld = vi.fn(
	async (name: string, options?: { activate?: boolean }) => {
		const created = world({ id: "w-new", name, ownerUserId: ME });
		const activate = options?.activate !== false;
		useRPGStore.setState((state) => ({
			worlds: [...state.worlds, created],
			activeWorldId: activate ? created.id : state.activeWorldId,
		}));
		return created;
	},
);
const switchWorld = vi.fn(async () => undefined);

function renderWithToast(ui: ReactNode) {
	return render(<ToastProvider>{ui}</ToastProvider>);
}

async function openOptions(trigger: HTMLElement) {
	await act(async () => {
		fireEvent.click(trigger);
	});
}

async function chooseOption(trigger: HTMLElement, optionName: string) {
	await openOptions(trigger);
	const option = await screen.findByRole("option", { name: optionName });
	await act(async () => {
		fireEvent.mouseMove(option);
	});
	await act(async () => {
		fireEvent.click(option);
	});
}

function worldCombobox(): HTMLElement | null {
	return screen.queryByRole("combobox", { name: /Mundo/ });
}

beforeEach(() => {
	createCampaign.mockClear();
	switchCampaign.mockClear();
	createWorld.mockClear();
	switchWorld.mockClear();
	useRPGStore.setState({
		worlds: [ownWorld, coGmWorld, viewerWorld],
		campaigns: [ownCampaign, coGmCampaign, viewerCampaign],
		activeCampaignId: ownCampaign.id,
		activeWorldId: ownWorld.id,
		userPlan: "pro",
		pendingInvites: [],
		hasLoadedCampaigns: true,
		campaignLoadStatus: "ready",
		createCampaign: createCampaign as never,
		switchCampaign: switchCampaign as never,
		createWorld: createWorld as never,
		switchWorld: switchWorld as never,
		updateCampaign: vi.fn(),
		loadCampaignMembersAndInvites: vi.fn(async () => ({
			members: [],
			invites: [],
		})),
	} as never);
});

afterEach(() => {
	cleanup();
});

describe("Nova Campanha pede o mundo", () => {
	it("começa com o Select vazio, sem o mundo ativo", () => {
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		const trigger = worldCombobox();
		expect(trigger).not.toBeNull();
		expect(trigger?.textContent).toContain("Escolha um mundo");
		expect(trigger?.textContent).not.toContain("Valência");
		expect(document.querySelector("select")).toBeNull();
	});

	it("enviar sem mundo mostra erro inline e não chama createCampaign", async () => {
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		fireEvent.change(screen.getByLabelText(/Nome da Campanha/), {
			target: { value: "Mesa Nova" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar Campanha" }));
		});
		const trigger = worldCombobox();
		expect(trigger?.getAttribute("aria-invalid")).toBe("true");
		const describedBy = trigger?.getAttribute("aria-describedby") ?? "";
		const describedText = describedBy
			.split(" ")
			.map((id) => document.getElementById(id)?.textContent ?? "")
			.join(" ");
		expect(describedText).toContain("Escolha um mundo.");
		expect(createCampaign).not.toHaveBeenCalled();
	});

	it("createCampaign recebe o worldId escolhido, não o mundo ativo", async () => {
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		fireEvent.change(screen.getByLabelText(/Nome da Campanha/), {
			target: { value: "Mesa Nova" },
		});
		const trigger = worldCombobox();
		expect(trigger).not.toBeNull();
		await chooseOption(trigger as HTMLElement, "Eberron");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar Campanha" }));
		});
		await waitFor(() => expect(createCampaign).toHaveBeenCalledTimes(1));
		expect(createCampaign).toHaveBeenCalledWith("Mesa Nova", "", {
			worldId: "w-cogm",
			system: "dnd5e",
		});
	});

	it("Criar mundo novo… é o último item, depois do separador", async () => {
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		const trigger = worldCombobox();
		expect(trigger).not.toBeNull();
		await openOptions(trigger as HTMLElement);
		const options = await screen.findAllByRole("option");
		expect(options.map((option) => option.textContent)).toEqual([
			"Valência",
			"Eberron",
			"Criar mundo novo…",
		]);
		expect(
			screen.queryByRole("option", { name: "Reinos Esquecidos" }),
		).toBeNull();
		const separator = screen.getByRole("separator");
		const last = options.at(-1);
		expect(last).toBeTruthy();
		expect(
			separator.compareDocumentPosition(last as HTMLElement) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
	});

	it("criar mundo novo volta selecionado e o formulário continua aberto", async () => {
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		const trigger = worldCombobox();
		expect(trigger).not.toBeNull();
		await chooseOption(trigger as HTMLElement, "Criar mundo novo…");
		fireEvent.change(screen.getByLabelText("Nome do mundo"), {
			target: { value: "Krynn" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar mundo" }));
		});
		await waitFor(() => {
			expect(worldCombobox()?.textContent).toContain("Krynn");
		});
		expect(screen.getByRole("heading", { name: "Nova Campanha" })).toBeTruthy();
		expect(createCampaign).not.toHaveBeenCalled();
		expect(createWorld).toHaveBeenCalledWith("Krynn", { activate: false });
		expect(useRPGStore.getState().activeWorldId).toBe(ownWorld.id);
	});

	it("erro ao criar mundo fica no campo", async () => {
		createWorld.mockRejectedValueOnce(new Error("Limite de mundos."));
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		const trigger = worldCombobox();
		expect(trigger).not.toBeNull();
		await chooseOption(trigger as HTMLElement, "Criar mundo novo…");
		fireEvent.change(screen.getByLabelText("Nome do mundo"), {
			target: { value: "Krynn" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar mundo" }));
		});
		const nameInput = screen.getByLabelText("Nome do mundo");
		expect(nameInput.getAttribute("aria-invalid")).toBe("true");
		const describedBy = nameInput.getAttribute("aria-describedby") ?? "";
		expect(document.getElementById(describedBy)?.textContent).toContain(
			"Limite de mundos.",
		);
		expect(screen.getByRole("heading", { name: "Nova Campanha" })).toBeTruthy();
		expect(createCampaign).not.toHaveBeenCalled();
	});

	it("conta sem mundo mostra estado vazio que leva a criar um", () => {
		useRPGStore.setState({ worlds: [], campaigns: [] } as never);
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		expect(screen.getByText("Nenhum mundo ainda")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Criar mundo" })).toBeTruthy();
		expect(worldCombobox()).toBeNull();
	});

	it("conta sem mundos esconde a ajuda e desabilita Criar Campanha até escolher um mundo", async () => {
		useRPGStore.setState({ worlds: [], campaigns: [] } as never);
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		fireEvent.change(screen.getByLabelText(/Nome da Campanha/), {
			target: { value: "Mesa Nova" },
		});
		expect(
			screen.queryByText(/Campanhas no mesmo mundo compartilham/),
		).toBeNull();
		expect(
			(
				screen.getByRole("button", {
					name: "Criar Campanha",
				}) as HTMLButtonElement
			).disabled,
		).toBe(true);

		fireEvent.click(screen.getByRole("button", { name: "Criar mundo" }));
		fireEvent.change(screen.getByLabelText("Nome do mundo"), {
			target: { value: "Krynn" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar mundo" }));
		});
		await waitFor(() => {
			expect(worldCombobox()?.textContent).toContain("Krynn");
		});
		expect(
			(
				screen.getByRole("button", {
					name: "Criar Campanha",
				}) as HTMLButtonElement
			).disabled,
		).toBe(false);
		expect(useRPGStore.getState().activeWorldId).toBe(ownWorld.id);
	});

	it("erro substitui a ajuda e aria-describedby aponta para o erro", async () => {
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		fireEvent.change(screen.getByLabelText(/Nome da Campanha/), {
			target: { value: "Mesa Nova" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar Campanha" }));
		});
		expect(
			screen.queryByText(/Campanhas no mesmo mundo compartilham/),
		).toBeNull();
		const trigger = worldCombobox();
		const describedBy = trigger?.getAttribute("aria-describedby") ?? "";
		const ids = describedBy.split(/\s+/).filter(Boolean);
		expect(ids).toHaveLength(1);
		expect(document.getElementById(ids[0] ?? "")?.textContent).toBe(
			"Escolha um mundo.",
		);
	});

	it("limite de campanhas é do mundo escolhido e aparece no campo", async () => {
		useRPGStore.setState({ userPlan: "free" } as never);
		renderWithToast(<CampaignForm open onOpenChange={() => {}} />);
		fireEvent.change(screen.getByLabelText(/Nome da Campanha/), {
			target: { value: "Segunda mesa" },
		});
		const trigger = worldCombobox();
		expect(trigger).not.toBeNull();
		await chooseOption(trigger as HTMLElement, "Valência");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar Campanha" }));
		});
		const invalid = worldCombobox();
		expect(invalid?.getAttribute("aria-invalid")).toBe("true");
		const describedBy = invalid?.getAttribute("aria-describedby") ?? "";
		const describedText = describedBy
			.split(" ")
			.map((id) => document.getElementById(id)?.textContent ?? "")
			.join(" ");
		expect(describedText).toContain(campaignPerWorldLimitError("free"));
		expect(createCampaign).not.toHaveBeenCalled();
	});

	it("modo editar mostra o mundo só em leitura", () => {
		renderWithToast(
			<CampaignForm open onOpenChange={() => {}} campaign={ownCampaign} />,
		);
		expect(worldCombobox()).toBeNull();
		expect(screen.getByText("Valência")).toBeTruthy();
		expect(screen.queryByRole("option", { name: "Eberron" })).toBeNull();
	});
});

describe("Mundos > Novo", () => {
	async function openSwitcher() {
		renderWithToast(<CampaignSwitcher isCollapsed={false} />);
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Trocar Mundo ou campanha" }),
			);
		});
	}

	it("não abre Nova Campanha sozinho e o toast tem a ação", async () => {
		await openSwitcher();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Novo" }));
		});
		fireEvent.change(screen.getByLabelText(/Nome do Mundo/), {
			target: { value: "Krynn" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar Mundo" }));
		});
		expect(await screen.findByText("Mundo criado")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Criar campanha neste mundo" }),
		).toBeTruthy();
		expect(screen.queryByRole("heading", { name: "Nova Campanha" })).toBeNull();
	});

	it("a ação do toast abre Nova Campanha com o mundo já escolhido", async () => {
		await openSwitcher();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Novo" }));
		});
		fireEvent.change(screen.getByLabelText(/Nome do Mundo/), {
			target: { value: "Krynn" },
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Criar Mundo" }));
		});
		await act(async () => {
			fireEvent.click(
				await screen.findByRole("button", {
					name: "Criar campanha neste mundo",
				}),
			);
		});
		expect(
			await screen.findByRole("heading", { name: "Nova Campanha" }),
		).toBeTruthy();
		expect(worldCombobox()?.textContent).toContain("Krynn");
	});

	it("Nova abre sem mundo ativo e sem pré-seleção", async () => {
		useRPGStore.setState({
			activeWorldId: null,
			activeCampaignId: null,
			campaigns: [],
		} as never);
		await openSwitcher();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Nova" }));
		});
		expect(screen.queryByText("Nenhum Mundo ativo")).toBeNull();
		expect(
			await screen.findByRole("heading", { name: "Nova Campanha" }),
		).toBeTruthy();
		expect(worldCombobox()?.textContent).toContain("Escolha um mundo");
		expect(worldCombobox()?.textContent).not.toContain("Valência");
	});
});
