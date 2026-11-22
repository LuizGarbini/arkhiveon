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
import { isVttShortcutBlocked } from "@/lib/vtt/shortcut-guard";
import { tokenClipboardAction } from "@/lib/vtt/token-clipboard";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

vi.mock("@/lib/auth", () => ({ useAuth: () => ({ session: null }) }));
vi.mock("@/components/ui/toast", () => ({
	useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));
vi.mock("@tanstack/react-router", () => ({
	Link: ({ children }: { children: ReactNode }) => <a href="/">{children}</a>,
}));

import { VTTFogControls } from "./vtt-fog-controls";
import { VTTGridSettings } from "./vtt-grid-settings";
import { VTTRosterDrawer } from "./vtt-roster-drawer";
import { VTTToolbar } from "./vtt-toolbar";

const scene = {
	id: "scene-1",
	campaignId: "camp-1",
	name: "Caverna",
	mapImageUrl: "https://cdn.test/mapa.webp",
	gridType: "square",
	gridSize: 70,
	gridColor: "#ffffff",
	gridOpacity: 0.2,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	width: 2000,
	height: 1400,
	fogEnabled: false,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
} as VTTScene;

function renderMesa() {
	render(
		<>
			<VTTToolbar />
			<VTTRosterDrawer
				scene={scene}
				onSpawnToken={vi.fn(async () => {})}
				onFocusPoint={vi.fn()}
				onSetSceneMap={vi.fn(async () => {})}
				onRemoveToken={vi.fn(async () => true)}
			/>
		</>,
	);
}

const tool = () => useVTTStore.getState().activeTool;
const press = (el: Element, key: string) =>
	act(() => {
		fireEvent.keyDown(el, { key });
	});

beforeEach(() => {
	useVTTStore.setState({
		isGM: true,
		showRosterDrawer: true,
		activeTool: "select",
		showFogControls: false,
	});
});
afterEach(cleanup);

describe("atalhos do VTT respeitam o foco", () => {
	it("digitar G/V/R/F na busca da Biblioteca não troca a ferramenta", () => {
		renderMesa();
		useVTTStore.setState({ activeTool: "pan" });
		const busca = screen.getByPlaceholderText("Buscar na biblioteca…");
		busca.focus();
		for (const k of ["g", "v", "r", "f", "G"]) press(busca, k);
		expect(tool()).toBe("pan");
		expect(useVTTStore.getState().showFogControls).toBe(false);
	});

	it("com a tela cheia do mapa aberta, V/R/F/G não disparam", async () => {
		renderMesa();
		fireEvent.click(screen.getByRole("button", { name: "Mapa" }));
		fireEvent.click(
			screen.getByRole("button", { name: "Ver mapa em tela cheia" }),
		);
		const dialog = await screen.findByRole("dialog");
		useVTTStore.setState({ activeTool: "pan" });
		for (const k of ["v", "r", "f", "g"]) {
			press(document.activeElement ?? dialog, k);
			press(dialog, k);
		}
		expect(tool()).toBe("pan");
		expect(useVTTStore.getState().showFogControls).toBe(false);
		act(() => {
			fireEvent.keyDown(dialog, { key: "Escape" });
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		// O Esc fechou só a tela cheia; a Biblioteca continua aberta.
		expect(useVTTStore.getState().showRosterDrawer).toBe(true);
	});

	it("abas da Biblioteca focadas: G/V/R/F não disparam", () => {
		renderMesa();
		useVTTStore.setState({ activeTool: "pan" });
		for (const aba of ["Na cena", "Mapa"]) {
			const botao = screen.getByRole("button", { name: aba });
			botao.focus();
			expect(document.activeElement).toBe(botao);
			for (const k of ["g", "v", "r", "f"]) press(botao, k);
		}
		expect(tool()).toBe("pan");
		expect(useVTTStore.getState().showFogControls).toBe(false);
	});

	it("Biblioteca aberta com foco no body: nenhum atalho dispara", () => {
		renderMesa();
		useVTTStore.setState({ activeTool: "pan" });
		(document.activeElement as HTMLElement | null)?.blur();
		expect(document.activeElement).toBe(document.body);
		for (const k of ["g", "v", "r", "f", "t", "h"]) press(document.body, k);
		expect(tool()).toBe("pan");
	});

	it("Biblioteca aberta: Esc fecha o painel e depois R liga a Régua", () => {
		renderMesa();
		screen.getByRole("button", { name: "Fichas" }).focus();
		press(document.activeElement ?? document.body, "Escape");
		expect(useVTTStore.getState().showRosterDrawer).toBe(false);
		expect(
			screen.queryByRole("complementary", { name: "Biblioteca da mesa" }),
		).toBeNull();
		press(document.body, "r");
		expect(tool()).toBe("ruler");
	});

	it("Esc com foco no body também fecha a Biblioteca", () => {
		renderMesa();
		press(document.body, "Escape");
		expect(useVTTStore.getState().showRosterDrawer).toBe(false);
	});

	it("painel de grade: digitar no campo Distância por célula não dispara atalho", () => {
		useVTTStore.setState({
			showRosterDrawer: false,
			showGridSettings: true,
			scenes: [scene],
			activeSceneId: scene.id,
			activeTool: "pan",
		});
		render(
			<>
				<VTTToolbar />
				<VTTGridSettings onUpdateSceneSettings={vi.fn()} />
			</>,
		);
		const escala = screen.getByLabelText("Distância por célula");
		escala.focus();
		for (const k of ["g", "v", "r", "f", "t"]) press(escala, k);
		expect(tool()).toBe("pan");
		// Painel de grade não bloqueia atalhos fora do campo (decisão do Chefe).
		escala.blur();
		press(document.body, "r");
		expect(tool()).toBe("ruler");
	});

	it("painel de névoa: não tem campo de texto e não bloqueia atalhos", () => {
		useVTTStore.setState({
			showRosterDrawer: false,
			showFogControls: true,
			activeTool: "fog",
		});
		const { container } = render(
			<>
				<VTTToolbar />
				<VTTFogControls
					scene={scene}
					onUpdateScene={vi.fn(async () => {})}
					onClearFog={vi.fn()}
				/>
			</>,
		);
		expect(
			container.querySelector(
				'input:not([type="range"]):not([type="checkbox"]), textarea, [contenteditable="true"]',
			),
		).toBeNull();
		press(document.body, "r");
		expect(tool()).toBe("ruler");
	});

	it("com tudo fechado os atalhos funcionam", () => {
		renderMesa();
		press(document.body, "r");
		expect(tool()).toBe("select");
		act(() => {
			useVTTStore.setState({ showRosterDrawer: false });
		});
		expect(
			screen.queryByRole("complementary", { name: "Biblioteca da mesa" }),
		).toBeNull();
		press(document.body, "r");
		expect(tool()).toBe("ruler");
		press(document.body, "g");
		expect(tool()).toBe("ping");
		press(document.body, "f");
		expect(tool()).toBe("fog");
		expect(useVTTStore.getState().showFogControls).toBe(true);
		press(document.body, "v");
		expect(tool()).toBe("select");
	});
});

describe("isVttShortcutBlocked", () => {
	const ev = (target: Element) => {
		const e = new KeyboardEvent("keydown", { key: "g", bubbles: true });
		Object.defineProperty(e, "target", { value: target });
		return e;
	};
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it.each([
		["textarea", "<textarea></textarea>"],
		["select", "<select><option>a</option></select>"],
		["contenteditable", '<div contenteditable="true"><span>x</span></div>'],
		["role=dialog", '<div role="dialog"><button>ok</button></div>'],
		["dialog", "<dialog open><button>ok</button></dialog>"],
	])("bloqueia em %s", (_n, html) => {
		document.body.innerHTML = html;
		const el =
			document.body.querySelector("span, button, textarea, select") ??
			document.body.firstElementChild;
		if (!el) throw new Error("sem alvo");
		expect(isVttShortcutBlocked(ev(el))).toBe(true);
	});

	it("bloqueia em qualquer foco com painel marcado aberto", () => {
		document.body.innerHTML =
			'<aside data-vtt-overlay="open"></aside><button>Mapa</button>';
		const el = document.body.querySelector("button");
		if (!el) throw new Error("sem alvo");
		expect(isVttShortcutBlocked(ev(el))).toBe(true);
		expect(isVttShortcutBlocked(ev(document.body))).toBe(true);
	});

	it("não bloqueia num botão comum sem overlay aberto", () => {
		document.body.innerHTML = "<button>Mapa</button>";
		const el = document.body.firstElementChild;
		if (!el) throw new Error("sem alvo");
		expect(isVttShortcutBlocked(ev(el))).toBe(false);
	});
});

describe("copiar e colar token não rouba o texto", () => {
	const staff = { canManage: true, selectedCount: 1, clipboardCount: 1 };
	const key = (target: EventTarget, init: KeyboardEventInit) => {
		const event = new KeyboardEvent("keydown", {
			bubbles: true,
			cancelable: true,
			...init,
		});
		Object.defineProperty(event, "target", { value: target });
		return event;
	};
	afterEach(() => {
		window.getSelection()?.removeAllRanges();
		document.body.innerHTML = "";
	});

	it.each([
		["input", () => document.createElement("input")],
		["textarea", () => document.createElement("textarea")],
		[
			"contenteditable",
			() => {
				const el = document.createElement("div");
				el.setAttribute("contenteditable", "true");
				el.textContent = "nota";
				return el;
			},
		],
	])("Ctrl+C com foco em %s não copia o token", (_name, create) => {
		const el = create();
		document.body.appendChild(el);
		el.focus();
		const event = key(el, { key: "c", ctrlKey: true });
		expect(tokenClipboardAction(event, staff)).toBe("ignore");
		expect(event.defaultPrevented).toBe(false);
	});

	it("Ctrl+C com texto selecionado na página não copia o token", () => {
		const paragraph = document.createElement("p");
		paragraph.textContent = "nota da ficha";
		document.body.appendChild(paragraph);
		const range = document.createRange();
		range.selectNodeContents(paragraph);
		const selection = window.getSelection();
		selection?.removeAllRanges();
		selection?.addRange(range);
		const event = key(document.body, { key: "c", ctrlKey: true });
		expect(selection?.isCollapsed).toBe(false);
		expect(tokenClipboardAction(event, staff)).toBe("ignore");
		expect(event.defaultPrevented).toBe(false);
	});

	it("jogador não copia nem cola", () => {
		const player = { canManage: false, selectedCount: 2, clipboardCount: 2 };
		expect(
			tokenClipboardAction(
				key(document.body, { key: "c", ctrlKey: true }),
				player,
			),
		).toBe("ignore");
		expect(
			tokenClipboardAction(
				key(document.body, { key: "v", metaKey: true }),
				player,
			),
		).toBe("ignore");
	});

	it("co-mestre copia e cola quando a mesa está livre", () => {
		expect(
			tokenClipboardAction(key(document.body, { key: "c", metaKey: true }), {
				canManage: true,
				selectedCount: 1,
				clipboardCount: 0,
			}),
		).toBe("copy");
		expect(
			tokenClipboardAction(key(document.body, { key: "v", ctrlKey: true }), {
				canManage: true,
				selectedCount: 0,
				clipboardCount: 2,
			}),
		).toBe("paste");
	});

	it("Ctrl+C sem token selecionado e Ctrl+V sem cópia não interceptam", () => {
		expect(
			tokenClipboardAction(key(document.body, { key: "c", ctrlKey: true }), {
				canManage: true,
				selectedCount: 0,
				clipboardCount: 0,
			}),
		).toBe("ignore");
		expect(
			tokenClipboardAction(key(document.body, { key: "v", ctrlKey: true }), {
				canManage: true,
				selectedCount: 1,
				clipboardCount: 0,
			}),
		).toBe("ignore");
	});
});
