// @vitest-environment jsdom
import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Item } from "@/lib/store";
import { itemDefaults, useRPGStore } from "@/lib/store";

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
vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

import { ItemEditButton, ItemForm } from "./item-form";

const addItem = vi.fn((_payload: unknown) => ({ id: "created-1" }) as Item);
const updateItem = vi.fn((_id: string, _patch: unknown) => undefined);

afterEach(cleanup);

beforeEach(() => {
	addItem.mockClear();
	updateItem.mockClear();
	useRPGStore.setState({
		campaigns: [
			{
				id: "camp-1",
				name: "Mesa",
				ownerId: "u1",
				myRole: "owner",
				system: "dnd5e",
			},
		] as never,
		activeCampaignId: "camp-1",
		items: [],
		addItem: addItem as never,
		updateItem: updateItem as never,
		syncError: null,
	} as never);
});

describe("ItemForm (cadastro rico)", () => {
	it("Criar fica desabilitado sem nome e o nome aparece ao vivo na lateral", () => {
		render(<ItemForm />);
		fireEvent.click(screen.getByRole("button", { name: /Novo Item/i }));
		const submit = screen.getByRole("button", { name: /Criar arma/i });
		expect((submit as HTMLButtonElement).disabled).toBe(true);
		expect(screen.getAllByText("Dê um nome para criar a arma.").length).toBe(1);
		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Lâmina da Aurora" },
		});
		expect((submit as HTMLButtonElement).disabled).toBe(false);
		expect(screen.getByTestId("item-live-name").textContent).toBe(
			"Lâmina da Aurora",
		);
	});

	it("troca de aba mostra o painel certo e salvar envia a arma", async () => {
		render(<ItemForm />);
		fireEvent.click(screen.getByRole("button", { name: /Novo Item/i }));
		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Lâmina da Aurora" },
		});
		const nav = screen.getByRole("navigation", { name: "Seções do item" });
		fireEvent.click(within(nav).getByRole("button", { name: /Ataque/ }));
		expect(screen.getByTestId("item-tab-mechanics")).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Dados"), {
			target: { value: "1d8" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Versátil/ }));
		fireEvent.change(screen.getByLabelText(/duas mãos/), {
			target: { value: "1d10" },
		});
		fireEvent.click(screen.getByRole("button", { name: /Criar arma/i }));
		await vi.waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
		const payload = addItem.mock.calls[0][0] as unknown as Item;
		expect(payload.name).toBe("Lâmina da Aurora");
		expect(payload.type).toBe("Arma");
		expect(payload.weapon?.damageDice).toBe("1d8");
		expect(payload.weapon?.properties).toEqual(["versatile"]);
		expect(payload.weapon?.versatileDice).toBe("1d10");
		expect(payload.origin).toEqual({ kind: "blank" });
	});

	it("Atributo é um Select com os 6 atributos (sem Acuidade) e salva Carisma", async () => {
		render(<ItemForm />);
		fireEvent.click(screen.getByRole("button", { name: /Novo Item/i }));
		fireEvent.change(screen.getByLabelText("Nome"), {
			target: { value: "Lâmina do Pacto" },
		});
		const nav = screen.getByRole("navigation", { name: "Seções do item" });
		fireEvent.click(within(nav).getByRole("button", { name: /Ataque/ }));
		const select = screen.getByRole("combobox", {
			name: "Atributo de ataque",
		}) as HTMLSelectElement;
		expect(select.tagName).toBe("SELECT");
		expect(Array.from(select.options).map((o) => o.textContent)).toEqual([
			"Força",
			"Destreza",
			"Constituição",
			"Inteligência",
			"Sabedoria",
			"Carisma",
		]);
		expect(screen.getByRole("button", { name: "Acuidade" })).toBeTruthy();
		fireEvent.change(screen.getByLabelText("Dados"), {
			target: { value: "1d8" },
		});
		fireEvent.change(select, { target: { value: "charisma" } });
		fireEvent.click(screen.getByRole("button", { name: /Criar arma/i }));
		await vi.waitFor(() => expect(addItem).toHaveBeenCalledTimes(1));
		const payload = addItem.mock.calls[0][0] as unknown as Item;
		expect(payload.weapon?.ability).toBe("charisma");
	});

	it("arma antiga com Acuidade abre como Destreza + chip Acuidade e salva dexterity", async () => {
		const legacy: Item = {
			...itemDefaults,
			id: "rap-1",
			createdAt: 1,
			createdBy: "u1",
			name: "Rapieira",
			type: "Arma",
			campaignIds: ["camp-1"],
			weapon: {
				damageDice: "1d8",
				damageType: "piercing",
				ability: "finesse" as never,
				weaponCategory: "martial",
				properties: [],
				customProperties: [],
				extraDamage: [],
			},
		};
		render(<ItemEditButton item={legacy} open onOpenChange={() => {}} />);
		const nav = screen.getByRole("navigation", { name: "Seções do item" });
		fireEvent.click(within(nav).getByRole("button", { name: /Ataque/ }));
		const select = screen.getByRole("combobox", {
			name: "Atributo de ataque",
		}) as HTMLSelectElement;
		expect(select.value).toBe("dexterity");
		expect(
			screen
				.getByRole("button", { name: "Acuidade" })
				.getAttribute("aria-pressed"),
		).toBe("true");
		fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }));
		await vi.waitFor(() => expect(updateItem).toHaveBeenCalledTimes(1));
		const [, patch] = updateItem.mock.calls[0] as [string, Item];
		expect(patch.weapon?.ability).toBe("dexterity");
		expect(patch.weapon?.properties).toEqual(["finesse"]);
	});

	it("dado inválido mostra erro e não salva", async () => {
		render(<ItemForm />);
		fireEvent.click(screen.getByRole("button", { name: /Novo Item/i }));
		fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "X" } });
		const nav = screen.getByRole("navigation", { name: "Seções do item" });
		fireEvent.click(within(nav).getByRole("button", { name: /Ataque/ }));
		fireEvent.change(screen.getByLabelText("Dados"), {
			target: { value: "abc" },
		});
		expect(screen.getByText("Use dados no formato 1d8 ou 2d6.")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: /Criar arma/i }));
		await new Promise((r) => setTimeout(r, 20));
		expect(addItem).not.toHaveBeenCalled();
	});

	it("item antigo (texto livre) abre e salva sem perder campos", async () => {
		const legacy: Item = {
			...itemDefaults,
			id: "old-1",
			createdAt: 1,
			createdBy: "u1",
			name: "Anel velho",
			type: "Anel",
			owner: "Thalia",
			attunedTo: "Thalia",
			charges: "3/7",
			equipped: true,
			stats: "+1 em CA",
			properties: "Mágico",
			visibility: "public",
			publicationScope: "global",
			campaignIds: ["camp-1"],
			entityLinks: [
				{ id: "l1", entityKind: "npc", entityId: "n1", relation: "x" },
			] as never,
		};
		render(<ItemEditButton item={legacy} open onOpenChange={() => {}} />);
		expect(screen.getByText("Editar item")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: /Salvar alterações/i }));
		await vi.waitFor(() => expect(updateItem).toHaveBeenCalledTimes(1));
		const [id, patch] = updateItem.mock.calls[0] as [string, Item];
		expect(id).toBe("old-1");
		expect(patch).toMatchObject({
			owner: "Thalia",
			attunedTo: "Thalia",
			charges: "3/7",
			equipped: true,
			stats: "+1 em CA",
			properties: "Mágico",
			visibility: "public",
			publicationScope: "global",
		});
		expect(patch.entityLinks).toHaveLength(1);
		expect(patch.weapon).toBeUndefined();
	});
});
