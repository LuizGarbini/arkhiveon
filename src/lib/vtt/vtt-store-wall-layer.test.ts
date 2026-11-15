import { beforeEach, describe, expect, it } from "vitest";
import { useVTTStore } from "./vtt-store";

const reset = (over: Record<string, unknown> = {}) =>
	useVTTStore.setState({
		isGM: true,
		activeTool: "select",
		activeLayer: "token",
		wallDraft: [],
		selectedWallIds: [],
		...over,
	});

beforeEach(() => reset());

describe("ferramenta Parede e camada do mestre", () => {
	it("escolher a ferramenta Parede leva para a camada do mestre", () => {
		useVTTStore.getState().setActiveTool("wall");
		expect(useVTTStore.getState().activeTool).toBe("wall");
		expect(useVTTStore.getState().activeLayer).toBe("gm");
	});

	it("já na camada do mestre, continua nela", () => {
		reset({ activeLayer: "gm" });
		useVTTStore.getState().setActiveTool("wall");
		expect(useVTTStore.getState().activeLayer).toBe("gm");
	});

	it("sair da ferramenta Parede NÃO muda a camada (o mestre pode querer ficar nela)", () => {
		useVTTStore.getState().setActiveTool("wall");
		useVTTStore.getState().setActiveTool("select");
		expect(useVTTStore.getState().activeLayer).toBe("gm");
	});

	it("sair da ferramenta descarta o desenho e a seleção", () => {
		useVTTStore.getState().setActiveTool("wall");
		useVTTStore.setState({
			wallDraft: [{ x: 1, y: 1 }],
			selectedWallIds: ["a"],
		});
		useVTTStore.getState().setActiveTool("ruler");
		expect(useVTTStore.getState().wallDraft).toEqual([]);
		expect(useVTTStore.getState().selectedWallIds).toEqual([]);
	});

	it("com a ferramenta Parede ativa, trocar para a camada de jogo volta para Selecionar", () => {
		useVTTStore.getState().setActiveTool("wall");
		useVTTStore.setState({
			wallDraft: [{ x: 1, y: 1 }],
			selectedWallIds: ["a"],
		});
		useVTTStore.getState().setActiveLayer("token");
		const s = useVTTStore.getState();
		expect(s.activeLayer).toBe("token");
		expect(s.activeTool).toBe("select");
		expect(s.wallDraft).toEqual([]);
		expect(s.selectedWallIds).toEqual([]);
	});

	it("trocar de camada com outra ferramenta ativa não mexe na ferramenta", () => {
		reset({ activeTool: "ruler" });
		useVTTStore.getState().setActiveLayer("gm");
		expect(useVTTStore.getState().activeTool).toBe("ruler");
	});

	it("jogador não vai para a camada do mestre, nem pela ferramenta", () => {
		reset({ isGM: false });
		useVTTStore.getState().setActiveTool("wall");
		expect(useVTTStore.getState().activeLayer).toBe("token");
		useVTTStore.getState().setActiveLayer("gm");
		expect(useVTTStore.getState().activeLayer).toBe("token");
	});
});
