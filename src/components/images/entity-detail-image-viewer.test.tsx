// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import type { ComponentType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SRC = "https://cdn.test/retrato.webp";

const ctx = vi.hoisted(() => ({
	isStaff: false,
	canManageItem: false,
	params: {} as Record<string, string>,
	state: {} as Record<string, unknown>,
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: Record<string, unknown>) => ({
		...options,
		useParams: () => ctx.params,
		useSearch: () => ({ edit: false }),
	}),
	Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
	useNavigate: () => vi.fn(),
}));

vi.mock("@/lib/store", () => ({
	useRPGStore: (selector: (state: Record<string, unknown>) => unknown) =>
		selector(ctx.state),
	useIsWorldStaff: () => ctx.isStaff,
	useActiveCampaignRole: () => (ctx.isStaff ? "owner" : "editor"),
	useActiveCampaignId: () => "camp-qa",
	useActiveCampaign: () => ({ id: "camp-qa", name: "QA Designer (teste)" }),
	useImageAssetLookup: () => new Map(),
}));

vi.mock("@/lib/worldbuilding/hooks", () => ({
	useActiveCampaignContext: () => ({ id: "camp-qa" }),
	useFactionReputationForActiveCampaign: () => undefined,
	useWorldCampaigns: () => [],
}));
vi.mock("@/lib/worldbuilding/visibility", () => ({
	canViewScopedContent: () => true,
}));
vi.mock("@/lib/worldbuilding/item-ownership", () => ({
	canManageOwnItem: () => ctx.canManageItem,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/lib/character-images", () => ({
	resolveItemImageUrl: (item: { imageUrl?: string }) => item.imageUrl ?? "",
}));
vi.mock("@/components/entity-image-dialog", () => ({
	EntityImageDialog: ({ open }: { open: boolean }) =>
		open ? <div data-testid="edit-image-dialog" /> : null,
}));
vi.mock("@/components/entity-links", () => ({ EntityLinkChips: () => null }));
vi.mock("@/components/item-form", () => ({ ItemEditButton: () => null }));
vi.mock("@/components/lore-form", () => ({ LoreEditButton: () => null }));
vi.mock("@/components/location-form", () => ({
	LocationEditButton: () => null,
}));
vi.mock("@/components/faction-form", () => ({
	FactionEditButton: () => null,
}));

const base = {
	id: "e1",
	campaignId: "camp-qa",
	tags: "",
	description: "",
	notes: "",
};

type Case = {
	label: string;
	name: string;
	param: string;
	stateKey: string;
	extra: Record<string, unknown>;
	load: () => Promise<{ Route: unknown }>;
	staff: () => void;
};

const cases: Case[] = [
	{
		label: "Item",
		name: "Lâmina Rúnica",
		param: "itemId",
		stateKey: "items",
		extra: { name: "Lâmina Rúnica" },
		load: () => import("@/routes/items/$itemId"),
		staff: () => {
			ctx.canManageItem = true;
		},
	},
	{
		label: "Lore",
		name: "A Queda de Netheril",
		param: "loreId",
		stateKey: "lores",
		extra: { title: "A Queda de Netheril", importance: "major" },
		load: () => import("@/routes/lore/$loreId"),
		staff: () => {
			ctx.isStaff = true;
		},
	},
	{
		label: "Local",
		name: "Águas Profundas",
		param: "locationId",
		stateKey: "locations",
		extra: { name: "Águas Profundas" },
		load: () => import("@/routes/locations/$locationId"),
		staff: () => {
			ctx.isStaff = true;
		},
	},
	{
		label: "Facção",
		name: "Harpistas",
		param: "factionId",
		stateKey: "factions",
		extra: { name: "Harpistas" },
		load: () => import("@/routes/factions/$factionId"),
		staff: () => {
			ctx.isStaff = true;
		},
	},
];

function setEntity(c: Case, imageUrl: string) {
	ctx.params = { [c.param]: "e1" };
	ctx.state = {
		isLoadingRemote: false,
		campaigns: [],
		factionReputations: [],
		items: [],
		lores: [],
		locations: [],
		factions: [],
		[c.stateKey]: [{ ...base, ...c.extra, imageUrl }],
	};
}

async function renderPage(c: Case) {
	const mod = (await c.load()) as { Route: { component: ComponentType } };
	const Page = mod.Route.component;
	render(<Page />);
}

beforeEach(() => {
	ctx.isStaff = false;
	ctx.canManageItem = false;
});
afterEach(cleanup);

describe.each(cases)("tela cheia no detalhe de $label", (c) => {
	it("quem não edita vê a imagem em tela cheia, sem 'Trocar imagem'", async () => {
		setEntity(c, SRC);
		await renderPage(c);
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", {
					name: `Ver imagem de ${c.name} em tela cheia`,
				}),
			);
		});
		expect(await screen.findByRole("dialog", { name: c.name })).toBeTruthy();
		expect(screen.queryByRole("button", { name: /Trocar imagem/ })).toBeNull();
		expect(screen.queryByRole("button", { name: /Editar imagem/ })).toBeNull();
	});

	it("quem edita abre a tela cheia e 'Trocar imagem' abre o editor", async () => {
		c.staff();
		setEntity(c, SRC);
		await renderPage(c);
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", {
					name: `Ver imagem de ${c.name} em tela cheia`,
				}),
			);
		});
		await screen.findByRole("dialog", { name: c.name });
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: /Trocar imagem/ }));
		});
		expect(await screen.findByTestId("edit-image-dialog")).toBeTruthy();
	});

	it("sem imagem: sem gatilho de tela cheia; câmera só para quem edita", async () => {
		setEntity(c, "");
		await renderPage(c);
		expect(screen.queryByRole("button", { name: /em tela cheia/ })).toBeNull();
		expect(screen.queryByRole("button", { name: /Editar imagem/ })).toBeNull();
		cleanup();
		c.staff();
		await renderPage(c);
		expect(screen.getByRole("button", { name: /Editar imagem/ })).toBeTruthy();
	});
});
