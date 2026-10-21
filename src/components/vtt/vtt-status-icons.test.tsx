// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import type { Renderer, Texture } from "pixi.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	COMPACT_VISIBLE_CONDITIONS,
	conditionDef,
	STATUS_CHIP,
	summarizeConditions,
	VTT_CONDITIONS,
	VTT_STATUS_ICON_NAMES,
} from "@/lib/vtt/conditions";
import {
	clearStatusIconTextures,
	placeStatusIcon,
	statusIconSvg,
	statusIconTexture,
	statusIconTextureCount,
} from "@/lib/vtt/status-icon-texture";
import { STATUS_ICONS } from "@/lib/vtt/status-icons";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTTokenMenu } from "./vtt-token-menu";

const token: VTTToken = {
	id: "tok-1",
	sceneId: "s1",
	name: "Goblin",
	layer: "token",
	x: 0,
	y: 0,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: ["envenenado"],
	auras: [],
	visionRange: 0,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
};

beforeEach(() => {
	useVTTStore.setState({
		isGM: true,
		tokens: [token],
		activeTokenIdForMenu: "tok-1",
		scenes: [{ id: "s1", gridSize: 70 } as VTTScene],
		activeSceneId: "s1",
		viewport: { x: 0, y: 0, scale: 1 },
	});
});
afterEach(cleanup);

describe("mapa status → ícone lucide", () => {
	it("os 7 status usam os ícones aprovados; desconhecido = circle-dot", () => {
		expect(
			Object.fromEntries(VTT_CONDITIONS.map((c) => [c.id, c.icon])),
		).toEqual({
			envenenado: "biohazard",
			caido: "arrow-down-to-line",
			cego: "eye-off",
			atordoado: "zap",
			invisivel: "ghost",
			chamas: "flame",
			concentracao: "brain",
		});
		expect(conditionDef("custom-velho").icon).toBe("circle-dot");
	});

	it("nenhum emoji sobrou e todo nome tem componente e desenho", () => {
		for (const c of VTT_CONDITIONS) expect(c.icon).toMatch(/^[a-z-]+$/);
		for (const name of VTT_STATUS_ICON_NAMES) {
			expect(STATUS_ICONS[name]).toBeTruthy();
			const svg = statusIconSvg(name, 16);
			expect(svg).toContain('stroke-width="1.5"');
			expect(svg).toMatch(/<(path|circle|line|polyline|rect)\s/);
			expect(svg).not.toContain("key=");
		}
	});

	it("tamanhos: 22/16 no desktop, 26/18 no celular", () => {
		expect(STATUS_CHIP.desktop).toEqual({ chip: 22, icon: 16 });
		expect(STATUS_CHIP.compact).toEqual({ chip: 26, icon: 18 });
	});
});

describe("excesso (+N)", () => {
	const ids = ["envenenado", "caido", "cego", "chamas", "zap-velho"];
	it("desktop: até 3 + '+N'", () => {
		const s = summarizeConditions(ids);
		expect(s.visible.map((c) => c.icon)).toEqual([
			"biohazard",
			"arrow-down-to-line",
			"eye-off",
		]);
		expect(s.overflow).toBe(2);
	});
	it("390: 1 + '+N'", () => {
		const s = summarizeConditions(ids, COMPACT_VISIBLE_CONDITIONS);
		expect(s.visible).toHaveLength(1);
		expect(s.overflow).toBe(4);
	});
	it("sem excesso não há +N", () => {
		expect(summarizeConditions(["cego"]).overflow).toBe(0);
	});
});

describe("textura do Pixi", () => {
	it("gera uma vez por ícone e reaproveita em todos os redesenhos", () => {
		clearStatusIconTextures();
		const generateTexture = vi.fn(
			() => ({ destroyed: false, destroy: vi.fn() }) as unknown as Texture,
		);
		const renderer = { uid: 1, generateTexture } as unknown as Renderer;
		const a = statusIconTexture(renderer, "flame");
		for (let i = 0; i < 50; i++) statusIconTexture(renderer, "flame");
		expect(statusIconTexture(renderer, "flame")).toBe(a);
		statusIconTexture(renderer, "brain");
		expect(generateTexture).toHaveBeenCalledTimes(2);
		expect(statusIconTextureCount()).toBe(2);
		clearStatusIconTextures();
		expect(statusIconTextureCount()).toBe(0);
	});

	it("ícone fica centrado no chip, no tamanho do viewBox (sem esticar)", () => {
		// circle-dot: caixa 1.25..22.75 no viewBox 24.
		const art = { x: 1.25, y: 1.25, width: 21.5, height: 21.5 };
		expect(placeStatusIcon(art, 16, 100, 50)).toEqual({
			x: 100 - (10.75 * 16) / 24,
			y: 50 - (10.75 * 16) / 24,
			width: (21.5 * 16) / 24,
			height: (21.5 * 16) / 24,
		});
		// Desenho estreito (arrow-down-to-line) não vira quadrado.
		const box = placeStatusIcon(
			{ x: 4.25, y: 2.25, width: 15.5, height: 19.5 },
			18,
			0,
			0,
		);
		expect(box.width).toBeLessThan(box.height);
	});
});

describe("menu do token", () => {
	const renderMenu = () =>
		render(
			<VTTTokenMenu
				token={token}
				onUpdateToken={vi.fn(async () => {})}
				onDeleteToken={vi.fn(async () => {})}
			/>,
		);

	it("Select do DS com SelectItem e ícone; nenhum <option> nativo", async () => {
		renderMenu();
		expect(document.querySelector("select, option")).toBeNull();
		await act(async () => {
			fireEvent.click(
				screen.getByRole("combobox", { name: "Adicionar status" }),
			);
		});
		const options = await screen.findAllByRole("option");
		expect(document.querySelector("select, option")).toBeNull();
		expect(options).toHaveLength(6);
		for (const o of options) {
			const icon = o.querySelector("[data-status-icon]");
			expect(icon?.getAttribute("class")).toContain("text-muted-foreground");
			expect(icon?.getAttribute("stroke-width")).toBe("1.5");
			expect(o.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
		}
		const caido = options.find((o) => o.textContent?.includes("Caído"));
		expect(
			caido
				?.querySelector("[data-status-icon]")
				?.getAttribute("data-status-icon"),
		).toBe("arrow-down-to-line");
	});

	it("chips: ícone monocromático (currentColor); borda leva a cor do status", () => {
		renderMenu();
		const on = screen.getByRole("button", { name: "Envenenado" });
		expect(on.getAttribute("aria-pressed")).toBe("true");
		expect(on.className).toContain("text-foreground");
		expect(on.className).toContain("border-emerald-500/40");
		expect(on.className).not.toContain("text-emerald-400");
		const icon = on.querySelector("[data-status-icon]");
		expect(icon?.getAttribute("data-status-icon")).toBe("biohazard");
		expect(icon?.getAttribute("stroke")).toBe("currentColor");
		expect(on.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
	});
});
