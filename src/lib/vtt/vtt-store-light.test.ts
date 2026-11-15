import { beforeEach, describe, expect, it } from "vitest";
import type { VTTLightZone } from "./light-zones";
import { useVTTStore } from "./vtt-store";

const zone = (id: string, sceneId = "s1"): VTTLightZone => ({
	id,
	sceneId,
	level: "dark",
	shape: "circle",
	x: 1,
	y: 1,
	radius: 10,
});
const s = () => useVTTStore.getState();

beforeEach(() => {
	useVTTStore.setState({
		isGM: true,
		activeSceneId: "s1",
		activeTool: "select",
		lightZones: [],
		lightZonesStatus: "idle",
		selectedLightZoneId: null,
		lightDraft: [],
		lightDrawLevel: "dark",
		lightDrawShape: "circle",
	});
});

describe("áreas de luz na store", () => {
	it("começa com escuridão e círculo como padrão da próxima área", () => {
		expect(s().lightDrawLevel).toBe("dark");
		expect(s().lightDrawShape).toBe("circle");
	});

	it("adicionar não duplica o mesmo id (recarga + otimista)", () => {
		s().addLightZoneLocal(zone("a"));
		s().addLightZoneLocal(zone("a"));
		expect(s().lightZones).toHaveLength(1);
	});

	it("apagar tira a área e a seleção só se era ela", () => {
		s().setLightZones([zone("a"), zone("b")]);
		s().setSelectedLightZoneId("a");
		s().removeLightZoneLocal("b");
		expect(s().selectedLightZoneId).toBe("a");
		s().removeLightZoneLocal("a");
		expect(s().selectedLightZoneId).toBeNull();
		expect(s().lightZones).toEqual([]);
	});

	it("trocar a luz muda só a área pedida, e mantém a ordem", () => {
		s().setLightZones([zone("a"), zone("b"), zone("c")]);
		s().setLightZoneLevelLocal("b", "bright");
		expect(s().lightZones.map((z) => `${z.id}:${z.level}`)).toEqual([
			"a:dark",
			"b:bright",
			"c:dark",
		]);
	});

	it("sair da ferramenta Luz descarta o polígono em desenho e a seleção", () => {
		s().setActiveTool("light");
		s().setLightDraft([{ x: 1, y: 1 }]);
		s().setSelectedLightZoneId("a");
		s().setActiveTool("select");
		expect(s().lightDraft).toEqual([]);
		expect(s().selectedLightZoneId).toBeNull();
	});

	it("continuar na ferramenta Luz mantém o desenho e a seleção", () => {
		s().setActiveTool("light");
		s().setLightDraft([{ x: 1, y: 1 }]);
		s().setSelectedLightZoneId("a");
		s().setActiveTool("light");
		expect(s().lightDraft).toHaveLength(1);
		expect(s().selectedLightZoneId).toBe("a");
	});

	it("trocar de cena limpa áreas, seleção e rascunho (cada cena tem as suas)", () => {
		s().setLightZones([zone("a")]);
		s().setSelectedLightZoneId("a");
		s().setLightDraft([{ x: 1, y: 1 }]);
		s().setActiveSceneId("s2");
		expect(s().lightZones).toEqual([]);
		expect(s().selectedLightZoneId).toBeNull();
		expect(s().lightDraft).toEqual([]);
		expect(s().lightZonesStatus).toBe("idle");
	});

	it("a luz e a forma escolhidas sobrevivem à troca de cena", () => {
		s().setLightDrawLevel("dim");
		s().setLightDrawShape("polygon");
		s().setActiveSceneId("s2");
		expect(s().lightDrawLevel).toBe("dim");
		expect(s().lightDrawShape).toBe("polygon");
	});
});
