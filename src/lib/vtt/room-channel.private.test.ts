import type { RealtimeChannel } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { vttGmOnlyTopic, vttGmTopic, vttUserTopic } from "./private-topics";
import {
	attachRoomHandlers,
	openPrivateRoom,
	type RoomInboundContext,
	type RoomRealtimeClient,
	type RoomTransport,
	routeOutbound,
} from "./room-channel";

const C = "11111111-1111-4111-8111-111111111111";
const S = "22222222-2222-4222-8222-222222222222";
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

type Handler = (payload: unknown) => void;

class FakeChannel {
	topic: string;
	options: unknown;
	handlers = new Map<string, Handler>();
	sent: unknown[] = [];
	tracked: unknown[] = [];
	subscribed = false;
	subscribeOrder: number | null = null;
	statusCb: ((status: string) => unknown) | null = null;
	constructor(
		name: string,
		options: unknown,
		private readonly onSubscribe: () => number,
	) {
		this.topic = name;
		this.options = options;
	}
	on(type: string, filter: { event?: string }, cb: Handler) {
		this.handlers.set(`${type}:${filter?.event ?? ""}`, cb);
		return this;
	}
	subscribe(cb?: (status: string) => unknown) {
		this.subscribed = true;
		this.subscribeOrder = this.onSubscribe();
		this.statusCb = cb ?? null;
		return this;
	}
	send(message: unknown) {
		this.sent.push(message);
		return Promise.resolve("ok");
	}
	track(payload: unknown) {
		this.tracked.push(payload);
		return Promise.resolve("ok");
	}
	presenceState() {
		return {};
	}
}

function fakeClient() {
	const channels: FakeChannel[] = [];
	let authAt: number | null = null;
	let seq = 0;
	const client: RoomRealtimeClient & {
		channels: FakeChannel[];
		authAt: () => number | null;
	} = {
		channels,
		authAt: () => authAt,
		realtime: {
			setAuth: async () => {
				authAt = ++seq;
			},
		},
		channel(name, opts) {
			const ch = new FakeChannel(name, opts, () => ++seq);
			channels.push(ch);
			return ch as unknown as RealtimeChannel;
		},
		removeChannel() {},
	};
	return client;
}

function ctx(over: Partial<RoomInboundContext> = {}): {
	ctx: RoomInboundContext;
	discards: string[];
	fog: unknown[];
	pings: unknown[];
} {
	const discards: string[] = [];
	const fog: unknown[] = [];
	const pings: unknown[] = [];
	const context = {
		campaignId: C,
		sceneId: S,
		selfUserId: A,
		isCancelled: () => false,
		vtt: () =>
			({
				activeSceneId: S,
				showRemoteCursors: true,
				onlineUsers: [],
				remoteMeasurements: {},
				viewport: { x: 0, y: 0, scale: 1 },
				placedTemplates: [],
				remoteTemplates: {},
				reconcileUserColor: () => {},
				setTokenTargetPositions: () => {},
				removeTemplatesByIds: () => {},
				setRemoteTemplatePreview: () => {},
			}) as never,
		explored: () =>
			({ applyRemote: () => {}, unmark: () => {}, clear: () => {} }) as never,
		roleSource: () => ({
			ownerId: A,
			memberships: [
				{ userId: A, role: "owner" },
				{ userId: B, role: "viewer" },
			],
		}),
		readScreen: () => ({ width: 800, height: 600 }),
		playPing: () => {},
		pullCamera: () => {},
		recordDiscard: (reason: string) => {
			discards.push(reason);
		},
		actions: {
			setOnlineUsers: () => {},
			setTokenTargetPosition: () => {},
			setRemoteCursor: () => {},
			removeRemoteCursor: () => {},
			setRemoteMeasurement: () => {},
			addPing: (ping: unknown) => {
				pings.push(ping);
				return ping;
			},
			addFogPath: (path: unknown) => {
				fog.push(path);
			},
			setFogPaths: (paths: unknown) => {
				fog.push(paths);
			},
			setRemoteTemplate: () => {},
		},
		...over,
	} as RoomInboundContext;
	return { ctx: context, discards, fog, pings };
}

describe("routeOutbound", () => {
	it("névoa e reset de exploração no gm", () => {
		expect(routeOutbound("fog_update")).toBe("gm");
		expect(routeOutbound("explored_reset")).toBe("gm");
		expect(routeOutbound("explored_cells")).toBe("own");
	});
	it("ping de foco ou atenção do mestre no gm; ping comum no próprio", () => {
		expect(routeOutbound("ping", { pingKind: "focus", isGmOrCoGm: true })).toBe(
			"gm",
		);
		expect(
			routeOutbound("ping", { pingKind: "attention", isGmOrCoGm: true }),
		).toBe("gm");
		expect(
			routeOutbound("ping", { pingKind: "attention", isGmOrCoGm: false }),
		).toBe("own");
		expect(routeOutbound("ping", { pingKind: "danger" })).toBe("own");
	});
	it("arrasto oculto ou da camada gm no gmonly", () => {
		expect(routeOutbound("token_drag", { tokenHiddenOrGm: true })).toBe(
			"gmonly",
		);
		expect(routeOutbound("token_drag")).toBe("own");
	});
});

describe("openPrivateRoom", () => {
	it("chama setAuth antes de qualquer subscribe e abre tópicos privados", async () => {
		const client = fakeClient();
		await openPrivateRoom({
			client,
			campaignId: C,
			sceneId: S,
			selfUserId: A,
			memberUserIds: [A, B],
			isGmOrCoGm: true,
			ctx: ctx().ctx,
		});
		const authAt = client.authAt();
		expect(authAt).not.toBeNull();
		expect(client.channels.length).toBe(4); // own, gm, gmonly, B
		const names = client.channels.map((c) => c.topic).sort();
		expect(names).toEqual(
			[
				vttUserTopic(C, S, A),
				vttUserTopic(C, S, B),
				vttGmTopic(C, S),
				vttGmOnlyTopic(C, S),
			].sort(),
		);
		for (const ch of client.channels) {
			expect(ch.options).toEqual(
				expect.objectContaining({
					config: expect.objectContaining({ private: true }),
				}),
			);
			expect(ch.subscribed).toBe(true);
			expect(ch.subscribeOrder).toBeGreaterThan(authAt as number);
		}
	});

	it("jogador não assina gmonly", async () => {
		const client = fakeClient();
		await openPrivateRoom({
			client,
			campaignId: C,
			sceneId: S,
			selfUserId: B,
			memberUserIds: [A, B],
			isGmOrCoGm: false,
			ctx: ctx().ctx,
		});
		expect(client.channels.some((c) => c.topic === vttGmOnlyTopic(C, S))).toBe(
			false,
		);
		expect(client.channels.some((c) => c.topic === vttGmTopic(C, S))).toBe(
			true,
		);
	});

	it("envia névoa no gm e arrasto oculto no gmonly", async () => {
		const client = fakeClient();
		const opened = await openPrivateRoom({
			client,
			campaignId: C,
			sceneId: S,
			selfUserId: A,
			memberUserIds: [A, B],
			isGmOrCoGm: true,
			ctx: ctx().ctx,
		});
		const transport: RoomTransport = opened.transport;
		transport.send({
			type: "broadcast",
			event: "fog_update",
			payload: { paths: [] },
		});
		transport.send(
			{
				type: "broadcast",
				event: "token_drag",
				payload: { tokenId: "t", x: 1, y: 2, userId: A },
			},
			{ tokenHiddenOrGm: true },
		);
		const gm = client.channels.find((c) => c.topic === vttGmTopic(C, S));
		const hidden = client.channels.find(
			(c) => c.topic === vttGmOnlyTopic(C, S),
		);
		expect(gm?.sent).toHaveLength(1);
		expect(hidden?.sent).toHaveLength(1);
	});
});

describe("descarte no canal errado", () => {
	it("B4: fog_update no u:B é descartado; no gm entra", () => {
		const { ctx: context, discards, fog } = ctx();
		const handlers: Record<string, Handler> = {};
		const channel = {
			topic: vttUserTopic(C, S, B),
			on(type: string, filter: { event?: string }, cb: Handler) {
				handlers[`${type}:${filter?.event}`] = cb;
				return channel;
			},
			presenceState: () => ({}),
		};
		attachRoomHandlers(
			channel as unknown as RealtimeChannel,
			context,
			channel.topic,
		);
		handlers["broadcast:fog_update"]({ payload: { path: { id: "p" } } });
		expect(discards).toEqual(["gm_topic_only"]);
		expect(fog).toHaveLength(0);

		const gmHandlers: Record<string, Handler> = {};
		const gm = {
			on(type: string, filter: { event?: string }, cb: Handler) {
				gmHandlers[`${type}:${filter?.event}`] = cb;
				return gm;
			},
			presenceState: () => ({}),
		};
		attachRoomHandlers(
			gm as unknown as RealtimeChannel,
			context,
			vttGmTopic(C, S),
		);
		gmHandlers["broadcast:fog_update"]({ payload: { path: { id: "p" } } });
		expect(fog).toHaveLength(1);
	});

	it("B5: payload dizendo ser o mestre em u:B é descartado", () => {
		const { ctx: context, discards, pings } = ctx();
		const handlers: Record<string, Handler> = {};
		const channel = {
			on(type: string, filter: { event?: string }, cb: Handler) {
				handlers[`${type}:${filter?.event}`] = cb;
				return channel;
			},
			presenceState: () => ({}),
		};
		attachRoomHandlers(
			channel as unknown as RealtimeChannel,
			context,
			vttUserTopic(C, S, B),
		);
		handlers["broadcast:ping"]({
			payload: {
				id: "p",
				x: 1,
				y: 2,
				userId: A,
				userName: "Mestre",
				color: "#fff",
				timestamp: 1,
			},
		});
		expect(discards).toEqual(["sender_mismatch"]);
		expect(pings).toHaveLength(0);
	});
});

describe("presença entre canais", () => {
	it("junta a presença de dois tópicos em vez de um sobrescrever o outro", async () => {
		const online: unknown[][] = [];
		const context = ctx({
			actions: {
				...ctx().ctx.actions,
				setOnlineUsers: (users: unknown[]) => {
					online.push(users);
				},
			},
		}).ctx;
		context.presenceByTopic = new Map();
		const client = fakeClient();
		await openPrivateRoom({
			client,
			campaignId: C,
			sceneId: S,
			selfUserId: A,
			memberUserIds: [A, B],
			isGmOrCoGm: true,
			ctx: context,
		});
		const own = client.channels.find((c) => c.topic === vttUserTopic(C, S, A));
		const other = client.channels.find(
			(c) => c.topic === vttUserTopic(C, S, B),
		);
		if (!own || !other) throw new Error("canais u:A e u:B deveriam existir");
		own.presenceState = () =>
			({
				[A]: [{ userId: A, userName: "A", color: "#a", onlineAt: 1 }],
			}) as never;
		other.presenceState = () =>
			({
				[B]: [{ userId: B, userName: "B", color: "#b", onlineAt: 2 }],
			}) as never;
		own.handlers.get("presence:sync")?.({});
		other.handlers.get("presence:sync")?.({});
		const last = online.at(-1) as Array<{ userId: string }>;
		expect(last.map((u) => u.userId).sort()).toEqual([A, B].sort());
	});
});
