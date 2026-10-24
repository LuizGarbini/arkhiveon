import { describe, expect, it } from "vitest";
import { isSharedWorld } from "./shared-world";

const ME = "user-me";
const OTHER = "user-other";

describe("isSharedWorld", () => {
	it("mundo próprio só com campanhas minhas não é compartilhado", () => {
		expect(
			isSharedWorld(
				{ id: "w1", ownerUserId: ME },
				[
					{ worldId: "w1", ownerId: ME },
					{ worldId: "w1", ownerId: ME },
				],
				ME,
			),
		).toBe(false);
	});

	it("mundo de outra pessoa é compartilhado", () => {
		expect(
			isSharedWorld(
				{ id: "w1", ownerUserId: OTHER },
				[{ worldId: "w1", ownerId: ME }],
				ME,
			),
		).toBe(true);
	});

	it("mundo próprio com campanha de outra pessoa é compartilhado", () => {
		expect(
			isSharedWorld(
				{ id: "w1", ownerUserId: ME },
				[
					{ worldId: "w1", ownerId: ME },
					{ worldId: "w1", ownerId: OTHER },
				],
				ME,
			),
		).toBe(true);
	});

	it("campanha de outra pessoa em outro mundo não conta", () => {
		expect(
			isSharedWorld(
				{ id: "w1", ownerUserId: ME },
				[{ worldId: "w2", ownerId: OTHER }],
				ME,
			),
		).toBe(false);
	});

	it("sem usuário não marca nada", () => {
		expect(isSharedWorld({ id: "w1", ownerUserId: OTHER }, [], undefined)).toBe(
			false,
		);
	});
});
