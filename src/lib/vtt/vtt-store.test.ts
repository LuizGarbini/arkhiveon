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
});
