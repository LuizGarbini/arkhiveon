import { describe, expect, it } from "vitest";
import { createPersistenceQueue } from "./persistence-queue";

const scope = { campaignId: "synthetic-campaign", sceneId: "scene-a" };
const userId = "synthetic-user";
const config = (
	respond: () => Promise<undefined> = () => Promise.resolve(undefined),
) =>
	createPersistenceQueue({
		userId,
		sessionId: "tab-test",
		clock: () => 1,
		writer: respond,
	});

describe("explicit persistence boundaries", () => {
	it("resumes the same identity with frozen pending and requires a refetch before sending", async (): Promise<undefined> => {
		let writes = 0;
		const queue = config(async (): Promise<undefined> => {
			writes += 1;
		});
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 1 } });
		await Promise.resolve(undefined);
		queue.signOut();
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 2 } });
		expect(writes).toBe(1);
		queue.resume(userId);
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 3 } });
		expect(writes).toBe(1);
		expect(queue.getState().synced).toBe(false);
		const generation = queue.invalidate("token:a");
		expect(queue.finishRefetch("token:a", generation, "present")).toBe(true);
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		expect(writes).toBe(2);
		expect(queue.getState().synced).toBe(true);
	});

	it("warns on a different identity and only explicit discard removes retained intent", () => {
		const queue = config();
		queue.signOut();
		queue.resume("other-synthetic-user");
		expect(queue.getState().sessionWarning).toBe("user-mismatch");
		expect(queue.discardAfterUserMismatch()).toBe(true);
		expect(queue.getState().entities).toHaveLength(0);
	});

	it("resume other user freezes queue and keeps local intent until explicit mismatch action", () => {
		const queue = config();
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 1 } });
		queue.signOut();
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 2 } });
		queue.resume("other-synthetic-user");
		expect(queue.getState().sessionWarning).toBe("user-mismatch");
		expect(queue.inspect("token:a")?.pendingPatch).toEqual({ x: 2 });
		expect(queue.getState().synced).toBe(false);
	});

	it("keeps the partial patch when token is known absent, and only explicit discard removes it", async (): Promise<undefined> => {
		const queue = config();
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 1 } });
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		const generation = queue.invalidate("token:a");
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 9 } });
		expect(
			queue.finishRefetch("token:a", generation, "missing-confirmed"),
		).toBe(true);
		expect(queue.inspect("token:a")?.status).toBe("conflict");
		expect(queue.getState().conflictEntities).toBe(1);
		expect(queue.getState().synced).toBe(false);
		expect(queue.inspect("token:a")?.pendingPatch).toEqual({ x: 9 });
		expect(queue.resolveMissing("token:a", "discard")).toBe(true);
		expect(queue.inspect("token:a")).toBeUndefined();
	});

	it("an unknown refetch result remains recovering and a confirmed retry resumes once", async (): Promise<undefined> => {
		let writes = 0;
		const queue = config(async (): Promise<undefined> => {
			writes += 1;
			return undefined;
		});
		const first = queue.enqueue({
			key: "token:a",
			scope,
			kind: "update",
			patch: { x: 1 },
		});
		await first.completion;
		const recovery = queue.invalidate("token:a");
		const pending = queue.enqueue({
			key: "token:a",
			scope,
			kind: "update",
			patch: { x: 2 },
		});
		expect(queue.finishRefetch("token:a", recovery, "unknown")).toBe(false);
		expect(queue.inspect("token:a")?.status).toBe("recovering");
		expect(writes).toBe(1);
		expect(queue.getState().synced).toBe(false);
		const retry = queue.invalidate("token:a");
		expect(queue.finishRefetch("token:a", retry, "present")).toBe(true);
		await pending.completion;
		expect(writes).toBe(2);
		expect(queue.getState().synced).toBe(true);
	});

	it("a known absent entity retains a new update only for explicit action", async (): Promise<undefined> => {
		const queue = config();
		const entity = {
			key: "token:a",
			scope,
			kind: "delete" as const,
			online: true,
		};
		const deletion = queue.enqueue(entity).completion;
		await deletion;
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 3 } });
		expect(queue.inspect("token:a")?.status).toBe("conflict");
		expect(queue.inspect("token:a")?.pendingPatch).toEqual({ x: 3 });
		queue.resolveMissing("token:a", "discard");
		expect(queue.inspect("token:a")).toBeUndefined();
		expect((await deletion).status).toBe("saved");
	});

	it("coalesced conflict patches settle the older promise without a write", async (): Promise<undefined> => {
		let writes = 0;
		const queue = config(async (): Promise<undefined> => {
			writes += 1;
			return undefined;
		});
		const saved = queue.enqueue({
			key: "token:a",
			scope,
			kind: "update",
			patch: { x: 1 },
		});
		await saved.completion;
		const recovery = queue.invalidate("token:a");
		const first = queue.enqueue({
			key: "token:a",
			scope,
			kind: "update",
			patch: { x: 2, rotation: 1 },
		});
		queue.finishRefetch("token:a", recovery, "missing-confirmed");
		const second = queue.enqueue({
			key: "token:a",
			scope,
			kind: "update",
			patch: { x: 3 },
		});
		expect(await first.completion).toMatchObject({ status: "superseded" });
		expect(queue.inspect("token:a")?.pendingPatch).toEqual({
			x: 3,
			rotation: 1,
		});
		queue.resolveMissing("token:a", "restore");
		await second.completion;
		expect(writes).toBe(2);
	});

	it("reconnection retains an uncertain in-flight update when no newer patch exists", async (): Promise<undefined> => {
		let release: (() => void) | undefined;
		let count = 0;
		const queue = config(() => {
			count += 1;
			if (count === 1) {
				return new Promise<undefined>((resolve) => {
					release = () => resolve(undefined);
				});
			}
			return Promise.resolve(undefined);
		});
		const first = queue.enqueue({
			key: "token:a",
			scope,
			kind: "update",
			patch: { x: 1 },
		});
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		const recovery = queue.invalidate("token:a");
		expect(queue.finishRefetch("token:a", recovery, "present")).toBe(true);
		expect(count).toBe(1);
		release?.();
		expect(await first.completion).toMatchObject({ status: "superseded" });
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		expect(count).toBe(2);
		expect(queue.inspect("token:a")?.pendingPatch).toBeUndefined();
		expect(queue.getState().synced).toBe(true);
	});

	it("an overflow collision preserves the newest different gesture", () => {
		const queue = createPersistenceQueue({
			userId,
			sessionId: "tab-test",
			clock: () => 1,
			writer: () => Promise.resolve(undefined),
			limits: { maxEntities: 1, maxPayloadBytes: 512, maxConcurrentWriters: 1 },
		});
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 1 } });
		queue.enqueue({ key: "token:b", scope, kind: "update", patch: { x: 2 } });
		queue.enqueue({ key: "token:b", scope, kind: "delete" });
		expect(queue.inspect("token:b")?.limitOverflow).toBe(true);
		queue.resolveLimit("token:b", "discard");
		expect(queue.inspect("token:b")).toBeUndefined();
	});

	it("holds overflow separately and releases it only after explicit action frees quota", async (): Promise<undefined> => {
		let writes = 0;
		const queue = createPersistenceQueue({
			userId,
			sessionId: "tab-test",
			clock: () => 1,
			writer: async (): Promise<undefined> => {
				writes += 1;
			},
			limits: { maxEntities: 1, maxConcurrentWriters: 1, maxPayloadBytes: 512 },
		});
		queue.enqueue({ key: "token:a", scope, kind: "update", patch: { x: 1 } });
		queue.enqueue({ key: "token:b", scope, kind: "update", patch: { x: 2 } });
		queue.enqueue({ key: "token:b", scope, kind: "update", patch: { x: 3 } });
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		expect(queue.inspect("token:b")?.limitOverflow).toBe(true);
		expect(queue.resolveLimit("token:b", "restore")).toBe(true);
		await new Promise<void>((resolve) => setTimeout(resolve, 0));
		expect(writes).toBe(2);
	});
});
