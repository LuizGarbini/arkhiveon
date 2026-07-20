import { describe, expect, it } from "vitest";
import { useRPGStore } from "@/lib/store";

describe("zustand selector stability", () => {
	it("filter inside selector returns a new array every call", () => {
		useRPGStore.setState({
			factionReputations: [
				{
					id: "r1",
					factionId: "f1",
					campaignId: "c1",
					status: "neutral",
					createdAt: 1,
				},
			],
		});

		const getSnapshot = () =>
			useRPGStore
				.getState()
				.factionReputations.filter((r) => r.factionId === "f1");

		const a = getSnapshot();
		const b = getSnapshot();
		// Documents why selectors must not .filter() inline — Object.is fails
		// and React's useSyncExternalStore loops ("Maximum update depth exceeded").
		expect(a).not.toBe(b);
		expect(a).toEqual(b);
	});

	it("selecting the source array keeps a stable reference", () => {
		const state = useRPGStore.getState();
		const a = state.factionReputations;
		const b = useRPGStore.getState().factionReputations;
		expect(a).toBe(b);
	});
});
