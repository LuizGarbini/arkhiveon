import { beforeEach, describe, expect, it } from "vitest";
import {
	selectRollEntries,
	selectRollResult,
	selectRollResults,
	type TableFeedEntry,
	useRollStore,
} from "./roll-store";

const initial = useRollStore.getState();

const entry = (
	id: string,
	sessionId: string,
	formula: string | null,
): TableFeedEntry => ({
	id,
	campaignId: "camp",
	sceneId: null,
	sessionId,
	authorId: "gm",
	characterId: null,
	kind: "roll",
	formula,
	label: null,
	message: null,
	isSecret: formula === null,
	createdAt: "2026-10-26T00:00:00.000Z",
});

beforeEach(() => {
	useRollStore.setState(initial, true);
});

describe("useRollStore", () => {
	it("guarda a linha pública sem total e troca pelo mesmo id", () => {
		const secret = entry("a", "s1", null);
		useRollStore.getState().upsertEntry(secret);
		useRollStore.getState().upsertEntry({ ...secret, label: "Percepção" });
		const entries = selectRollEntries(useRollStore.getState());
		expect(entries).toHaveLength(1);
		expect(entries[0]?.label).toBe("Percepção");
		expect(entries[0]).not.toHaveProperty("total");
		expect(entries[0]).not.toHaveProperty("details");
		expect(entries[0]?.formula).toBeNull();
	});

	it("devolve o mesmo array enquanto nada muda", () => {
		useRollStore.getState().upsertEntry(entry("a", "s1", "1d20"));
		const first = selectRollEntries(useRollStore.getState());
		const second = selectRollEntries(useRollStore.getState());
		expect(first).toBe(second);
	});

	it("guarda o resultado à parte, só por id da rolagem", () => {
		useRollStore.getState().setResult({
			rollId: "a",
			total: 14,
			details: {
				formula: "2d6+3",
				count: 2,
				faces: 6,
				modifier: 3,
				rolls: [5, 6],
			},
		});
		const result = selectRollResult("a")(useRollStore.getState());
		expect(result?.total).toBe(14);
		expect(
			selectRollResult("faltando")(useRollStore.getState()),
		).toBeUndefined();
		expect(selectRollResults(useRollStore.getState())).toBe(
			selectRollResults(useRollStore.getState()),
		);
	});
});
