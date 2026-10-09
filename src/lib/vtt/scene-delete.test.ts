import { describe, expect, it } from "vitest";
import {
	checkSceneDelete,
	IN_PLAY_WARNING,
	LAST_SCENE_MESSAGE,
} from "./scene-delete";

const live = { id: "live", isActive: true };
const prep = { id: "prep", isActive: false };

describe("checkSceneDelete", () => {
	it("allows deleting a scene in preparation when another scene exists", () => {
		expect(checkSceneDelete(prep, [live, prep])).toEqual({
			allowed: true,
			warning: null,
		});
	});

	it("allows deleting the scene in play but warns that players lose it", () => {
		expect(checkSceneDelete(live, [live, prep])).toEqual({
			allowed: true,
			warning: IN_PLAY_WARNING,
		});
	});

	it("blocks deleting the only scene of the table, in play or not", () => {
		expect(checkSceneDelete(live, [live])).toEqual({
			allowed: false,
			reason: LAST_SCENE_MESSAGE,
		});
		expect(checkSceneDelete(prep, [prep])).toEqual({
			allowed: false,
			reason: LAST_SCENE_MESSAGE,
		});
	});
});
