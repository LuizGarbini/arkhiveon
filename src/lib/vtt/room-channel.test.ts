import type { RealtimeChannel } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	attachRoomHandlers,
	handlePresenceLeave,
	handlePresenceSync,
	ROOM_BROADCAST_EVENTS,
	type RoomInboundContext,
	roomBroadcastHandlers,
	roomChannelOptions,
	roomDisplayName,
	roomMessages,
	roomPresencePayload,
	roomTopic,
} from "./room-channel";

const NOW = new Date("2026-11-22T06:00:00Z").getTime();

function makeCtx(over: Partial<Record<string, unknown>> = {}) {
	const explored = {
		applyRemote: vi.fn(),
		unmark: vi.fn(),
		clear: vi.fn(),
	};
	const state = {
		activeSceneId: "cena-1",
		showRemoteCursors: true,
		onlineUsers: [] as Array<Record<string, unknown>>,
		remoteMeasurements: {} as Record<string, unknown>,
		viewport: { x: 0, y: 0, scale: 1 },
		placedTemplates: [] as unknown[],
		remoteTemplates: {} as Record<string, unknown>,
		reconcileUserColor: vi.fn(),
		setTokenTargetPositions: vi.fn(),
		removeTemplatesByIds: vi.fn(),
		setRemoteTemplatePreview: vi.fn(),
		...over,
	};
	const actions = {
		setOnlineUsers: vi.fn(),
		setTokenTargetPosition: vi.fn(),
		setRemoteCursor: vi.fn(),
		removeRemoteCursor: vi.fn(),
		setRemoteMeasurement: vi.fn(),
		addPing: vi.fn((ping: { kind?: string }) => ({ kind: ping.kind })),
		addFogPath: vi.fn(),
		setFogPaths: vi.fn(),
		setRemoteTemplate: vi.fn(),
	};
	let cancelled = false;
	const role = {
		ownerId: "mestre" as string | null,
		memberships: [{ userId: "co", role: "editor" }],
	};
	const ctx = {
		sceneId: "cena-1",
		selfUserId: "eu",
		isCancelled: () => cancelled,
		vtt: () => state,
		explored: () => explored,
		roleSource: () => role,
		readScreen: () => ({ width: 800, height: 600 }),
		playPing: vi.fn(),
		pullCamera: vi.fn(),
		actions,
	} as unknown as RoomInboundContext;
	return {
		ctx,
		state,
		actions,
		explored,
		role,
		cancel: () => {
			cancelled = true;
		},
	};
}

function ping(over: Record<string, unknown> = {}) {
	return {
		payload: {
			id: "p",
			x: 10,
			y: 10,
			userId: "lia",
			userName: "Lia",
			color: "#22c55e",
			timestamp: NOW,
			...over,
		},
	};
}

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => {
	vi.useRealTimers();
});

describe("tópico, config e mensagens", () => {
	it("mantém tópico e config de antes", () => {
		expect(roomTopic("camp", "cena")).toBe("vtt-room:camp:cena");
		expect(roomChannelOptions("u1")).toEqual({
			config: { presence: { key: "u1" }, broadcast: { self: false } },
		});
	});

	it("nome na mesa: nome completo, e-mail, Aventureiro", () => {
		expect(
			roomDisplayName({ id: "a", user_metadata: { full_name: "Ana" } }),
		).toBe("Ana");
		expect(roomDisplayName({ id: "a", email: "bia@x.com" })).toBe("bia");
		expect(roomDisplayName({ id: "a" })).toBe("Aventureiro");
	});

	it("presença com os mesmos campos", () => {
		expect(
			roomPresencePayload(
				"u1",
				{
					userName: "Ana",
					avatarUrl: null,
					color: "#fff",
					colorChosen: false,
					isGM: true,
					isCoGM: false,
				},
				5,
			),
		).toEqual({
			userId: "u1",
			userName: "Ana",
			avatarUrl: null,
			color: "#fff",
			colorChosen: false,
			isGM: true,
			isCoGM: false,
			onlineAt: 5,
		});
	});

	it("payloads enviados não mudaram", () => {
		expect(roomMessages.tokenDrag("t", 1, 2, "u")).toEqual({
			type: "broadcast",
			event: "token_drag",
			payload: { tokenId: "t", x: 1, y: 2, userId: "u" },
		});
		expect(roomMessages.ruler("u", "Ana", "#f00", null).payload).toEqual({
			userId: "u",
			measurement: null,
		});
		expect(roomMessages.templateRemoval("u", "cena", ["a"]).payload).toEqual({
			userId: "u",
			sceneId: "cena",
			removedIds: ["a"],
		});
		expect(roomMessages.fogPaths([]).event).toBe("fog_update");
	});
});

describe("roteamento de eventos", () => {
	it("registra presença e depois os broadcasts, na ordem de antes", () => {
		const calls: string[] = [];
		const channel = {
			on(type: string, filter: { event: string }) {
				calls.push(`${type}:${filter.event}`);
				return channel;
			},
			presenceState: () => ({}),
		};
		const { ctx } = makeCtx();
		attachRoomHandlers(channel as unknown as RealtimeChannel, ctx);
		expect(calls).toEqual([
			"presence:sync",
			"presence:leave",
			...ROOM_BROADCAST_EVENTS.map((event) => `broadcast:${event}`),
		]);
	});

	it("ignora evento de outra cena e depois do cleanup", () => {
		const { ctx, state, actions, cancel } = makeCtx();
		state.activeSceneId = "cena-2";
		roomBroadcastHandlers.token_drag(ctx, {
			payload: { tokenId: "t", x: 1, y: 2 },
		});
		expect(actions.setTokenTargetPosition).not.toHaveBeenCalled();
		state.activeSceneId = "cena-1";
		cancel();
		roomBroadcastHandlers.token_drag(ctx, {
			payload: { tokenId: "t", x: 1, y: 2 },
		});
		expect(actions.setTokenTargetPosition).not.toHaveBeenCalled();
	});

	it("aplica arraste, exploração e cursor", () => {
		const { ctx, actions, explored, state } = makeCtx();
		roomBroadcastHandlers.token_drag(ctx, {
			payload: { tokenId: "t", x: 0, y: 2 },
		});
		expect(actions.setTokenTargetPosition).toHaveBeenCalledWith("t", 0, 2);
		roomBroadcastHandlers.explored_reset(ctx, {
			payload: { sceneId: "outra" },
		});
		expect(explored.clear).not.toHaveBeenCalled();
		roomBroadcastHandlers.explored_reset(ctx, {
			payload: { sceneId: "cena-1" },
		});
		expect(explored.clear).toHaveBeenCalledWith("cena-1");
		state.showRemoteCursors = false;
		roomBroadcastHandlers.cursor_move(ctx, {
			payload: { userId: "lia", x: 1, y: 1 },
		});
		expect(actions.setRemoteCursor).not.toHaveBeenCalled();
	});
});

describe("presença", () => {
	it("sync publica a lista e leave limpa cursor e régua", () => {
		const { ctx, actions, state } = makeCtx();
		handlePresenceSync(ctx, {});
		expect(actions.setOnlineUsers).toHaveBeenCalledWith([]);
		state.remoteMeasurements = { lia: { userId: "lia" } };
		handlePresenceLeave(ctx, { leftPresences: [{ userId: "lia" }, {}] });
		expect(actions.removeRemoteCursor).toHaveBeenCalledTimes(1);
		expect(actions.removeRemoteCursor).toHaveBeenCalledWith("lia");
		expect(actions.setRemoteMeasurement).toHaveBeenCalledWith("lia", null);
	});

	it("sync depois do cleanup não faz nada", () => {
		const { ctx, actions, cancel } = makeCtx();
		cancel();
		handlePresenceSync(ctx, {});
		expect(actions.setOnlineUsers).not.toHaveBeenCalled();
	});
});

describe("admissão de ping", () => {
	it("relógio de quem mandou 10 min à frente: vale a chegada (#238)", () => {
		const { ctx, actions } = makeCtx();
		roomBroadcastHandlers.ping(ctx, ping({ timestamp: NOW + 600_000 }));
		expect(actions.addPing).toHaveBeenCalledTimes(1);
		expect(actions.addPing.mock.calls[0][0]).toMatchObject({
			timestamp: NOW,
		});
		expect(ctx.playPing).toHaveBeenCalledWith(NOW, undefined);
	});

	it("jogador mandando 'Todos aqui' vira ping comum e não puxa câmera", () => {
		const { ctx, actions } = makeCtx();
		roomBroadcastHandlers.ping(ctx, ping({ kind: "focus" }));
		expect(actions.addPing.mock.calls[0][0].kind).not.toBe("focus");
		expect(ctx.pullCamera).not.toHaveBeenCalled();
	});

	it("'Todos aqui' do dono leva a câmera; papel do payload não conta", () => {
		const { ctx } = makeCtx();
		roomBroadcastHandlers.ping(
			ctx,
			ping({ userId: "mestre", kind: "focus", x: 3, y: 4 }),
		);
		expect(ctx.pullCamera).toHaveBeenCalledWith({ x: 3, y: 4 }, "focus");
	});

	it("'Atenção' do co-mestre (membership) só puxa fora da tela", () => {
		const { ctx } = makeCtx();
		roomBroadcastHandlers.ping(ctx, ping({ userId: "co", kind: "attention" }));
		expect(ctx.pullCamera).not.toHaveBeenCalled();
		roomBroadcastHandlers.ping(
			ctx,
			ping({ userId: "co", kind: "attention", x: 5000, y: 5000 }),
		);
		expect(ctx.pullCamera).toHaveBeenCalledWith(
			{ x: 5000, y: 5000 },
			"attention",
		);
	});

	it("ping recusado pela fila não toca som", () => {
		const { ctx, actions } = makeCtx();
		actions.addPing.mockReturnValueOnce(null as never);
		roomBroadcastHandlers.ping(ctx, ping());
		expect(ctx.playPing).not.toHaveBeenCalled();
	});

	it("payload inválido é ignorado", () => {
		const { ctx, actions } = makeCtx();
		roomBroadcastHandlers.ping(ctx, ping({ x: "a" }));
		expect(actions.addPing).not.toHaveBeenCalled();
	});
});

describe("névoa", () => {
	const path = { id: "f", type: "rect", mode: "reveal" };

	it("lista inteira substitui; caminho único soma", () => {
		const { ctx, actions } = makeCtx();
		roomBroadcastHandlers.fog_update(ctx, { payload: { paths: [path] } });
		expect(actions.setFogPaths).toHaveBeenCalledWith([path]);
		roomBroadcastHandlers.fog_update(ctx, { payload: { path } });
		expect(actions.addFogPath).toHaveBeenCalledWith(path);
	});

	it("paths tem prioridade sobre path e cena errada é ignorada", () => {
		const { ctx, actions, state } = makeCtx();
		roomBroadcastHandlers.fog_update(ctx, { payload: { paths: [], path } });
		expect(actions.addFogPath).not.toHaveBeenCalled();
		state.activeSceneId = "outra";
		roomBroadcastHandlers.fog_update(ctx, { payload: { path } });
		expect(actions.addFogPath).not.toHaveBeenCalled();
	});
});

describe("moldes", () => {
	it("molde colocado entra como remoto e limpa a prévia", () => {
		const { ctx, actions, state } = makeCtx();
		const template = { id: "m1" };
		roomBroadcastHandlers.template_move(ctx, {
			payload: { userId: "lia", sceneId: "cena-1", template, placed: true },
		});
		expect(actions.setRemoteTemplate).toHaveBeenCalledWith("lia", template);
		expect(state.setRemoteTemplatePreview).toHaveBeenCalledWith("lia", null);
	});

	it("remoção de jogador não apaga molde do mestre", () => {
		const { ctx, state } = makeCtx();
		state.placedTemplates = [{ id: "m1", userId: "mestre" }];
		roomBroadcastHandlers.template_move(ctx, {
			payload: { userId: "lia", sceneId: "cena-1", removedIds: ["m1"] },
		});
		expect(state.removeTemplatesByIds).not.toHaveBeenCalled();
		expect(state.setRemoteTemplatePreview).toHaveBeenCalledWith("lia", null);
	});

	it("remoção do dono apaga o molde", () => {
		const { ctx, state } = makeCtx();
		state.placedTemplates = [{ id: "m1", userId: "lia" }];
		roomBroadcastHandlers.template_move(ctx, {
			payload: { userId: "mestre", sceneId: "cena-1", removedIds: ["m1"] },
		});
		expect(state.removeTemplatesByIds).toHaveBeenCalledWith(["m1"]);
	});
});
