import { describe, expect, it } from "vitest";
import type { PendingDelete, PendingPatch } from "./persistence-reconcile";
import {
	reconcileDelete,
	reconcilePatch,
	reconcileRemoteMap,
	reconcileSnapshot,
} from "./persistence-reconcile";

const scope = { campaignId: "campaign-test", sceneId: "scene-a" };

function pending(
	patch: Readonly<Record<string, unknown>>,
	seq = 2,
): PendingPatch {
	return {
		key: "token:a",
		scope,
		seq,
		generation: 1,
		kind: "update",
		patch,
	};
}

function removal(seq = 3): PendingDelete {
	return {
		key: "token:a",
		scope,
		seq,
		generation: 1,
		kind: "delete",
	};
}

describe("reconcilePatch", () => {
	it("07: preserves a local delta while accepting unrelated remote fields", () => {
		const result = reconcilePatch(
			{ x: 10, y: 20, name: "old", hp: 8 },
			pending({ x: 99 }),
		);

		expect(result).toEqual({
			status: "pending",
			value: { x: 99, y: 20, name: "old", hp: 8 },
			pendingSeq: 2,
		});
	});

	it("07: returns only the server value when there is no pending write", () => {
		expect(reconcilePatch({ x: 7 }, undefined)).toEqual({
			status: "remote",
			value: { x: 7 },
		});
		expect(reconcilePatch<{ x: number }>(null, undefined)).toEqual({
			status: "absent",
			value: null,
		});
	});

	it("06: a missing readable token with a pending patch is a conflict, never a recreation", () => {
		expect(reconcilePatch<{ x: number }>(null, pending({ x: 4 }))).toEqual({
			status: "missing-conflict",
			value: null,
			pendingSeq: 2,
		});
	});

	it("06: an already absent remote entity completes a pending delete without a second write", () => {
		expect(reconcileDelete<{ x: number }>(null, removal())).toEqual({
			status: "deleted",
			value: null,
		});
	});

	it("06: same-key ties preserve the first revision and newer local intent wins on fields", () => {
		const first = pending({ x: 1, rotation: 90 }, 4);
		const newer = { ...first, seq: 5, patch: { x: 2 } };
		expect(reconcilePatch({ x: 0, rotation: 0 }, first).value).toEqual({
			x: 1,
			rotation: 90,
		});
		expect(reconcilePatch({ x: 0, rotation: 0 }, newer).value).toEqual({
			x: 2,
			rotation: 0,
		});
	});
});

describe("reconcileSnapshot", () => {
	it("05: replaces fog with the latest complete snapshot instead of concatenating paths", () => {
		const queued = {
			key: "fog:a",
			scope,
			seq: 4,
			generation: 1,
			kind: "snapshot" as const,
			snapshot: ["new-stroke"],
		};
		expect(
			reconcileSnapshot(["old-stroke", "other-client-stroke"], queued),
		).toEqual({
			status: "pending",
			value: ["new-stroke"],
			pendingSeq: 4,
		});
		expect(reconcileSnapshot(["remote"], undefined)).toEqual({
			status: "remote",
			value: ["remote"],
		});
	});
});

describe("reconcileRemoteMap", () => {
	it("06: partial refetches accept known fields and missing writes remain conflicts", () => {
		const result = reconcileRemoteMap(
			[
				{ key: "token:a", value: { x: 1, name: "A" }, present: true },
				{ key: "token:b", value: { x: 2, name: "B" }, present: true },
			],
			new Map<string, ReturnType<typeof pending>>([
				["token:a", pending({ x: 10 })],
				["token:b", pending({ x: 50 })],
			]),
		);
		expect(result.get("token:a")?.value).toEqual({ x: 10, name: "A" });
		expect(result.get("token:b")?.value).toEqual({ x: 50, name: "B" });
	});
});

it("06: partial remote entries never fabricate missing tokens", () => {
	const result = reconcileRemoteMap(
		[{ key: "token:a", value: null, present: false }],
		new Map([["token:a", pending({ x: 3 })]]),
	);
	expect(result.get("token:a")).toEqual({
		status: "missing-conflict",
		value: null,
		pendingSeq: 2,
	});
});
