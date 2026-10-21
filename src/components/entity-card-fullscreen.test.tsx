// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Character, Item, Npc } from "@/lib/store";

const navigateSpy = vi.fn();
const linkClick = vi.fn();
const resolveItem = vi.fn<() => string>();
const resolveCharacter = vi.fn<() => string>();

vi.mock("@tanstack/react-router", () => ({
	useNavigate: () => navigateSpy,
	Link: ({
		children,
		className,
		"aria-label": ariaLabel,
	}: {
		children?: ReactNode;
		className?: string;
		"aria-label"?: string;
	}) => (
		// biome-ignore lint/a11y/useValidAnchor: stub do Link do router
		<a
			href="#card"
			className={className}
			aria-label={ariaLabel}
			onClick={(event) => {
				event.preventDefault();
				linkClick();
			}}
		>
			{children}
		</a>
	),
}));

vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

vi.mock("@/lib/character-images", () => ({
	resolveItemImageUrl: () => resolveItem(),
	resolveCharacterImageUrl: () => resolveCharacter(),
}));

vi.mock("@/lib/character-presets", () => ({
	getCharacterPresetUrl: () => "/presets/guerreiro.png",
}));

vi.mock("@/lib/store", () => {
	const state = {
		removeItem: vi.fn(),
		removeNpc: vi.fn(),
		removeCharacter: vi.fn(),
		updateCharacter: vi.fn(),
		campaigns: [],
		activeCampaignId: null,
		locations: [],
		factions: [],
		imageAssets: [],
	};
	return {
		useRPGStore: (selector: (s: typeof state) => unknown) => selector(state),
		useActiveCampaignRole: () => "viewer",
		useIsWorldStaff: () => false,
		useImageAssetLookup: () => new Map(),
		formatModifier: (n: number) => (n >= 0 ? `+${n}` : `${n}`),
		systemLabel: () => "D&D 5e",
	};
});

const { NpcCard } = await import("./npc-card");
const { ItemCard } = await import("./item-card");
const { CharacterCard } = await import("./character-card");

const SRC = "https://cdn.test/elbereth.png";

beforeEach(() => {
	navigateSpy.mockReset();
	linkClick.mockReset();
	resolveItem.mockReset();
	resolveCharacter.mockReset();
});
afterEach(cleanup);

function npc(imageUrl?: string): Npc {
	return { id: "n1", name: "Elbereth", imageUrl } as unknown as Npc;
}

function trigger(name = "Elbereth") {
	return screen.queryByRole("button", {
		name: `Ver imagem de ${name} em tela cheia`,
	});
}

describe("cards: gatilho de tela cheia", () => {
	it("gatilho abre o viewer sem navegar", async () => {
		render(<NpcCard npc={npc(SRC)} />);
		const button = trigger();
		expect(button).not.toBeNull();
		await act(async () => {
			fireEvent.click(button as HTMLElement);
		});
		expect(
			await screen.findByRole("dialog", { name: "Elbereth" }),
		).toBeTruthy();
		expect(linkClick).not.toHaveBeenCalled();
		expect(navigateSpy).not.toHaveBeenCalled();
	});

	it("clique no card (Link) continua navegando e o gatilho não fica dentro do link", () => {
		render(<NpcCard npc={npc(SRC)} />);
		const link = screen.getByRole("link");
		expect(link.contains(trigger())).toBe(false);
		fireEvent.click(link);
		expect(linkClick).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("dialog")).toBeNull();
	});

	it("teclado: Tab chega no gatilho e Enter abre", async () => {
		render(<NpcCard npc={npc(SRC)} />);
		const button = trigger() as HTMLButtonElement;
		expect(button.tagName).toBe("BUTTON");
		expect(button.getAttribute("type")).toBe("button");
		expect(button.tabIndex).toBe(0);
		button.focus();
		expect(document.activeElement).toBe(button);
		// Enter num <button> nativo dispara click.
		await act(async () => {
			fireEvent.keyDown(button, { key: "Enter" });
			fireEvent.click(button);
		});
		expect(
			await screen.findByRole("dialog", { name: "Elbereth" }),
		).toBeTruthy();
		expect(linkClick).not.toHaveBeenCalled();
	});

	it("título reserva espaço (pr-28) para os ícones do canto", () => {
		render(<NpcCard npc={npc(SRC)} />);
		const title = screen.getByRole("heading", { name: "Elbereth" });
		expect(title.parentElement?.className).toContain("pr-28");
	});

	it("sem imagem não há gatilho", () => {
		render(<NpcCard npc={npc(undefined)} />);
		expect(trigger()).toBeNull();
	});

	it("item com imagem privada sem URL resolvida não ganha gatilho", () => {
		resolveItem.mockReturnValue("");
		render(
			<ItemCard
				item={
					{ id: "i1", name: "Elbereth", rarity: "comum" } as unknown as Item
				}
			/>,
		);
		expect(trigger()).toBeNull();
	});

	it("item com URL resolvida ganha gatilho", () => {
		resolveItem.mockReturnValue(SRC);
		render(
			<ItemCard
				item={
					{ id: "i1", name: "Elbereth", rarity: "comum" } as unknown as Item
				}
			/>,
		);
		expect(trigger()).not.toBeNull();
	});

	it("ficha só com imagem de preset (classe) não ganha gatilho", () => {
		resolveCharacter.mockReturnValue("");
		render(
			<CharacterCard
				character={
					{
						id: "c1",
						characterName: "Elbereth",
						class: "Guerreiro",
						level: 1,
						system: "dnd5e",
					} as unknown as Character
				}
			/>,
		);
		expect(trigger()).toBeNull();
	});

	it("ficha com imagem própria ganha gatilho", () => {
		resolveCharacter.mockReturnValue(SRC);
		render(
			<CharacterCard
				character={
					{
						id: "c1",
						characterName: "Elbereth",
						class: "Guerreiro",
						level: 1,
						system: "dnd5e",
					} as unknown as Character
				}
			/>,
		);
		expect(trigger()).not.toBeNull();
	});
});
