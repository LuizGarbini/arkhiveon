// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import { sheetStorageKey } from "@/lib/vtt/floating-sheet";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

vi.mock("@tanstack/react-router", async (orig) => ({
	...(await orig<typeof import("@tanstack/react-router")>()),
	Link: ({
		children,
		className,
	}: {
		children: ReactNode;
		className?: string;
	}) => (
		<a href="/sheets/new" className={className}>
			{children}
		</a>
	),
}));
vi.mock("@/components/dice-roll-overlay", () => ({
	DiceRollOverlay: () => null,
}));

import { VTTSheetDrawer } from "./vtt-sheet-drawer";
import { VTTToolbar } from "./vtt-toolbar";

const CAMPAIGN = "camp-qa";

const token = (id: string, over: Partial<VTTToken> = {}): VTTToken =>
	({
		id,
		sceneId: "s1",
		name: `Token ${id}`,
		characterId: `char-${id}`,
		layer: "token",
		x: 0,
		y: 0,
		sizeCells: 1,
		rotation: 0,
		elevation: 0,
		hpCurrent: 8,
		hpMax: 10,
		conditions: [],
		auras: [],
		visionRange: 0,
		isLocked: false,
		isHidden: false,
		controlledBy: [],
		...over,
	}) as VTTToken;

const char = (id: string, name: string) =>
	({
		id: `char-${id}`,
		system: "dnd5e",
		characterName: name,
		race: "Elfa",
		class: "Maga",
		level: 3,
		strength: 8,
		dexterity: 14,
		constitution: 12,
		intelligence: 16,
		wisdom: 12,
		charisma: 10,
		speed: 9,
		health: 8,
		healthMax: 10,
	}) as unknown as Character;

function mobile(matches: boolean) {
	window.matchMedia = ((q: string) => ({
		matches,
		media: q,
		addEventListener: () => {},
		removeEventListener: () => {},
	})) as unknown as typeof window.matchMedia;
}

function mesa(opts: {
	tokens?: VTTToken[];
	characters?: Character[];
	status?: "idle" | "loading" | "ready" | "error";
	isGM?: boolean;
	open?: string[];
}) {
	useRPGStore.setState({
		characters: opts.characters ?? [char("1", "Lyra")],
		campaignLoadStatus: opts.status ?? "ready",
		activeCampaignId: CAMPAIGN,
	});
	useVTTStore.setState({
		isGM: opts.isGM ?? true,
		tokens: opts.tokens ?? [token("1")],
		showCharacterSheetId: null,
		openSheetIds: [],
		showRosterDrawer: false,
		activeTool: "pan",
	});
	for (const id of opts.open ?? ["1"])
		useVTTStore.getState().setShowCharacterSheetId(id);
	return render(
		<>
			<VTTToolbar />
			<VTTSheetDrawer onUpdateToken={vi.fn(async () => {})} />
		</>,
	);
}

const press = (el: Element, key: string) =>
	act(() => {
		fireEvent.keyDown(el, { key });
	});
const tool = () => useVTTStore.getState().activeTool;
const panels = () => screen.queryAllByTestId("vtt-floating-sheet");

beforeEach(() => {
	mobile(false);
	localStorage.clear();
	Object.assign(window, { innerWidth: 1440, innerHeight: 900 });
	HTMLElement.prototype.setPointerCapture = () => {};
	(document.activeElement as HTMLElement | null)?.blur();
});
afterEach(cleanup);

describe("Ficha flutuante: atalhos (painel tipo Figma)", () => {
	it("ficha aberta + foco na mesa: R liga a Régua, V volta", () => {
		mesa({});
		expect(panels()).toHaveLength(1);
		press(document.body, "r");
		expect(tool()).toBe("ruler");
		press(document.body, "v");
		expect(tool()).toBe("select");
		expect(document.querySelector('[data-vtt-overlay="open"]')).toBeNull();
	});

	it("foco num botão dentro da ficha: R/V/G/F não disparam", () => {
		mesa({});
		const fechar = screen.getByRole("button", { name: "Fechar ficha" });
		fechar.focus();
		for (const k of ["r", "v", "g", "f"]) press(fechar, k);
		expect(tool()).toBe("pan");
	});

	it("foco num botão de rolar (conteúdo) também bloqueia", () => {
		mesa({});
		const rolar = screen.getByRole("button", { name: /Rolar Força/ });
		rolar.focus();
		press(rolar, "r");
		expect(tool()).toBe("pan");
	});

	it("Esc com foco dentro fecha só essa ficha; com foco na mesa, nada", () => {
		mesa({
			tokens: [token("1"), token("2")],
			characters: [char("1", "Lyra"), char("2", "Borin")],
			open: ["1", "2"],
		});
		press(document.body, "Escape");
		expect(panels()).toHaveLength(2);
		const lyra = screen.getByRole("region", { name: "Ficha de Lyra" });
		const fechar = lyra.querySelector<HTMLElement>(
			'button[aria-label="Fechar ficha"]',
		);
		fechar?.focus();
		press(fechar as HTMLElement, "Escape");
		expect(useVTTStore.getState().openSheetIds).toEqual(["2"]);
	});
});

describe("Ficha flutuante: painel", () => {
	it("sem limite: a 4ª, a 5ª... ficha abrem e NENHUMA fecha as outras", () => {
		const ids = Array.from({ length: 6 }, (_, i) => String(i + 1));
		mesa({
			tokens: ids.map((i) => token(i)),
			characters: ids.map((i) => char(i, `Herói ${i}`)),
			open: ids,
		});
		expect(panels()).toHaveLength(6);
		expect(useVTTStore.getState().openSheetIds).toEqual(ids);
		expect(
			screen.getByRole("region", { name: "Ficha de Herói 1" }),
		).toBeTruthy();
	});

	it("arrastar pelo cabeçalho move, fica na viewport e é lembrado", () => {
		const view = mesa({});
		const panel = panels()[0];
		const start = { left: panel.style.left, top: panel.style.top };
		const handle = screen.getByTestId("vtt-sheet-drag-handle");
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 500,
			clientY: 200,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, { clientX: 700, clientY: 260, pointerId: 1 });
		fireEvent.pointerUp(handle, { clientX: 700, clientY: 260, pointerId: 1 });
		const moved = {
			x: Number.parseFloat(start.left) + 200,
			y: Number.parseFloat(start.top) + 60,
		};
		expect(panel.style.left).toBe(`${moved.x}px`);
		expect(panel.style.top).toBe(`${moved.y}px`);
		const saved = JSON.parse(
			localStorage.getItem(sheetStorageKey(CAMPAIGN, "char-1")) ?? "{}",
		);
		expect(saved).toMatchObject({ x: moved.x, y: moved.y });

		// Arrastar para fora: fica preso à borda.
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 300,
			clientY: 260,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, {
			clientX: -2000,
			clientY: -2000,
			pointerId: 1,
		});
		fireEvent.pointerUp(handle, { pointerId: 1 });
		expect(panel.style.left).toBe("8px");
		expect(panel.style.top).toBe("8px");

		// Reabrir: volta onde estava.
		view.unmount();
		mesa({});
		expect(panels()[0].style.left).toBe("8px");
	});

	it("redimensiona pelo canto, com mínimo", () => {
		mesa({});
		const panel = panels()[0];
		const w0 = Number.parseFloat(panel.style.width);
		const handle = screen.getByTestId("vtt-sheet-resize-handle");
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 0,
			clientY: 0,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, { clientX: -40, clientY: 30, pointerId: 1 });
		fireEvent.pointerUp(handle, { pointerId: 1 });
		expect(Number.parseFloat(panel.style.width)).toBe(w0 - 40);
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 0,
			clientY: 0,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, {
			clientX: -2000,
			clientY: -2000,
			pointerId: 1,
		});
		fireEvent.pointerUp(handle, { pointerId: 1 });
		expect(panel.style.width).toBe("320px");
		expect(panel.style.height).toBe("280px");
	});

	it("retrato/identidade da ficha e atributos em grade para rolar", () => {
		mesa({});
		const panel = screen.getByRole("region", { name: "Ficha de Lyra" });
		expect(panel.querySelector('[data-slot="sheet-header"]')).toBeNull();
		expect(
			screen.getByRole("heading", { level: 2, name: "Lyra" }),
		).toBeTruthy();
		expect(screen.getByText("Elfa · Maga · Nível 3")).toBeTruthy();
		const attrs = screen.getByRole("region", { name: "Atributos" });
		// 6 atributos para rolar e, na mesma coluna de cada um, a salvaguarda
		expect(
			within(attrs).getAllByRole("button", { name: /^Rolar (?!salvaguarda)/ }),
		).toHaveLength(6);
		expect(
			within(attrs).getAllByRole("button", { name: /^Rolar salvaguarda/ }),
		).toHaveLength(6);
		expect(panel.querySelector("[title]")).toBeNull();
		// Cabeçalho de arraste só com alça + X (padrão Figma); nome no título.
		expect(screen.getByTestId("vtt-sheet-drag-handle").textContent).toBe("");
		// retrato de 44 px (monograma quando não há imagem)
		expect(panel.querySelector('[class*="size-11"]')).toBeTruthy();
	});
});

describe("Ficha flutuante: minimizar", () => {
	it("minimiza num cartão com PV, continua aberta e restaura no tamanho guardado", () => {
		mesa({});
		const panel = panels()[0];
		const { width, left, top } = panel.style;
		fireEvent.click(screen.getByRole("button", { name: "Minimizar ficha" }));
		expect(panels()).toHaveLength(1);
		expect(panels()[0].dataset.minimized).toBe("true");
		expect(panels()[0].style.width).toBe("336px");
		expect(screen.getByText("8/10 PV")).toBeTruthy();
		expect(screen.queryByRole("region", { name: "Atributos" })).toBeNull();
		// Vai para a doca (canto inferior esquerdo), sem perder a posição da ficha.
		expect(panels()[0].style.left).toBe("72px");
		expect(panels()[0].style.top).toBe(`${900 - 16 - 60}px`);
		expect(
			JSON.parse(
				localStorage.getItem(`${sheetStorageKey(CAMPAIGN, "char-1")}:min`) ??
					"null",
			),
		).toEqual({ x: 72, y: 900 - 16 - 60 });

		fireEvent.click(screen.getByRole("button", { name: "Restaurar ficha" }));
		expect(panels()[0].dataset.minimized).toBeUndefined();
		expect(panels()[0].style.width).toBe(width);
		expect(panels()[0].style.left).toBe(left);
		expect(panels()[0].style.top).toBe(top);
		expect(screen.getByRole("region", { name: "Atributos" })).toBeTruthy();
	});

	it("reabrir lembra que estava minimizada", () => {
		const view = mesa({});
		fireEvent.click(screen.getByRole("button", { name: "Minimizar ficha" }));
		view.unmount();
		mesa({});
		expect(panels()[0].dataset.minimized).toBe("true");
	});

	it("o cartão minimizado arrasta até a borda de baixo", () => {
		mesa({});
		fireEvent.click(screen.getByRole("button", { name: "Minimizar ficha" }));
		const handle = screen.getByTestId("vtt-sheet-drag-handle");
		fireEvent.pointerDown(handle, {
			button: 0,
			clientX: 500,
			clientY: 200,
			pointerId: 1,
		});
		fireEvent.pointerMove(handle, {
			clientX: 500,
			clientY: 5000,
			pointerId: 1,
		});
		fireEvent.pointerUp(handle, { pointerId: 1 });
		expect(panels()[0].style.top).toBe(`${900 - 60 - 8}px`);
	});
});

describe("Ficha flutuante: estados", () => {
	it("carregando: skeleton", () => {
		mesa({ characters: [], status: "loading" });
		expect(screen.getByTestId("sheet-skeleton")).toBeTruthy();
	});

	it("erro: Tentar de novo recarrega", () => {
		const loadCampaigns = vi.fn(async () => {});
		useRPGStore.setState({ loadCampaigns });
		mesa({ characters: [], status: "error" });
		fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
		expect(loadCampaigns).toHaveBeenCalledTimes(1);
	});

	it("sem acesso à ficha vinculada (jogador): aviso", () => {
		mesa({ characters: [], isGM: false });
		expect(
			screen.getByText("Você não tem acesso a esta ficha nesta campanha."),
		).toBeTruthy();
	});

	it("token sem ficha: mestre vê Criar ficha; jogador não", () => {
		mesa({ tokens: [token("1", { characterId: null })] });
		expect(screen.getByRole("link", { name: "Criar ficha" })).toBeTruthy();
		cleanup();
		mesa({ tokens: [token("1", { characterId: null })], isGM: false });
		expect(screen.queryByRole("link", { name: "Criar ficha" })).toBeNull();
	});
});

describe("Ficha no celular (390): Sheet de baixo", () => {
	it("abre como Sheet sem X e fecha arrastando para baixo", async () => {
		mobile(true);
		mesa({});
		const dialog = await screen.findByRole("dialog", { name: "Ficha de Lyra" });
		expect(panels()).toHaveLength(0);
		expect(screen.queryByRole("button", { name: "Fechar ficha" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
		expect(dialog.className).not.toContain("left-[4.75rem]");
		expect(dialog.className).toContain("left-0");
		expect(dialog.className).toContain("w-full");
		expect(
			document.querySelector("[data-slot='dialog-overlay']")?.className,
		).not.toContain("left-[4.75rem]");
		expect(
			screen.queryByRole("button", { name: "Selecionar e mover vários" }),
		).toBeNull();
		const handle = screen.getByTestId("bottom-sheet-handle");
		fireEvent.pointerDown(handle, { clientY: 100, pointerId: 1 });
		fireEvent.pointerMove(handle, { clientY: 260, pointerId: 1 });
		fireEvent.pointerUp(handle, { pointerId: 1 });
		await waitFor(() =>
			expect(useVTTStore.getState().showCharacterSheetId).toBeNull(),
		);
	});
});

describe(
	"Ficha flutuante: muitas fichas minimizadas",
	{ timeout: 30000 },
	() => {
		// Tela baixa: a coluna da doca comporta 4 cartões, então 7 fichas já passam para
		// uma segunda coluna (montar 12 fichas completas no jsdom é pesado demais).
		const VIEW_H = 420;
		beforeEach(() => {
			Object.assign(window, { innerWidth: 1440, innerHeight: VIEW_H });
		});

		const SIZE = { w: 336, h: 60 };
		const many = (n: number) => {
			const ids = Array.from({ length: n }, (_, i) => String(i + 1));
			return mesa({
				tokens: ids.map((i) => token(i)),
				characters: ids.map((i) => char(i, `Herói ${i}`)),
				open: ids,
			});
		};
		const minimizeAll = () => {
			for (;;) {
				const next = screen.queryAllByRole("button", {
					name: "Minimizar ficha",
				})[0];
				if (!next) break;
				fireEvent.click(next);
			}
		};
		const positions = () =>
			panels().map((el) => ({
				x: Number.parseFloat(el.style.left),
				y: Number.parseFloat(el.style.top),
			}));

		it("dá para minimizar TODAS as fichas (7), e todas continuam abertas", () => {
			many(7);
			minimizeAll();
			expect(panels()).toHaveLength(7);
			expect(panels().every((el) => el.dataset.minimized === "true")).toBe(
				true,
			);
			expect(useVTTStore.getState().openSheetIds).toHaveLength(7);
		});

		it("nenhum cartão cai em cima de outro, nem sai da tela", () => {
			many(7);
			minimizeAll();
			const pos = positions();
			for (const p of pos) {
				expect(p.x).toBeGreaterThanOrEqual(8);
				expect(p.y).toBeGreaterThanOrEqual(8);
				expect(p.x + SIZE.w).toBeLessThanOrEqual(1440);
				expect(p.y + SIZE.h).toBeLessThanOrEqual(VIEW_H);
			}
			for (let i = 0; i < pos.length; i++) {
				for (let j = i + 1; j < pos.length; j++) {
					const a = pos[i] as { x: number; y: number };
					const b = pos[j] as { x: number; y: number };
					const overlap =
						Math.abs(a.x - b.x) < SIZE.w - 4 &&
						Math.abs(a.y - b.y) < SIZE.h - 4;
					expect(overlap, `cartões ${i + 1} e ${j + 1} se sobrepõem`).toBe(
						false,
					);
				}
			}
		});

		it("passando da coluna cheia, segue numa nova coluna à direita", () => {
			many(7);
			minimizeAll();
			const xs = new Set(positions().map((p) => p.x));
			expect(xs.size).toBe(2);
			expect([...xs].sort((a, b) => a - b)).toEqual([72, 72 + 336 + 8]);
		});

		it("o cenário do pedido: minimizar 3 e abrir mais NÃO faz as minimizadas sumirem", () => {
			const ids = ["1", "2", "3", "4", "5"];
			mesa({
				tokens: ids.map((i) => token(i)),
				characters: ids.map((i) => char(i, `Herói ${i}`)),
				open: ["1", "2", "3"],
			});
			minimizeAll();
			expect(panels().every((el) => el.dataset.minimized === "true")).toBe(
				true,
			);
			act(() => {
				useVTTStore.getState().setShowCharacterSheetId("4");
				useVTTStore.getState().setShowCharacterSheetId("5");
			});
			expect(useVTTStore.getState().openSheetIds).toEqual(ids);
			expect(panels()).toHaveLength(5);
			expect(
				panels().filter((el) => el.dataset.minimized === "true"),
			).toHaveLength(3);
		});

		it("restaurar uma e minimizar de novo usa uma vaga livre (não cai em outra)", () => {
			many(4);
			minimizeAll();
			const before = positions();
			// restaura a segunda, minimiza outra vez: tem de ocupar uma vaga que está livre
			fireEvent.click(
				screen.getAllByRole("button", {
					name: "Restaurar ficha",
				})[1] as HTMLElement,
			);
			fireEvent.click(screen.getByRole("button", { name: "Minimizar ficha" }));
			const after = positions();
			for (let i = 0; i < after.length; i++) {
				for (let j = i + 1; j < after.length; j++) {
					const a = after[i] as { x: number; y: number };
					const b = after[j] as { x: number; y: number };
					expect(
						Math.abs(a.x - b.x) < SIZE.w - 4 &&
							Math.abs(a.y - b.y) < SIZE.h - 4,
					).toBe(false);
				}
			}
			expect(after).toHaveLength(before.length);
		});

		it("minimizar FORA de ordem (a 3ª e depois a 1ª) não coloca uma em cima da outra", () => {
			many(3);
			fireEvent.click(
				screen.getAllByRole("button", {
					name: "Minimizar ficha",
				})[2] as HTMLElement,
			);
			fireEvent.click(
				screen.getAllByRole("button", {
					name: "Minimizar ficha",
				})[0] as HTMLElement,
			);
			const minimized = panels().filter(
				(el) => el.dataset.minimized === "true",
			);
			expect(minimized).toHaveLength(2);
			const [a, b] = minimized.map((el) => ({
				x: Number.parseFloat(el.style.left),
				y: Number.parseFloat(el.style.top),
			})) as [{ x: number; y: number }, { x: number; y: number }];
			expect(
				Math.abs(a.x - b.x) < SIZE.w - 4 && Math.abs(a.y - b.y) < SIZE.h - 4,
			).toBe(false);
		});

		it("uma ficha aberta aparece antes de minimizar as outras sem atrapalhar a doca", () => {
			many(3);
			// minimiza só a última; as outras ficam abertas
			const buttons = screen.getAllByRole("button", {
				name: "Minimizar ficha",
			});
			fireEvent.click(buttons[2] as HTMLElement);
			const minimized = panels().filter(
				(el) => el.dataset.minimized === "true",
			);
			expect(minimized).toHaveLength(1);
			// vai para a PRIMEIRA vaga da doca (não para a vaga 2 só por ser a 3ª ficha)
			expect(minimized[0]?.style.top).toBe(`${VIEW_H - 16 - 60}px`);
		});
	},
);
