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
