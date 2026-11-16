import { beforeEach, describe, expect, it } from "vitest";
import { shouldPlayPingSound } from "./audio";
import {
	type ActivePing,
	admitPing,
	createPingAnimationLoop,
	emptyPingQueue,
	expirePings,
	incomingPing,
	PING_MAX_ACTIVE,
	PING_THROTTLE_MS,
	PING_TTL_MS,
	type PingInput,
	type PingQueueState,
	pingVisual,
	removePingById,
} from "./ping-queue";
import { useVTTStore } from "./vtt-store";

const idOf = (userId: string, seq: number) => `${userId}:${seq}`;

function sample(userId: string, overrides: Partial<PingInput> = {}): PingInput {
	return {
		x: 10,
		y: 20,
		userId,
		userName: userId,
		color: "#38bdf8",
		timestamp: 0,
		...overrides,
	};
}

function admit(
	state: PingQueueState,
	input: PingInput,
	now: number,
): ReturnType<typeof admitPing> {
	return admitPing(state, input, now, idOf);
}

describe("ping queue", () => {
	it("accepts one ping per user inside 150ms and drops the other 29", () => {
		let state = emptyPingQueue();
		let kept = 0;
		for (let i = 0; i < 30; i++) {
			const result = admit(state, sample("ada", { timestamp: 1_000 }), 1_000);
			state = result.state;
			if (result.ping) kept += 1;
		}
		expect(kept).toBe(1);
		expect(state.pings).toHaveLength(1);
	});

	it("throttles each user on their own clock", () => {
		const state = emptyPingQueue();
		const ada = admit(state, sample("ada", { timestamp: 1_000 }), 1_000);
		const bia = admit(ada.state, sample("bia", { timestamp: 1_000 }), 1_000);
		expect(ada.ping).not.toBeNull();
		expect(bia.ping).not.toBeNull();
		const again = admit(bia.state, sample("ada", { timestamp: 1_100 }), 1_149);
		expect(again.ping).toBeNull();
		expect(again.state.pings).toBe(bia.state.pings);
		const later = admit(
			again.state,
			sample("ada", { id: "ada-later", timestamp: 1_150 }),
			1_000 + PING_THROTTLE_MS,
		);
		expect(later.ping?.id).toBe("ada-later");
	});

	it("keeps at most 12 pings and drops the earliest one that was admitted", () => {
		let state = emptyPingQueue();
		let now = 10_000;
		const ids: string[] = [];
		for (let i = 0; i < 20; i++) {
			const id = `p-${i}`;
			const result = admit(state, sample("ada", { id, timestamp: now }), now);
			expect(result.ping?.id).toBe(id);
			state = result.state;
			ids.push(id);
			now += PING_THROTTLE_MS;
		}
		expect(state.pings).toHaveLength(PING_MAX_ACTIVE);
		expect(state.pings.map((ping) => ping.id)).toEqual(ids.slice(8));

		const at = now - 1;
		const blocked = admit(
			state,
			sample("ada", { id: "blocked", timestamp: at }),
			at,
		);
		expect(blocked.ping).toBeNull();
		expect(blocked.state.pings).toBe(state.pings);

		const bia = admit(
			blocked.state,
			sample("bia", { id: "bia-new", timestamp: at }),
			at,
		);
		expect(bia.state.pings).toHaveLength(PING_MAX_ACTIVE);
		expect(bia.state.pings[0]?.id).toBe("p-9");
		expect(bia.state.pings.at(-1)?.id).toBe("bia-new");
	});

	it("removes by id when two users share a timestamp", () => {
		let state = emptyPingQueue();
		state = admit(state, sample("ada", { id: "ada", timestamp: 50 }), 50).state;
		state = admit(state, sample("bia", { id: "bia", timestamp: 50 }), 50).state;
		expect(state.pings.map((ping) => ping.timestamp)).toEqual([50, 50]);
		const left = removePingById(state, "ada");
		expect(left.pings.map((ping) => ping.id)).toEqual(["bia"]);
		expect(expirePings(left, 50 + PING_TTL_MS).removedIds).toEqual(["bia"]);
	});

	it("expires each ping on its own id without reordering the rest", () => {
		let state = emptyPingQueue();
		state = admit(state, sample("ada", { id: "old", timestamp: 0 }), 0).state;
		state = admit(
			state,
			sample("bia", { id: "new", timestamp: 1_000 }),
			1_000,
		).state;
		const mid = expirePings(state, PING_TTL_MS);
		expect(mid.removedIds).toEqual(["old"]);
		expect(mid.state.pings.map((ping) => ping.id)).toEqual(["new"]);
		const done = expirePings(mid.state, 1_000 + PING_TTL_MS);
		expect(done.state.pings).toEqual([]);
	});

	it("assigns userId:seq when the broadcast has no id and ignores a duplicate id", () => {
		const first = admit(emptyPingQueue(), sample("ada"), 0);
		expect(first.ping?.id).toBe("ada:1");
		const duplicate = admit(
			first.state,
			sample("ada", { id: "ada:1", timestamp: 500 }),
			500,
		);
		expect(duplicate.ping).toBeNull();
		const second = admit(
			duplicate.state,
			sample("ada", { timestamp: 500 }),
			500,
		);
		expect(second.ping?.id).toBe("ada:2");
	});

	it("does not let a repeated id refresh the throttle", () => {
		const state = admit(
			emptyPingQueue(),
			sample("ada", { id: "x", timestamp: 0 }),
			0,
		).state;
		const duplicate = admit(
			state,
			sample("ada", { id: "x", timestamp: 1_000 }),
			1_000,
		);
		expect(duplicate.ping).toBeNull();
		const next = admit(
			duplicate.state,
			sample("ada", { id: "y", timestamp: 1_000 }),
			1_000,
		);
		expect(next.ping?.id).toBe("y");
	});

	it("drops a ping that is already past the ttl without consuming the throttle", () => {
		const stale = admit(
			emptyPingQueue(),
			sample("ada", { id: "stale", timestamp: 0 }),
			PING_TTL_MS,
		);
		expect(stale.ping).toBeNull();
		const fresh = admit(
			stale.state,
			sample("ada", { id: "fresh", timestamp: PING_TTL_MS }),
			PING_TTL_MS,
		);
		expect(fresh.ping?.id).toBe("fresh");
	});

	it("changes radius and alpha with time and ends at the ttl", () => {
		expect(pingVisual(0, 0)).toEqual({ alive: true, radius: 20, alpha: 1 });
		expect(pingVisual(0, 1_500).radius).toBe(50);
		expect(pingVisual(0, 1_500).alpha).toBeCloseTo(0.5);
		expect(pingVisual(0, PING_TTL_MS - 1).alive).toBe(true);
		expect(pingVisual(0, PING_TTL_MS).alive).toBe(false);
		expect(pingVisual(500, 0)).toEqual({ alive: true, radius: 20, alpha: 1 });
	});
});

describe("incoming ping", () => {
	it("keeps a sender id and invents nothing sensitive", () => {
		const bare = incomingPing({
			x: 3,
			y: 4,
			userId: "ada",
			timestamp: 9,
		});
		expect(bare).toEqual({
			x: 3,
			y: 4,
			userId: "ada",
			userName: "Aventureiro",
			color: "#a855f7",
			timestamp: 9,
		});
		expect(bare && "id" in bare).toBe(false);
		const tagged = incomingPing({
			x: 3,
			y: 4,
			userId: "ada",
			userName: "Ada",
			color: "#ffffff",
			timestamp: 9,
			id: "ada:4",
			note: "segredo",
		} as Partial<PingInput> & { note: string });
		expect(tagged).toEqual({
			id: "ada:4",
			x: 3,
			y: 4,
			userId: "ada",
			userName: "Ada",
			color: "#ffffff",
			timestamp: 9,
		});
	});

	it("rejects a payload without a user", () => {
		expect(incomingPing(null)).toBeNull();
		expect(incomingPing({ x: 1, y: 2, timestamp: 3 })).toBeNull();
	});
});

describe("ping animation loop", () => {
	it("draws in the same turn the ping arrives, then on the ticker until it ends", () => {
		const pings: ActivePing[] = [];
		const tickers: Array<() => void> = [];
		let now = 1_000;
		let drawn = 0;
		let cleared = 0;
		const removed: string[] = [];
		const loop = createPingAnimationLoop({
			now: () => now,
			getPings: () => pings,
			removeIds: (ids) => {
				removed.push(...ids);
				for (const id of ids) {
					const index = pings.findIndex((ping) => ping.id === id);
					if (index >= 0) pings.splice(index, 1);
				}
			},
			draw: () => {
				drawn += 1;
			},
			clear: () => {
				cleared += 1;
			},
			addTicker: (tick) => {
				tickers.push(tick);
			},
			removeTicker: (tick) => {
				const index = tickers.indexOf(tick);
				if (index >= 0) tickers.splice(index, 1);
			},
		});

		loop.sync();
		expect(tickers).toHaveLength(0);

		pings.push({
			id: "p1",
			x: 1,
			y: 2,
			userId: "ada",
			userName: "Ada",
			color: "#fff",
			timestamp: 1_000,
		});
		loop.sync();
		expect(tickers).toHaveLength(1);
		expect(loop.stats().adds).toBe(1);
		expect(loop.stats().maxActive).toBe(1);
		expect(drawn).toBe(1);
		const radiusAtStart = loop.stats().lastRadius;
		expect(radiusAtStart).toBe(20);

		const tick = tickers[0];
		if (!tick) throw new Error("ticker ausente");
		now = 1_600;
		tick();
		expect(drawn).toBe(2);
		expect(loop.stats().lastRadius).toBeGreaterThan(radiusAtStart);
		expect(loop.stats().lastAlpha).toBeLessThan(1);

		now = 1_000 + PING_TTL_MS;
		tick();
		expect(removed).toEqual(["p1"]);
		expect(pings).toHaveLength(0);
		expect(tickers).toHaveLength(0);
		expect(loop.stats().attached).toBe(false);
		expect(cleared).toBeGreaterThan(0);
		const ticks = loop.stats().ticks;
		tick();
		expect(loop.stats().ticks).toBe(ticks);
		loop.sync();
		expect(loop.stats().adds).toBe(1);
	});
});

describe("ping store", () => {
	beforeEach(() => {
		useVTTStore.setState({
			activeSceneId: "scene-a",
			activePings: [],
			pingAdmission: { lastAcceptedAt: {}, seq: 1 },
		});
	});

	it("does not remove the other user when timestamps match", () => {
		const store = useVTTStore.getState();
		const ada = store.addPing(sample("ada", { id: "ada", timestamp: 80 }), 80);
		const bia = useVTTStore
			.getState()
			.addPing(sample("bia", { id: "bia", timestamp: 80 }), 80);
		expect(ada?.id).toBe("ada");
		expect(bia?.id).toBe("bia");
		useVTTStore.getState().removePing("ada");
		expect(useVTTStore.getState().activePings.map((ping) => ping.id)).toEqual([
			"bia",
		]);
	});

	it("returns null for a throttled local ping so the caller can skip the broadcast", () => {
		const first = useVTTStore
			.getState()
			.addPing(sample("ada", { timestamp: 200 }), 200);
		expect(first).not.toBeNull();
		const before = useVTTStore.getState().activePings;
		const second = useVTTStore
			.getState()
			.addPing(sample("ada", { timestamp: 250 }), 250);
		expect(second).toBeNull();
		expect(useVTTStore.getState().activePings).toBe(before);
	});

	it("clears the throttle when the scene changes", () => {
		useVTTStore.getState().addPing(sample("ada", { timestamp: 1_000 }), 1_000);
		useVTTStore.getState().setActiveSceneId("scene-b");
		expect(useVTTStore.getState().activePings).toEqual([]);
		const next = useVTTStore
			.getState()
			.addPing(sample("ada", { id: "next", timestamp: 1_100 }), 1_100);
		expect(next?.id).toBe("next");
	});
});

describe("ping audio throttle", () => {
	it("plays the first sound and drops anything closer than 150ms", () => {
		expect(shouldPlayPingSound(null, 0)).toBe(true);
		expect(shouldPlayPingSound(0, PING_THROTTLE_MS - 1)).toBe(false);
		expect(shouldPlayPingSound(0, PING_THROTTLE_MS)).toBe(true);
	});
});

describe("pings com tipo", () => {
	it("o tipo e o personagem-alvo passam da entrada para o ping aceito", () => {
		const result = admit(
			emptyPingQueue(),
			sample("ada", { timestamp: 1_000, kind: "highlight", tokenId: "tok-1" }),
			1_000,
		);
		expect(result.ping?.kind).toBe("highlight");
		expect(result.ping?.tokenId).toBe("tok-1");
		expect(result.state.pings[0]?.kind).toBe("highlight");
	});

	it("ping sem tipo continua sem tipo (compatível com o broadcast antigo)", () => {
		const result = admit(
			emptyPingQueue(),
			sample("ada", { timestamp: 1_000 }),
			1_000,
		);
		expect(result.ping && "kind" in result.ping).toBe(false);
		expect(result.ping && "tokenId" in result.ping).toBe(false);
	});

	it("cada tipo vive o seu tempo: o destaque passa dos 3 s do ping comum", () => {
		let state = emptyPingQueue();
		state = admit(
			state,
			sample("ada", { timestamp: 0, kind: "attention" }),
			0,
		).state;
		state = admit(
			state,
			sample("bia", { timestamp: 0, kind: "highlight", tokenId: "t" }),
			0,
		).state;
		const at3100 = expirePings(state, 3_100);
		expect(at3100.state.pings.map((p) => p.userId)).toEqual(["bia"]);
		expect(at3100.removedIds).toHaveLength(1);
		const at4600 = expirePings(at3100.state, 4_600);
		expect(at4600.state.pings).toEqual([]);
	});

	it("um destaque que chega com 3,5 s de atraso ainda vale; um comum com o mesmo atraso não", () => {
		const late = admit(
			emptyPingQueue(),
			sample("ada", { timestamp: 0, kind: "highlight", tokenId: "t" }),
			3_500,
		);
		expect(late.ping).not.toBeNull();
		const lateCommon = admit(
			emptyPingQueue(),
			sample("ada", { timestamp: 0 }),
			3_500,
		);
		expect(lateCommon.ping).toBeNull();
	});
});

describe("incomingPing com tipo", () => {
	const base = { x: 1, y: 2, userId: "u", timestamp: 5 };

	it("lê o tipo e o alvo", () => {
		expect(incomingPing({ ...base, kind: "danger" })?.kind).toBe("danger");
		const hi = incomingPing({ ...base, kind: "highlight", tokenId: "t-9" });
		expect(hi?.kind).toBe("highlight");
		expect(hi?.tokenId).toBe("t-9");
	});

	it("sem tipo no evento (versão antiga): fica sem tipo", () => {
		const ping = incomingPing(base);
		expect(ping && "kind" in ping).toBe(false);
	});

	it("tipo desconhecido ou malicioso vira ping comum", () => {
		for (const kind of ["nuke", "", 42, null, {}, "__proto__"]) {
			expect(incomingPing({ ...base, kind })?.kind).toBe("attention");
		}
	});

	it("alvo que não é texto, vazio ou gigante é ignorado", () => {
		for (const tokenId of [7, "", null, {}, "x".repeat(81)]) {
			const ping = incomingPing({ ...base, kind: "highlight", tokenId });
			expect(ping && "tokenId" in ping).toBe(false);
		}
		expect(
			incomingPing({ ...base, tokenId: "x".repeat(80) })?.tokenId,
		).toHaveLength(80);
	});
});
