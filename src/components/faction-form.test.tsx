// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { useRPGStore } from "@/lib/store";
import { FactionForm } from "./faction-form";

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

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => vi.fn(),
}));

vi.mock("./image-uploader", () => ({
	ImageUploader: () => <div data-testid="image-uploader" />,
}));

const CAMPAIGN_ID = "11111111-1111-4111-8111-111111111111";
const WORLD_ID = "22222222-2222-4222-8222-222222222222";

async function pick(trigger: HTMLElement, optionName: string) {
	await act(async () => {
		fireEvent.click(trigger);
	});
	const option = await screen.findByRole("option", { name: optionName });
	await act(async () => {
		fireEvent.mouseMove(option);
	});
	await act(async () => {
		fireEvent.click(option);
	});
}

function seedStaff(addFaction: (data: Record<string, unknown>) => unknown) {
	useRPGStore.setState({
		hasLoadedCampaigns: true,
		campaignLoadStatus: "ready",
		isLoadingRemote: false,
		activeCampaignId: CAMPAIGN_ID,
		campaigns: [
			{
				id: CAMPAIGN_ID,
				name: "A Forja dos Deuses",
				description: "Preview",
				ownerId: "preview-gm-user",
				worldId: WORLD_ID,
				system: "dnd5e",
				myRole: "owner",
				createdAt: 1,
			},
		],
		addFaction: addFaction as never,
		syncError: null,
	} as never);
}

async function openNewForm() {
	render(
		<ToastProvider>
			<FactionForm />
		</ToastProvider>,
	);
	await act(async () => {
		fireEvent.click(
			screen.getByRole("button", { name: "Novo Patrono / Organização" }),
		);
	});
	await screen.findByRole("dialog");
}

afterEach(() => {
	cleanup();
});

describe("FactionForm: tipo de patrono / linhagem", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("numa facção nova mostra o placeholder e salva sem patronType quando nada foi escolhido", async () => {
		const addFaction = vi.fn((data) => ({
			id: "f-new",
			createdAt: 1,
			worldId: WORLD_ID,
			...data,
		}));
		seedStaff(addFaction);
		await openNewForm();

		expect(document.querySelectorAll("select")).toHaveLength(0);
		expect(document.body.textContent ?? "").not.toMatch(
			/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u,
		);

		await pick(
			screen.getByRole("combobox", { name: "Categoria de Organização" }),
			"Patrono de Grupo (Group Patron)",
		);

		const typeTrigger = screen.getByRole("combobox", {
			name: "Tipo de Patrono (D&D 5e / 2024)",
		});
		expect(typeTrigger.textContent).toContain("Selecione o tipo de patrono");
		expect(typeTrigger.textContent).not.toContain("Dragão Ancião");

		await act(async () => {
			fireEvent.change(screen.getByPlaceholderText(/Dragão Ignis/i), {
				target: { value: "Ordem do Sol" },
			});
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Salvar Registro" }));
		});

		expect(addFaction).toHaveBeenCalledTimes(1);
		expect(addFaction.mock.calls[0][0]).toMatchObject({
			name: "Ordem do Sol",
			kind: "patron",
			patronType: "",
		});
	});

	it("trocar de patrono para família lendária limpa o valor e não o reexibe", async () => {
		const addFaction = vi.fn((data) => ({
			id: "f-new",
			createdAt: 1,
			worldId: WORLD_ID,
			...data,
		}));
		seedStaff(addFaction);
		await openNewForm();

		await pick(
			screen.getByRole("combobox", { name: "Categoria de Organização" }),
			"Patrono de Grupo (Group Patron)",
		);
		await pick(
			screen.getByRole("combobox", { name: "Tipo de Patrono (D&D 5e / 2024)" }),
			"Dragão Ancião",
		);
		expect(
			screen.getByRole("combobox", { name: "Tipo de Patrono (D&D 5e / 2024)" })
				.textContent,
		).toContain("Dragão Ancião");

		await pick(
			screen.getByRole("combobox", { name: "Categoria de Organização" }),
			"Família Lendária / Linhagem Mítica",
		);

		const lineage = screen.getByRole("combobox", {
			name: "Origem da Linhagem / Sangue Ancestral",
		});
		expect(lineage.textContent).toContain("Selecione a origem da linhagem");
		expect(lineage.textContent).not.toContain("Dragão Ancião");
		expect(lineage.textContent).not.toContain("Linhagem Dracônica");

		await act(async () => {
			fireEvent.change(screen.getByPlaceholderText(/Família Pendragon/i), {
				target: { value: "Casa Ember" },
			});
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Salvar Registro" }));
		});

		expect(addFaction).toHaveBeenCalledTimes(1);
		expect(addFaction.mock.calls[0][0]).toMatchObject({
			name: "Casa Ember",
			kind: "legendary_family",
			patronType: "",
		});
	});

	it("salva o tipo exatamente quando o usuário escolhe uma opção", async () => {
		const addFaction = vi.fn((data) => ({
			id: "f-new",
			createdAt: 1,
			worldId: WORLD_ID,
			...data,
		}));
		seedStaff(addFaction);
		await openNewForm();

		await pick(
			screen.getByRole("combobox", { name: "Categoria de Organização" }),
			"Patrono de Grupo (Group Patron)",
		);
		await pick(
			screen.getByRole("combobox", { name: "Tipo de Patrono (D&D 5e / 2024)" }),
			"Dragão Ancião",
		);
		await act(async () => {
			fireEvent.change(screen.getByPlaceholderText(/Dragão Ignis/i), {
				target: { value: "Ignis" },
			});
		});
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Salvar Registro" }));
		});

		expect(addFaction.mock.calls[0][0]).toMatchObject({
			name: "Ignis",
			kind: "patron",
			patronType: "Dragão Ancião",
		});
	});
});
