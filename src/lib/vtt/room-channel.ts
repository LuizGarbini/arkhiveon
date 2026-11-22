/**
 * Canal da sala do VTT (Realtime Broadcast + Presence), sem React.
 *
 * Transporte privado da 0066: a rota abre os canais `vtt:C:S:u:U`, `gm` e
 * `gmonly` (`private: true`, `setAuth` antes do subscribe). Este módulo liga
 * os handlers, admite a entrada pelo tópico (remetente e descarte no canal
 * errado), encaminha a saída (`fog_update`/`explored_reset` no `gm`, arrasto
 * oculto no `gmonly`) e faz o `track` da presença no canal próprio.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DragMove } from "./drag-broadcast";
import { readDragBatch } from "./drag-broadcast";
import type { useExploredStore } from "./explored-store";
import { readExploredCells, readExploredReset } from "./explored-sync";
import type { PingKind } from "./ping-kinds";
import { pingKindInfo } from "./ping-kinds";
import { acceptIncomingPing } from "./ping-receive";
import { readPresenceUsers, readRemoteCursor } from "./presence-input";
import {
	admitInbound,
	privateChannelOptions,
	roomTopicsFor,
} from "./private-topics";
import { applyRemoteRuler } from "./ruler-gesture";
import type { VTTSpellTemplate } from "./template-math";
import {
	acceptTemplateRemoval,
	type TemplateMembership,
} from "./template-permissions";
import type {
	VTTFogPath,
	VTTPingEvent,
	VTTRemoteMeasurement,
	VTTRulerMeasurement,
} from "./types";
import type { useVTTStore } from "./vtt-store";

type VTTState = ReturnType<typeof useVTTStore.getState>;
type ExploredState = ReturnType<typeof useExploredStore.getState>;

// ── Tópico e config ──────────────────────────────────────────────────

/** Um canal por cena: `vtt-room:<campanha>:<cena>`. */
export function roomTopic(campaignId: string, sceneId: string): string {
	return `vtt-room:${campaignId}:${sceneId}`;
}

/** Presença com a chave do usuário; sem eco do que a própria aba manda. */
export function roomChannelOptions(userId: string) {
	return {
		config: {
			presence: { key: userId },
			broadcast: { self: false },
		},
	};
}

/** Eventos de broadcast do canal da sala, na ordem em que são registrados. */
export const ROOM_BROADCAST_EVENTS = [
	"token_drag",
	"token_drag_batch",
	"explored_cells",
	"explored_cleared",
	"explored_reset",
	"cursor_move",
	"ruler_move",
	"ping",
	"fog_update",
	"template_move",
] as const;

export type RoomBroadcastEvent = (typeof ROOM_BROADCAST_EVENTS)[number];

export interface RoomMessage {
	type: "broadcast";
	event: RoomBroadcastEvent;
	payload: unknown;
}

// ── Quem está na sala ────────────────────────────────────────────────

export interface RoomUser {
	id: string;
	email?: string | null;
	user_metadata?: { full_name?: string } | null;
}

/** Nome na mesa: nome completo, começo do e-mail ou "Aventureiro". */
export function roomDisplayName(user: RoomUser): string {
	return (
		user.user_metadata?.full_name || user.email?.split("@")[0] || "Aventureiro"
	);
}

export interface RoomPresenceInput {
	userName: string;
	avatarUrl: string | null;
	color: string;
	colorChosen: boolean;
	isGM: boolean;
	isCoGM: boolean;
}

/** O que vai no `track` da presença (mesmos campos de antes). */
export function roomPresencePayload(
	userId: string,
	input: RoomPresenceInput,
	now: number = Date.now(),
) {
	return {
		userId,
		userName: input.userName,
		avatarUrl: input.avatarUrl,
		color: input.color,
		colorChosen: input.colorChosen,
		isGM: input.isGM,
		isCoGM: input.isCoGM,
		onlineAt: now,
	};
}

// ── Mensagens enviadas ───────────────────────────────────────────────

function message(event: RoomBroadcastEvent, payload: unknown): RoomMessage {
	return { type: "broadcast", event, payload };
}

export const roomMessages = {
	tokenDrag(tokenId: string, x: number, y: number, userId: string) {
		return message("token_drag", { tokenId, x, y, userId });
	},
	tokenDragBatch(moves: DragMove[], userId: string) {
		return message("token_drag_batch", { moves, userId });
	},
	cursor(
		userId: string,
		userName: string,
		color: string,
		x: number,
		y: number,
	) {
		return message("cursor_move", { userId, userName, color, x, y });
	},
	ruler(
		userId: string,
		userName: string,
		color: string,
		measurement: VTTRulerMeasurement | null,
	) {
		return message("ruler_move", {
			userId,
			measurement: measurement
				? { ...measurement, userId, userName, color }
				: null,
		});
	},
	ping(ping: VTTPingEvent) {
		return message("ping", ping);
	},
	fogPath(path: VTTFogPath) {
		return message("fog_update", { path });
	},
	fogPaths(paths: VTTFogPath[]) {
		return message("fog_update", { paths });
	},
	templateRemoval(userId: string, sceneId: string | null, ids: string[]) {
		return message("template_move", { userId, sceneId, removedIds: ids });
	},
	template(
		userId: string,
		sceneId: string | null,
		template: VTTSpellTemplate | null,
		placed: boolean,
	) {
		return message("template_move", { userId, sceneId, template, placed });
	},
	/** Memória de exploração (o `exploredSync` escolhe o evento). */
	explored(event: RoomBroadcastEvent, payload: unknown) {
		return message(event, payload);
	},
};

// ── Eventos recebidos ────────────────────────────────────────────────

export interface RoomInboundContext {
	campaignId: string;
	/** Cena deste canal. Evento que chega depois da troca de cena é ignorado. */
	sceneId: string;
	selfUserId: string;
	/** Contador de debug: mensagem descartada pelo canal/tópico. Sem toast. */
	recordDiscard?: (reason: string) => void;
	/** Presença de cada tópico `u:<id>`, para a lista online não ser sobrescrita. */
	presenceByTopic?: Map<string, Record<string, unknown[]>>;
	/** true depois do cleanup do efeito: nada mais é aplicado. */
	isCancelled: () => boolean;
	vtt: () => VTTState;
	explored: () => ExploredState;
	/** Papel conhecido de quem manda (dono e memberships carregados). */
	roleSource: () => {
		ownerId: string | null;
		memberships: readonly TemplateMembership[];
	};
	readScreen: () => { width: number; height: number };
	playPing: (now: number, kind: PingKind | undefined) => void;
	pullCamera: (
		world: { x: number; y: number },
		notice: "focus" | "attention",
	) => void;
	actions: Pick<
		VTTState,
		| "setOnlineUsers"
		| "setTokenTargetPosition"
		| "setRemoteCursor"
		| "removeRemoteCursor"
		| "setRemoteMeasurement"
		| "addPing"
		| "addFogPath"
		| "setFogPaths"
		| "setRemoteTemplate"
	>;
}

/** Mesma checagem de antes: canal vivo e ainda na cena dele. */
function stale(ctx: RoomInboundContext): boolean {
	return ctx.isCancelled() || ctx.vtt().activeSceneId !== ctx.sceneId;
}

function mergePresence(
	bag: Map<string, Record<string, unknown[]>>,
): Record<string, unknown[]> {
	const merged: Record<string, unknown[]> = {};
	for (const state of bag.values()) {
		for (const [key, metas] of Object.entries(state)) {
			merged[key] = metas;
		}
	}
	return merged;
}

export function handlePresenceSync(
	ctx: RoomInboundContext,
	presenceState: Record<string, unknown[]>,
	topic?: string,
): void {
	if (ctx.isCancelled()) return;
	let state = presenceState;
	if (ctx.presenceByTopic && topic) {
		ctx.presenceByTopic.set(topic, presenceState);
		state = mergePresence(ctx.presenceByTopic);
	}
	const users = readPresenceUsers(state);
	// Cor automática igual à de quem chegou antes: cede para uma livre.
	const self = users.find((item) => item.userId === ctx.selfUserId);
	if (self) {
		ctx
			.vtt()
			.reconcileUserColor(
				{ userId: ctx.selfUserId, onlineAt: self.onlineAt },
				users,
			);
	}
	ctx.actions.setOnlineUsers(users);
}

export function handlePresenceLeave(
	ctx: RoomInboundContext,
	{ leftPresences }: { leftPresences: Array<{ userId?: string }> },
): void {
	for (const p of leftPresences || []) {
		if (p.userId) {
			ctx.actions.removeRemoteCursor(p.userId);
			const remote = ctx.vtt().remoteMeasurements;
			const next = applyRemoteRuler(remote, {
				type: "leave",
				userId: p.userId,
			});
			if (next !== remote) ctx.actions.setRemoteMeasurement(p.userId, null);
		}
	}
}

type Envelope<T = unknown> = { payload: T };

export const roomBroadcastHandlers: {
	[E in RoomBroadcastEvent]: (
		ctx: RoomInboundContext,
		envelope: Envelope,
	) => void;
} = {
	token_drag(ctx, envelope) {
		if (stale(ctx)) return;
		const data = (
			envelope as Envelope<{ tokenId?: string; x?: number; y?: number }>
		).payload;
		if (data?.tokenId && data.x !== undefined && data.y !== undefined) {
			ctx.actions.setTokenTargetPosition(data.tokenId, data.x, data.y);
		}
	},
	token_drag_batch(ctx, envelope) {
		if (stale(ctx)) return;
		const moves = readDragBatch((envelope as Envelope).payload);
		if (moves.length > 0) {
			ctx.vtt().setTokenTargetPositions(moves);
		}
	},
	explored_cells(ctx, envelope) {
		if (stale(ctx)) return;
		const data = readExploredCells((envelope as Envelope).payload);
		if (data && data.sceneId === ctx.sceneId) {
			ctx.explored().applyRemote(data.sceneId, data.cells);
		}
	},
	explored_cleared(ctx, envelope) {
		if (stale(ctx)) return;
		const data = readExploredCells((envelope as Envelope).payload);
		if (data && data.sceneId === ctx.sceneId) {
			ctx.explored().unmark(data.sceneId, data.cells);
		}
	},
	explored_reset(ctx, envelope) {
		if (ctx.isCancelled()) return;
		const sceneId = readExploredReset((envelope as Envelope).payload);
		if (sceneId && sceneId === ctx.sceneId) {
			ctx.explored().clear(sceneId);
		}
	},
	cursor_move(ctx, envelope) {
		if (
			stale(ctx) ||
			// Preferência local: sem o ponteiro com nome dos outros.
			!ctx.vtt().showRemoteCursors
		)
			return;
		const cursor = readRemoteCursor(
			(envelope as Envelope).payload,
			ctx.vtt().onlineUsers,
		);
		if (cursor) ctx.actions.setRemoteCursor(cursor);
	},
	ruler_move(ctx, envelope) {
		if (stale(ctx)) return;
		const data = (
			envelope as Envelope<{
				userId?: string;
				measurement?: VTTRemoteMeasurement | null;
			}>
		).payload;
		if (data?.userId) {
			const measurement = data.measurement;
			const remote = ctx.vtt().remoteMeasurements;
			const normalized = measurement
				? {
						...measurement,
						userId: data.userId,
						userName: measurement.userName || "Jogador",
						color: measurement.color || "#38bdf8",
					}
				: null;
			const next = applyRemoteRuler(remote, {
				type: "broadcast",
				userId: data.userId,
				measurement: normalized,
			});
			if (next !== remote) {
				ctx.actions.setRemoteMeasurement(
					data.userId,
					next[data.userId] ?? null,
				);
			}
		}
	},
	ping(ctx, envelope) {
		if (stale(ctx)) return;
		// Quem pode levar a câmera é conferido aqui, no lado de quem recebe.
		// "Atenção" só puxa se o ponto está fora do canvas agora.
		// Jogador que manda "Todos aqui" à força vira ping comum.
		const state = ctx.vtt();
		const role = ctx.roleSource();
		const received = acceptIncomingPing(
			(envelope as Envelope<VTTPingEvent>).payload,
			{
				campaignOwnerId: role.ownerId,
				memberships: role.memberships,
				presence: state.onlineUsers,
			},
			{
				viewport: state.viewport,
				screen: ctx.readScreen(),
				selfUserId: ctx.selfUserId,
			},
		);
		if (!received) return;
		const accepted = ctx.actions.addPing(received.ping);
		if (!accepted) return;
		ctx.playPing(Date.now(), accepted.kind);
		if (received.pullTo) {
			ctx.pullCamera(
				received.pullTo,
				received.ping.kind === "focus" ? "focus" : "attention",
			);
		}
	},
	fog_update(ctx, envelope) {
		if (stale(ctx)) return;
		const data = (
			envelope as Envelope<{ paths?: VTTFogPath[]; path?: VTTFogPath }>
		).payload;
		if (data?.paths) {
			ctx.actions.setFogPaths(data.paths);
		} else if (data?.path) {
			ctx.actions.addFogPath(data.path);
		}
	},
	template_move(ctx, envelope) {
		const data = (
			envelope as Envelope<{
				userId?: string;
				template?: VTTSpellTemplate | null;
				sceneId?: string;
				placed?: boolean;
				removedIds?: string[];
			}>
		).payload;
		if (data?.userId && data.sceneId === ctx.vtt().activeSceneId) {
			const store = ctx.vtt();
			if (data.removedIds) {
				const requested = Array.isArray(data.removedIds)
					? data.removedIds.filter((id): id is string => typeof id === "string")
					: [];
				const role = ctx.roleSource();
				const removed = acceptTemplateRemoval({
					templates: [
						...store.placedTemplates,
						...Object.values(store.remoteTemplates),
					],
					requestedIds: requested,
					senderUserId: data.userId,
					source: {
						campaignOwnerId: role.ownerId,
						memberships: role.memberships,
						presence: store.onlineUsers,
					},
				});
				if (removed.length > 0) store.removeTemplatesByIds(removed);
				store.setRemoteTemplatePreview(data.userId, null);
			} else if (data.placed && data.template) {
				ctx.actions.setRemoteTemplate(data.userId, data.template);
				store.setRemoteTemplatePreview(data.userId, null);
			} else store.setRemoteTemplatePreview(data.userId, data.template || null);
		}
	},
};

function payloadUserId(payload: unknown): unknown {
	if (payload && typeof payload === "object" && "userId" in payload) {
		return (payload as { userId?: unknown }).userId;
	}
	return undefined;
}

function withTopicSender(
	envelope: Envelope,
	senderUserId: string | null,
): Envelope {
	if (senderUserId === null) return envelope;
	const payload = envelope.payload;
	if (payload && typeof payload === "object") {
		return { payload: { ...(payload as object), userId: senderUserId } };
	}
	return envelope;
}

/**
 * Liga os handlers no canal. Cada broadcast passa por `admitInbound`: o
 * remetente é o U do tópico; `fog_update` fora do `gm` é descartado.
 * `topic` é o nome com que o canal foi aberto (o supabase-js pode prefixar
 * `realtime:` no `channel.topic`).
 */
export function attachRoomHandlers(
	channel: RealtimeChannel,
	ctx: RoomInboundContext,
	topic: string = (channel as unknown as { topic?: string }).topic ?? "",
): RealtimeChannel {
	channel
		.on("presence", { event: "sync" }, () =>
			handlePresenceSync(ctx, channel.presenceState(), topic),
		)
		.on("presence", { event: "leave" }, (payload) =>
			handlePresenceLeave(
				ctx,
				payload as unknown as { leftPresences: Array<{ userId?: string }> },
			),
		);
	for (const event of ROOM_BROADCAST_EVENTS) {
		channel.on("broadcast", { event }, (envelope) => {
			const body = envelope as unknown as Envelope;
			const decision = admitInbound({
				topic,
				event,
				payloadUserId: payloadUserId(body.payload),
				campaignId: ctx.campaignId,
				sceneId: ctx.sceneId,
			});
			if (!decision.accept) {
				ctx.recordDiscard?.(decision.reason);
				return;
			}
			roomBroadcastHandlers[event](
				ctx,
				withTopicSender(body, decision.senderUserId),
			);
		});
	}
	return channel;
}

export type RoomSendHint = {
	/** Arrasto de token oculto ou da camada `gm` vai no `gmonly`. */
	tokenHiddenOrGm?: boolean;
	pingKind?: PingKind;
	isGmOrCoGm?: boolean;
};

/** Qual tópico leva cada envio (3.1 do plano). */
export function routeOutbound(
	event: RoomBroadcastEvent,
	hint: RoomSendHint = {},
): "own" | "gm" | "gmonly" {
	if (event === "fog_update" || event === "explored_reset") return "gm";
	if (event === "ping") {
		const kind = hint.pingKind;
		if (
			kind &&
			(pingKindInfo(kind).gmOnly || (kind === "attention" && hint.isGmOrCoGm))
		) {
			return "gm";
		}
	}
	if (
		(event === "token_drag" || event === "token_drag_batch") &&
		hint.tokenHiddenOrGm
	) {
		return "gmonly";
	}
	return "own";
}

export interface RoomTransport {
	send: (msg: RoomMessage, hint?: RoomSendHint) => void;
	track: (payload: ReturnType<typeof roomPresencePayload>) => Promise<unknown>;
}

export interface RoomRealtimeClient {
	channel: (
		name: string,
		opts?: ReturnType<typeof privateChannelOptions>,
	) => RealtimeChannel;
	removeChannel: (channel: RealtimeChannel) => unknown;
	realtime: { setAuth: (token?: string) => Promise<unknown> };
}

/**
 * Abre os canais privados da sala: `setAuth`, próprio, um por membro, `gm`
 * e (mestre/co-mestre) `gmonly`. Todos com `private: true`.
 */
export async function openPrivateRoom(input: {
	client: RoomRealtimeClient;
	campaignId: string;
	sceneId: string;
	selfUserId: string;
	memberUserIds: readonly string[];
	isGmOrCoGm: boolean;
	ctx: RoomInboundContext;
	onOwnSubscribed?: (transport: RoomTransport) => void | Promise<void>;
}): Promise<{ transport: RoomTransport; close: () => void }> {
	await input.client.realtime.setAuth();
	input.ctx.presenceByTopic ??= new Map();
	const topics = roomTopicsFor({
		campaignId: input.campaignId,
		sceneId: input.sceneId,
		selfUserId: input.selfUserId,
		memberUserIds: input.memberUserIds,
		isGmOrCoGm: input.isGmOrCoGm,
	});
	const channels: RealtimeChannel[] = [];
	const open = (name: string, withPresence: boolean) => {
		const channel = input.client.channel(
			name,
			privateChannelOptions(withPresence ? input.selfUserId : undefined),
		);
		attachRoomHandlers(channel, input.ctx, name);
		channels.push(channel);
		return channel;
	};
	const own = open(topics.own, true);
	const gm = open(topics.gm, false);
	const gmonly = topics.gmonly ? open(topics.gmonly, false) : null;
	for (const name of topics.others) open(name, false);

	const transport: RoomTransport = {
		send(msg, hint) {
			const route = routeOutbound(msg.event, hint);
			const target = route === "gm" ? gm : route === "gmonly" ? gmonly : own;
			// Jogador não assina gmonly: não vaza arrasto oculto no canal próprio.
			if (!target) return;
			void target.send(msg);
		},
		track(payload) {
			return own.track(payload);
		},
	};

	// Subscribe só depois do setAuth. A presença é ligada no próprio.
	own.subscribe(async (status: string) => {
		if (status === "SUBSCRIBED") await input.onOwnSubscribed?.(transport);
	});
	for (const channel of channels) {
		if (channel !== own) channel.subscribe();
	}

	return {
		transport,
		close: () => {
			for (const channel of channels) {
				input.client.removeChannel(channel);
			}
		},
	};
}
