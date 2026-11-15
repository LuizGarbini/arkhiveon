// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { VTTScene, VTTToken } from "./types";
import { useVTTStore } from "./vtt-store";

const initial = useVTTStore.getState();
const scene = (id: string, isActive = true): VTTScene => ({
	id,
	campaignId: "campaign",
	name: id,
	isActive,
	gridType: "square",
	gridSize: 70,
	gridColor: "white",
	gridOpacity: 0.15,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	gridOffsetX: 0,
	gridOffsetY: 0,
	mapScale: 1,
	width: 1600,
	height: 1200,
	fogEnabled: true,
	fogExploration: false,
	orderIndex: 0,
});
const token: VTTToken = {
	id: "token-a",
	sceneId: "a",
	name: "A",
	layer: "token",
	x: 10,
	y: 20,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
};
beforeEach(() => useVTTStore.setState(initial, true));

describe("VTT scene lifecycle", () => {
	it("selects an unseen scene published to a connected player", () => {
		useVTTStore.getState().setScenes([scene("a")]);
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore.getState().setTokens([token]);
		useVTTStore.getState().addScene(scene("b"));
		expect(useVTTStore.getState().activeSceneId).toBe("b");
		expect(useVTTStore.getState().tokens).toEqual([]);
		expect(
			useVTTStore.getState().scenes.find((s) => s.id === "b"),
		).toBeDefined();
	});
	it("never selects preparation scenes for a player", () => {
		useVTTStore.getState().addScene(scene("b", false));
		expect(useVTTStore.getState().activeSceneId).toBeNull();
	});
	it("ignores a token creation response from the previous scene", () => {
		useVTTStore.getState().setActiveSceneId("b");
		useVTTStore.getState().addToken(token);
		expect(useVTTStore.getState().tokens).toEqual([]);
	});
	it("ignores fog data belonging to the previous scene", () => {
		useVTTStore.getState().setActiveSceneId("b");
		useVTTStore.getState().setFogState({
			id: "fog-a",
			sceneId: "a",
			revealedPaths: [
				{
					id: "reveal",
					type: "rect",
					mode: "reveal",
					width: 1000,
					height: 1000,
				},
			],
		});
		expect(useVTTStore.getState().fogPaths).toEqual([]);
	});
	it("prende o offset na célula e rejeita escala inválida", () => {
		useVTTStore.getState().setScenes([
			{
				...scene("a"),
				gridSize: 70,
				gridOffsetX: 80,
				gridOffsetY: -1,
				mapScale: 0,
			},
		]);
		const stored = useVTTStore.getState().scenes[0];
		expect(stored?.gridOffsetX).toBe(10);
		expect(stored?.gridOffsetY).toBe(69);
		expect(stored?.mapScale).toBe(1);
	});

	it("clears transient state when the selected scene is deleted", () => {
		useVTTStore.getState().setIsGM(true);
		useVTTStore.getState().setScenes([scene("a"), scene("b", false)]);
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore.getState().setTokens([token]);
		useVTTStore.getState().setSelectedTokenIds([token.id]);
		useVTTStore.getState().removeScene("a");
		expect(useVTTStore.getState().tokens).toEqual([]);
		expect(useVTTStore.getState().selectedTokenIds).toEqual([]);
	});

	it("closes the Biblioteca when a token menu opens and vice versa", () => {
		const state = useVTTStore.getState();
		state.setShowRosterDrawer(true);
		state.setActiveTokenIdForMenu("token-a");
		expect(useVTTStore.getState().activeTokenIdForMenu).toBe("token-a");
		expect(useVTTStore.getState().showRosterDrawer).toBe(false);
		useVTTStore.getState().setShowRosterDrawer(true);
		expect(useVTTStore.getState().showRosterDrawer).toBe(true);
		expect(useVTTStore.getState().activeTokenIdForMenu).toBeNull();
		useVTTStore.getState().setActiveTokenIdForMenu(null);
		expect(useVTTStore.getState().showRosterDrawer).toBe(true);
	});

	it("drops a stale interpolation target while that token is dragged", () => {
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore.getState().setTokens([{ ...token, targetX: 0, targetY: 0 }]);
		useVTTStore.getState().setDraggedTokenId(token.id);
		useVTTStore.getState().updateToken(token.id, { x: 80, y: 90 });
		const moved = useVTTStore.getState().tokens[0];
		expect(moved?.x).toBe(80);
		expect(moved?.y).toBe(90);
		expect(moved?.targetX).toBeUndefined();
		expect(moved?.targetY).toBeUndefined();
	});

	it("ignores a remote drag target for every token in the group", () => {
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore
			.getState()
			.setTokens([token, { ...token, id: "token-b", name: "B" }]);
		useVTTStore.getState().setDraggedTokenIds(["token-a", "token-b"]);
		useVTTStore.getState().setTokenTargetPosition("token-b", 12, 12);
		expect(useVTTStore.getState().tokens[1]?.targetX).toBeUndefined();
	});

	it("ignores a remote drag target for the token under the pointer", () => {
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore.getState().setTokens([token]);
		useVTTStore.getState().setDraggedTokenId(token.id);
		useVTTStore.getState().setTokenTargetPosition(token.id, 500, 500);
		expect(useVTTStore.getState().tokens[0]?.targetX).toBeUndefined();
		useVTTStore.getState().setDraggedTokenId(null);
		useVTTStore.getState().setTokenTargetPosition(token.id, 500, 500);
		expect(useVTTStore.getState().tokens[0]?.targetX).toBe(500);
	});

	it("opening a sheet closes the token menu", () => {
		useVTTStore.getState().setActiveTokenIdForMenu("token-a");
		useVTTStore.getState().setShowCharacterSheetId("token-a");
		expect(useVTTStore.getState().showCharacterSheetId).toBe("token-a");
		expect(useVTTStore.getState().activeTokenIdForMenu).toBeNull();
	});

	it("on a phone, opening the token menu closes the sheet", () => {
		const original = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			matches: query.includes("max-width"),
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
		})) as unknown as typeof window.matchMedia;
		useVTTStore.getState().setShowCharacterSheetId("token-a");
		useVTTStore.getState().setActiveTokenIdForMenu("token-a");
		expect(useVTTStore.getState().activeTokenIdForMenu).toBe("token-a");
		expect(useVTTStore.getState().showCharacterSheetId).toBeNull();
		window.matchMedia = original;
	});
});

describe("updateTokens · lote numa única mudança da store", () => {
	const make = (id: string, x: number): VTTToken => ({
		...token,
		id,
		x,
		sceneId: "a",
	});

	it("aplica todos os tokens do grupo com UMA mudança (e não uma por token)", () => {
		useVTTStore.getState().setScenes([scene("a")]);
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore
			.getState()
			.setTokens(["p0", "p1", "p2"].map((id, i) => make(id, i * 70)));
		let changes = 0;
		const unsub = useVTTStore.subscribe(() => {
			changes++;
		});
		useVTTStore.getState().updateTokens([
			{ tokenId: "p0", updates: { y: 70, rotation: 180 } },
			{ tokenId: "p1", updates: { y: 70, rotation: 180 } },
			{ tokenId: "p2", updates: { y: 70, rotation: 180 } },
		]);
		unsub();
		expect(changes).toBe(1);
		expect(useVTTStore.getState().tokens.map((t) => [t.y, t.rotation])).toEqual(
			[
				[70, 180],
				[70, 180],
				[70, 180],
			],
		);
	});

	it("lote vazio não gera mudança e id desconhecido é ignorado", () => {
		useVTTStore.getState().setScenes([scene("a")]);
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore.getState().setTokens([make("p0", 0)]);
		const before = useVTTStore.getState().tokens;
		useVTTStore.getState().updateTokens([]);
		expect(useVTTStore.getState().tokens).toBe(before);
		useVTTStore
			.getState()
			.updateTokens([{ tokenId: "ghost", updates: { x: 9 } }]);
		expect(useVTTStore.getState().tokens[0]?.x).toBe(0);
	});

	it("posição local nova limpa o alvo de interpolação velho (alvo undefined)", () => {
		useVTTStore.getState().setScenes([scene("a")]);
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore
			.getState()
			.setTokens([{ ...make("p0", 0), targetX: 0, targetY: 0 }]);
		useVTTStore.getState().updateTokens([
			{
				tokenId: "p0",
				updates: { x: 70, targetX: undefined, targetY: undefined },
			},
		]);
		const t = useVTTStore.getState().tokens[0] as VTTToken;
		expect(t.targetX).toBeUndefined();
		expect(t.targetY).toBeUndefined();
		expect(t.x).toBe(70);
	});

	it("o token arrastado perde o alvo velho, como no updateToken", () => {
		useVTTStore.getState().setScenes([scene("a")]);
		useVTTStore.getState().setActiveSceneId("a");
		useVTTStore
			.getState()
			.setTokens([{ ...make("p0", 0), targetX: 5, targetY: 5 }]);
		useVTTStore.getState().setDraggedTokenIds(["p0"]);
		useVTTStore
			.getState()
			.updateTokens([{ tokenId: "p0", updates: { x: 70 } }]);
		const t = useVTTStore.getState().tokens[0] as VTTToken;
		expect(t.targetX).toBeUndefined();
	});
});
