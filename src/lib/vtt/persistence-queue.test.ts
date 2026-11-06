import { describe, expect, it } from "vitest";
import type {
	EnqueueIntent,
	PersistenceWrite,
	WriteFailure,
} from "./persistence-queue";
import {
	createPersistenceQueue,
	PersistenceWriteError,
} from "./persistence-queue";

const scope = { campaignId: "campaign-test", sceneId: "scene-a" };

interface Deferred {
	promise: Promise<undefined>;
	resolve: () => void;
	reject: (error: Error) => void;
}

function deferred(): Deferred {
	let resolve = (): void => undefined;
	let reject = (_error: Error): void => undefined;
	const promise = new Promise<undefined>((res, rej) => {
		resolve = () => res(undefined);
		reject = rej;
	});
	return { promise, resolve, reject };
}

function update(
	patch: Readonly<Record<string, unknown>>,
	overrides: Partial<EnqueueIntent> = {},
): EnqueueIntent {
	return {
		key: "token:a",
		scope,
		kind: "update",
		patch,
		...overrides,
	} as EnqueueIntent;
}

function setup(
	writes: PersistenceWrite[] = [],
	options: {
		clock?: () => number;
		respond?: (write: PersistenceWrite) => Promise<WriteFailure | undefined>;
		limits?: {
			maxEntities?: number;
			maxPayloadBytes?: number;
			maxConcurrentWriters?: number;
		};
	} = {},
) {
	const queue = createPersistenceQueue({
		userId: "test-user",
		sessionId: "tab-test",
		writer: (write) => {
			writes.push(write);
			if (options.respond) return options.respond(write);
			return Promise.resolve(undefined);
		},
		clock: options.clock ?? (() => 1000),
		limits: options.limits,
	});
	return queue;
}

const flushed = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("persistence queue ordering", () => {
	it("01/02: B leaves only after A; A settles superseded and never erases B", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const a = deferred();
		const b = deferred();
		const queue = setup(calls, {
			respond: () => (calls.length === 1 ? a.promise : b.promise),
		});
		const first = queue.enqueue(update({ x: 1 }));

		await flushed();
		expect(calls.map((call) => call.patch)).toEqual([{ x: 1 }]);
		const second = queue.enqueue(update({ x: 2 }));
		const third = queue.enqueue(update({ y: 3 }));
		expect(await second.completion).toMatchObject({ status: "superseded" });
		expect(queue.inspect("token:a")?.queued?.seq).toBe(3);
		expect(calls).toHaveLength(1);

		a.resolve();
		await flushed();
		expect(await first.completion).toMatchObject({ status: "superseded" });
		expect(calls.map((call) => [call.seq, call.patch])).toEqual([
			[1, { x: 1 }],
			[3, { x: 2, y: 3 }],
		]);
		expect(queue.inspect("token:a")?.status).toBe("saving");
		b.resolve();
		expect(await third.completion).toMatchObject({ status: "saved" });
		expect(queue.inspect("token:a")?.queued).toBeUndefined();
		expect(queue.getState().synced).toBe(true);
	});

	it("a clean ACK has no queued intent and status agrees with global synced", async (): Promise<undefined> => {
		const queue = setup();
		const done = queue.enqueue(update({ x: 1 }));
		expect(await done.completion).toMatchObject({ status: "saved" });

		const entity = queue.inspect("token:a");
		const state = queue.getState();
		expect(entity?.queued).toBeUndefined();
		expect(entity?.status).toBe("synced");
		expect(state.synced).toBe(true);
		expect(state.pendingEntities).toBe(0);
		expect(
			state.entities.filter(({ status }) => status === "synced"),
		).toHaveLength(state.pendingEntities === 0 && state.synced ? 1 : 0);
	});

	it("a last-ACK overlay is not a new write and is cleared on valid refetch", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const queue = setup(calls);
		await queue.enqueue(update({ x: 1 })).completion;
		expect(queue.inspect("token:a")?.pendingPatch).toEqual({ x: 1 });
		const generation = queue.beginReconnect(scope);
		expect(queue.finishRefetch("token:a", generation, "present")).toBe(true);
		expect(queue.inspect("token:a")?.pendingPatch).toBeUndefined();
		expect(queue.getState().synced).toBe(true);
		expect(calls).toHaveLength(1);
	});

	it("03: a permanent A error blocks only A, retaining the latest patch and allowing B/C", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const a = deferred();
		const queue = setup(calls, {
			respond: (call) =>
				call.key === "token:a" ? a.promise : Promise.resolve(undefined),
		});
		const failed = queue.enqueue(update({ x: 1 }));
		queue.enqueue(update({ x: 2 }, { key: "token:b" }));
		queue.enqueue(update({ x: 3 }, { key: "token:c" }));
		await flushed();
		a.reject(new PersistenceWriteError("permanent", "Sem permissão"));
		expect(await failed.completion).toMatchObject({ status: "failed" });

		const latest = queue.enqueue(update({ x: 9 }));
		expect(latest.accepted).toBe(false);
		expect(queue.inspect("token:a")?.pendingPatch).toMatchObject({ x: 9 });
		expect(queue.inspect("token:a")?.error?.kind).toBe("permanent");
		expect(calls.map((call) => call.key).sort()).toEqual([
			"token:a",
			"token:b",
			"token:c",
		]);
		expect(queue.getState().errorEntities).toBe(1);
		queue.retry("token:a");
		await flushed();
		expect(calls).toHaveLength(4);
	});

	it("05: patches coalesce across fields and keep the newest drag position", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const first = deferred();
		const queue = setup(calls, { respond: () => first.promise });
		queue.enqueue(update({ x: 1, rotation: 0 }));
		queue.enqueue(update({ x: 4 }));
		queue.enqueue(update({ rotation: 90 }));
		queue.enqueue(update({ x: 8, y: 2 }));
		first.resolve();
		await flushed();
		expect(calls[1]?.patch).toEqual({ x: 8, y: 2, rotation: 90 });
	});

	it("05: fog replaces a queued snapshot, including empty, without retaining stale strokes", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const first = deferred();
		const queue = setup(calls, { respond: () => first.promise });
		queue.enqueue(
			update(
				{ paths: ["a"] },
				{ kind: "snapshot", snapshot: ["a"], key: "fog:a" },
			),
		);
		queue.enqueue(update({}, { kind: "snapshot", snapshot: [], key: "fog:a" }));
		queue.enqueue(
			update({}, { kind: "snapshot", snapshot: ["new"], key: "fog:a" }),
		);
		first.resolve();
		await flushed();
		expect(calls[1]?.snapshot).toEqual(["new"]);
	});

	it("06: deleting once is idempotent and a queued delete supersedes an unsent update", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const first = deferred();
		const queue = setup(calls, { respond: () => first.promise });
		queue.enqueue(update({ x: 1 }));
		queue.enqueue(update({ x: 2 }));
		const removed = queue.enqueue(update({}, { kind: "delete" }));
		const again = queue.enqueue(update({}, { kind: "delete" }));
		expect(again.seq).toBe(removed.seq);
		expect(again.completion).toBe(removed.completion);
		first.resolve();
		await flushed();
		expect(calls[1]?.kind).toBe("delete");
		expect(again.completion).toBe(removed.completion);
		await removed.completion;
		queue.enqueue(update({}, { kind: "delete" }));
		await flushed();
		expect(calls.filter((call) => call.kind === "delete")).toHaveLength(1);
	});

	it("06/09: a failure from an old scene or generation cannot unlock the new one", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const first = deferred();
		const queue = setup(calls, { respond: () => first.promise });
		queue.enqueue(update({ x: 1 }));
		await flushed();
		const recovery = queue.beginReconnect(scope);
		queue.enqueue(update({ x: 2 }));
		first.reject(new PersistenceWriteError("permanent", "old scope"));
		await flushed();
		expect(queue.inspect("token:a")?.error).toBeUndefined();
		expect(queue.inspect("token:a")?.generation).toBe(recovery);
		expect(queue.finishRefetch("token:a", recovery, "present")).toBe(true);
		await flushed();
		expect(calls[1]?.generation).toBe(recovery);
		expect(calls[1]?.patch).toEqual({ x: 2 });
	});

	it("09: retry is single-flight and duplicate completion cannot become a create replay", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const first = deferred();
		const queue = setup(calls, { respond: () => first.promise });
		queue.markBase("token:a", scope);
		const created = queue.enqueue(
			update({ name: "A" }, { kind: "create", online: true }),
		);
		await flushed();
		queue.retry("token:a");
		queue.retry("token:a");
		queue.enqueue(update({ name: "B" }, { kind: "create", online: true }));
		expect(calls).toHaveLength(1);
		first.resolve();
		await first.resolve();
		expect(await created.completion).toMatchObject({ status: "saved" });
		await flushed();
		expect(calls).toHaveLength(1);
	});

	it("06: create is online-only and offline refusal is visible but not queued", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const queue = setup(calls);
		const receipt = queue.enqueue(
			update({ name: "offline" }, { kind: "create" }),
		);
		expect(receipt.accepted).toBe(false);
		expect(await receipt.completion).toMatchObject({ status: "failed" });
		expect(queue.inspect("token:a")?.status).toBe("error");
		expect(queue.inspect("token:a")?.queued).toBeUndefined();
		expect(queue.getState().synced).toBe(false);
		expect(calls).toHaveLength(0);
	});
});

describe("09: limits and recovery", () => {
	it("supports four writers globally, then drains without dropping another entity", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const releases: Deferred[] = [];
		const queue = setup(calls, {
			respond: () => {
				const next = deferred();
				releases.push(next);
				return next.promise;
			},
		});
		for (let i = 0; i < 5; i += 1) {
			queue.enqueue(update({ i }, { key: `token:${i}` }));
		}
		await flushed();
		expect(calls).toHaveLength(4);
		for (const release of releases) release.resolve();
		await flushed();
		expect(calls).toHaveLength(5);
	});

	it("keeps tokens from 50 entities, visibly errors at 51 and preserves an existing entity's latest gesture at the limit", () => {
		const calls: PersistenceWrite[] = [];
		const queue = setup(calls);
		for (let i = 0; i < 50; i += 1) {
			queue.enqueue(
				update(
					{ i },
					{ key: `token:${i}`, scope: { ...scope, sceneId: `scene-${i % 2}` } },
				),
			);
		}
		const rejected = queue.enqueue(
			update({ lost: true }, { key: "token:too-many" }),
		);
		expect(rejected.accepted).toBe(false);
		expect(queue.inspect("token:too-many")?.pendingPatch).toEqual({
			lost: true,
		});
		expect(queue.inspect("token:too-many")?.error?.kind).toBe("entity-limit");
		expect(queue.getState().errorEntities).toBe(1);

		const last = queue.enqueue(update({ latest: true }, { key: "token:0" }));
		expect(last.accepted).toBe(true);
		expect(queue.inspect("token:0")?.pendingPatch).toMatchObject({
			latest: true,
		});
	});

	it("counts UTF-8 bytes against 512KB, keeps an oversized local patch and never invokes the writer", () => {
		const calls: PersistenceWrite[] = [];
		const queue = setup(calls, { limits: { maxPayloadBytes: 20 } });
		const receipt = queue.enqueue(update({ text: "á".repeat(20) }));
		expect(receipt.accepted).toBe(false);
		expect(receipt.seq).toBe(1);
		expect(queue.inspect("token:a")?.pendingPatch).toEqual({
			text: "á".repeat(20),
		});
		expect(queue.inspect("token:a")?.error?.kind).toBe("payload-limit");
		expect(calls).toHaveLength(0);
	});

	it("08: refetch failure prevents synced and does not automatically replay", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const queue = setup(calls);
		queue.enqueue(update({ x: 1 }));
		await flushed();
		const epoch = queue.beginReconnect(scope);
		expect(queue.getState().synced).toBe(false);
		expect(
			queue.failRefetch(
				"token:a",
				epoch,
				new PersistenceWriteError("transient", "read failed"),
			),
		).toBe(true);
		expect(queue.getState().synced).toBe(false);
		expect(queue.inspect("token:a")?.error?.kind).toBe("transient");
		expect(calls).toHaveLength(1);
		expect(queue.finishRefetch("token:a", epoch, "present")).toBe(false);
		expect(
			queue.finishRefetch("token:a", queue.invalidate("token:a"), "present"),
		).toBe(true);
		expect(queue.getState().synced).toBe(true);
	});

	it("06: a missing token with pending patch exposes a conflict and supports only explicit discard or restore", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const queue = setup(calls);
		queue.enqueue(update({ x: 1 }));
		await flushed();
		queue.beginReconnect(scope);
		const epoch = queue.invalidate("token:a");
		const latest = queue.enqueue(update({ x: 2 }));
		expect(queue.finishRefetch("token:a", epoch, "missing-confirmed")).toBe(
			true,
		);
		expect(queue.inspect("token:a")?.status).toBe("conflict");
		expect(queue.inspect("token:a")?.pendingPatch).toEqual({ x: 2 });
		expect(queue.resolveMissing("token:absent", "discard")).toBe(false);
		await flushed();
		expect(queue.resolveMissing("token:a", "restore")).toBe(true);
		await flushed();
		await latest.completion;
		expect(calls.filter((call) => call.kind === "create")).toHaveLength(0);
	});

	it("06: explicit discard on missing token clears only that conflict, and other scenes retain backlog", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const otherWrite = deferred();
		const queue = setup(calls, {
			respond: (write) =>
				write.scope.sceneId === "scene-b"
					? otherWrite.promise
					: Promise.resolve(undefined),
		});
		const other = { ...scope, sceneId: "scene-b" };
		queue.enqueue(update({ x: 1 }));
		queue.enqueue(update({ x: 7 }, { key: "token:b", scope: other }));
		await flushed();
		queue.beginReconnect(scope);
		const epoch = queue.invalidate("token:a");
		queue.enqueue(update({ x: 2 }));
		queue.finishRefetch("token:a", epoch, "missing-confirmed");
		expect(queue.resolveMissing("token:a", "discard")).toBe(true);
		expect(queue.inspect("token:a")?.queued).toBeUndefined();
		expect(queue.inspect("token:b")?.pendingPatch).toEqual({ x: 7 });
		otherWrite.resolve();
	});
});

describe("10: identity and clock", () => {
	it("SIGNED_OUT preserves backlog and same-user restoration resumes it", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		const first = deferred();
		const queue = setup(calls, { respond: () => first.promise });
		queue.enqueue(update({ x: 1 }));
		const pending = queue.enqueue(update({ x: 2 }));
		queue.signOut();
		first.resolve();
		await flushed();
		expect(calls).toHaveLength(1);
		expect(queue.getState().sessionWarning).toBe("signed-out");
		expect(queue.getState().synced).toBe(false);
		expect(queue.inspect("token:a")?.pendingPatch).toEqual({ x: 2 });
		queue.resume("test-user");
		expect(queue.getState().sessionWarning).toBeNull();
		const generation = queue.invalidate("token:a");
		expect(queue.finishRefetch("token:a", generation, "present")).toBe(true);
		await pending.completion;
		expect(calls).toHaveLength(2);
	});

	it("a different user cannot replay backlog; explicit mismatch discard is the only removal", () => {
		const calls: PersistenceWrite[] = [];
		const queue = setup(calls, { respond: () => Promise.resolve(undefined) });
		queue.enqueue(update({ x: 1 }));
		queue.signOut();
		queue.resume("different-user");
		expect(queue.getState().sessionWarning).toBe("user-mismatch");
		expect(queue.discardAfterUserMismatch()).toBe(true);
		expect(queue.getState().entities).toHaveLength(0);
	});

	it("clock changes never create new revisions or change the local winner", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		let now = 100;
		const queue = setup(calls, { clock: () => now });
		queue.enqueue(update({ x: 1 }));
		now = 99999;
		queue.enqueue(update({ x: 2 }));
		now = -100;
		queue.enqueue(update({ x: 3 }));
		await flushed();
		expect(calls.map((call) => call.seq)).toEqual([1, 3]);
		expect(calls.map((call) => call.sentAt)).toEqual([100, -100]);
		expect(calls.map((call) => call.patch)).toEqual([{ x: 1 }, { x: 3 }]);
	});
});

describe("A1", () => {
	it("two independent browsers retain server LWW semantics; local seq is not CAS", async (): Promise<undefined> => {
		let server = 0;
		const calls: PersistenceWrite[] = [];
		const respond = async (write: PersistenceWrite): Promise<undefined> => {
			server = Number(write.patch?.x);
		};
		const a = setup(calls, { respond });
		const b = setup(calls, { respond });
		await a.enqueue(update({ x: 1 })).completion;
		await b.enqueue(update({ x: 2 })).completion;
		expect(server).toBe(2);
		expect(calls.map((call) => call.seq)).toEqual([1, 1]);
	});
});

describe("writer failures", () => {
	it("keeps the same revision for a transient failure and retries it once", async (): Promise<undefined> => {
		const calls: PersistenceWrite[] = [];
		let fail = true;
		const queue = setup(calls, {
			respond: () => {
				if (fail) {
					fail = false;
					return Promise.reject(
						new PersistenceWriteError("transient", "network"),
					);
				}
				return Promise.resolve(undefined);
			},
		});
		const first = queue.enqueue(update({ x: 1 }));
		expect(await first.completion).toMatchObject({ status: "failed" });
		expect(queue.inspect("token:a")?.seq).toBe(1);
		const retry = queue.retry("token:a");
		expect(retry).not.toBeNull();
		await flushed();
		expect(calls).toHaveLength(2);
		expect(calls[1]?.seq).toBe(1);
		expect(await retry?.completion).toMatchObject({ status: "saved" });
	});

	it("accepts a typed failure result from an injected writer", async (): Promise<undefined> => {
		const failure: WriteFailure = { kind: "permanent", message: "denied" };
		const queue = createPersistenceQueue({
			userId: "test-user",
			sessionId: "tab-test",
			clock: () => 1000,
			writer: () => Promise.resolve(failure),
		});
		const receipt = queue.enqueue(update({ x: 1 }));
		expect(await receipt.completion).toMatchObject({ status: "failed" });
		expect(queue.inspect("token:a")?.error).toEqual(failure);
	});
});

// Additional edge coverage is intentionally kept with the main queue behavior suite.
