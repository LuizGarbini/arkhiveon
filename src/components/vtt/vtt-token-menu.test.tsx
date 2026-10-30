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
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTTokenMenu } from "./vtt-token-menu";

const AVATAR = "https://cdn.test/elbereth.png";

const baseToken: VTTToken = {
	id: "tok-1",
	sceneId: "scene-1",
	name: "Elbereth",
	avatarUrl: AVATAR,
	layer: "token",
	x: 100,
	y: 100,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 0,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
};

function setup(token: Partial<VTTToken> = {}, isGM = true) {
	useVTTStore.setState({ isGM, activeTokenIdForMenu: "tok-1" });
	const onUpdateToken = vi.fn(async () => {});
	const onDeleteToken = vi.fn(async () => {});
	render(
		<VTTTokenMenu
			token={{ ...baseToken, ...token }}
			onUpdateToken={onUpdateToken}
			onDeleteToken={onDeleteToken}
		/>,
	);
	return { onUpdateToken, onDeleteToken };
}

const portraitName = "Ver imagem de Elbereth em tela cheia";

beforeEach(() => {
	useVTTStore.setState({
		activeTokenIdForMenu: null,
		showCharacterSheetId: null,
	});
});
afterEach(cleanup);

describe("VTTTokenMenu — imagem em tela cheia", () => {
	it("o retrato abre o visualizador sem fechar o menu nem salvar o token", async () => {
		const { onUpdateToken } = setup();
		const trigger = screen.getByRole("button", { name: portraitName });
		expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
		expect(trigger.className).toContain("h-[48px]");
		await act(async () => {
			fireEvent.click(trigger);
		});
		await screen.findByRole("dialog", { name: "Elbereth" });
		expect(useVTTStore.getState().activeTokenIdForMenu).toBe("tok-1");
		expect(onUpdateToken).not.toHaveBeenCalled();
	});

	it("o item do menu também abre o visualizador", async () => {
		setup();
		const item = screen.getByRole("button", {
			name: "Ver imagem em tela cheia",
		});
		expect(item.className).toContain("h-[48px]");
		await act(async () => {
			fireEvent.click(item);
		});
		await screen.findByRole("dialog", { name: "Elbereth" });
	});

	it("Esc fecha o visualizador, o menu fica aberto e o foco volta ao gatilho", async () => {
		setup();
		const trigger = screen.getByRole("button", { name: portraitName });
		await act(async () => {
			fireEvent.click(trigger);
		});
		const dialog = await screen.findByRole("dialog", { name: "Elbereth" });
		await act(async () => {
			fireEvent.keyDown(dialog, { key: "Escape" });
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
		expect(useVTTStore.getState().activeTokenIdForMenu).toBe("tok-1");
		expect(screen.getByRole("button", { name: "Fechar menu do token" }));
	});

	it("token sem imagem não tem gatilho e mostra a inicial", () => {
		setup({ avatarUrl: null });
		expect(screen.queryByRole("button", { name: portraitName })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Ver imagem em tela cheia" }),
		).toBeNull();
		expect(screen.getByText("E")).toBeTruthy();
	});

	it.each([
		["camada gm", { layer: "gm" as const }],
		["oculto", { isHidden: true }],
	])("jogador com o menu de um token %s não tem gatilho", (_, patch) => {
		setup(patch, false);
		expect(screen.queryByRole("button", { name: portraitName })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Ver imagem em tela cheia" }),
		).toBeNull();
	});

	it("jogador vê o gatilho num token visível", () => {
		setup({}, false);
		expect(screen.getByRole("button", { name: portraitName })).toBeTruthy();
	});

	it("Ficha e Fechar continuam funcionando", () => {
		setup();
		fireEvent.click(
			screen.getByRole("button", { name: "Abrir ficha na mesa" }),
		);
		expect(useVTTStore.getState().showCharacterSheetId).toBe("tok-1");
		expect(useVTTStore.getState().activeTokenIdForMenu).toBeNull();
		cleanup();
		setup();
		fireEvent.click(
			screen.getByRole("button", { name: "Fechar menu do token" }),
		);
		expect(useVTTStore.getState().activeTokenIdForMenu).toBeNull();
	});
});

describe("VTTTokenMenu — status", () => {
	it("aplicar status pelo menu grava conditions", () => {
		const { onUpdateToken } = setup({ conditions: ["caido"] });
		const envenenado = screen.getByRole("button", { name: "Envenenado" });
		expect(envenenado.getAttribute("aria-pressed")).toBe("false");
		fireEvent.click(envenenado);
		expect(onUpdateToken).toHaveBeenLastCalledWith("tok-1", {
			conditions: ["caido", "envenenado"],
		});
	});

	it("clicar num status aplicado remove", () => {
		const { onUpdateToken } = setup({ conditions: ["caido"] });
		const caido = screen.getByRole("button", { name: "Caído" });
		expect(caido.getAttribute("aria-pressed")).toBe("true");
		fireEvent.click(caido);
		expect(onUpdateToken).toHaveBeenLastCalledWith("tok-1", {
			conditions: [],
		});
	});
});

describe("VTTTokenMenu — PV da ficha", () => {
	const previous = useRPGStore.getState().characters;
	afterEach(() => {
		useRPGStore.setState({ characters: previous });
	});

	function sheet(system: "dnd5e" | "ordem") {
		useRPGStore.setState({
			characters: [
				{
					id: "char-1",
					system,
					health: 33,
					healthMax: 38,
				} as Character,
			],
		});
	}

	it("shows the sheet HP and sends the next current value", () => {
		sheet("dnd5e");
		const { onUpdateToken } = setup({
			characterId: "char-1",
			hpCurrent: 1,
			hpMax: 2,
		});
		expect(screen.getByText("33 / 38")).toBeTruthy();
		expect(screen.queryByText("1 / 2")).toBeNull();
		const damage = screen.getByRole("button", { name: "-5" });
		expect(damage.getAttribute("data-slot")).toBe("button");
		expect(damage.className).not.toContain("rose-");
		expect(screen.getByTestId("vtt-hp-bar").className).toContain("bg-primary");
		fireEvent.click(damage);
		expect(onUpdateToken).toHaveBeenCalledWith("tok-1", { hpCurrent: 28 });
	});

	it("hides the maximum from a player and still changes the current HP", () => {
		sheet("dnd5e");
		const { onUpdateToken } = setup(
			{ characterId: "char-1", hpCurrent: 1, hpMax: 2 },
			false,
		);
		expect(screen.getByText("33")).toBeTruthy();
		expect(screen.queryByText("33 / 38")).toBeNull();
		expect(screen.queryByText("38")).toBeNull();
		expect(screen.queryByRole("spinbutton", { name: "PV máximo" })).toBeNull();
		fireEvent.click(screen.getByRole("button", { name: "-5" }));
		expect(onUpdateToken).toHaveBeenCalledWith("tok-1", { hpCurrent: 28 });
	});

	it("keeps token HP for Ordem/CRIS", () => {
		sheet("ordem");
		setup({ characterId: "char-1", hpCurrent: 4, hpMax: 9 });
		expect(screen.getByText("4 / 9")).toBeTruthy();
		expect(screen.queryByText("33 / 38")).toBeNull();
	});

	it("falls back to token HP when the token has no sheet", () => {
		sheet("dnd5e");
		setup({ characterId: null, hpCurrent: 7, hpMax: 10 });
		expect(screen.getByText("7 / 10")).toBeTruthy();
	});

	it("o mestre só ajusta PV pelos botões −5/−1/+1/+5", () => {
		sheet("dnd5e");
		setup({ characterId: "char-1", hpCurrent: 1, hpMax: 2 });
		for (const name of ["-5", "-1", "+1", "+5"]) {
			expect(screen.getByRole("button", { name })).toBeTruthy();
		}
		expect(screen.getByRole("spinbutton", { name: "PV máximo" })).toBeTruthy();
		expect(screen.queryByPlaceholderText("Valor...")).toBeNull();
		expect(screen.queryByRole("button", { name: "Dano" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Cura" })).toBeNull();
		expect(
			screen.queryByRole("spinbutton", { name: "Quantidade de dano ou cura" }),
		).toBeNull();
	});
});

describe("VTTTokenMenu — Tooltip do DS no lugar de title nativo", () => {
	it("nenhum title nativo; ações seguem com nome acessível e abrem Tooltip no foco", async () => {
		setup({ isHidden: false, isLocked: false, layer: "token" });
		const menu = document.body;
		expect(menu.querySelector("button[title]")).toBeNull();
		for (const name of [
			"Abrir ficha na mesa",
			"Girar Token (45º)",
			"Ocultar dos Jogadores",
			"Mover para Camada do Mestre (GM Layer)",
			"Travar no Lugar",
		]) {
			expect(screen.getByRole("button", { name })).toBeTruthy();
		}
		const rotate = screen.getByRole("button", { name: "Girar Token (45º)" });
		expect(rotate.getAttribute("data-slot")).toBe("tooltip-trigger");
	});

	it("o texto do Tooltip acompanha o estado (oculto/travado/camada do mestre)", () => {
		setup({ isHidden: true, isLocked: true, layer: "gm" });
		for (const name of [
			"Revelar aos Jogadores",
			"Destravar Movimentação",
			"Mover para Camada de Jogadores (Tokens)",
		]) {
			const b = screen.getByRole("button", { name });
			expect(b.getAttribute("data-slot")).toBe("tooltip-trigger");
		}
	});
});
