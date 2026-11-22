/**
 * Canal da sala do VTT (Realtime Broadcast + Presence), sem React.
 *
 * Tudo o que a rota da mesa faz no canal `vtt-room:<campanha>:<cena>`: nome e
 * config, os handlers de cada evento recebido (com a admissão de ping, névoa,
 * régua, moldes e exploração), o `track` da presença e as mensagens enviadas.
 * A rota só cria o canal, liga este módulo e guarda a referência.
 *
 * Extraído de `routes/campaigns/$campaignId/vtt.tsx` sem mudar tópico,
 * eventos, payloads nem a regra de papel (R8 do plano da 0066). O transporte
 * privado vem em outra PR, em cima deste módulo.
 */
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { DragMove } from "./drag-broadcast";
import { readDragBatch } from "./drag-broadcast";
import type { useExploredStore } from "./explored-store";
import { readExploredCells, readExploredReset } from "./explored-sync";
import type { PingKind } from "./ping-kinds";
import { acceptIncomingPing } from "./ping-receive";
import { readPresenceUsers, readRemoteCursor } from "./presence-input";
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
	/** Cena deste canal. Evento que chega depois da troca de cena é ignorado. */
	sceneId: string;
	selfUserId: string;
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

export function handlePresenceSync(
	ctx: RoomInboundContext,
	presenceState: Record<string, unknown[]>,
): void {
	if (ctx.isCancelled()) return;
	const users = readPresenceUsers(presenceState);
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

/**
 * Liga todos os handlers no canal, na mesma ordem de antes: presença
 * (sync, leave) e depois os broadcasts de `ROOM_BROADCAST_EVENTS`.
 */
export function attachRoomHandlers(
	channel: RealtimeChannel,
	ctx: RoomInboundContext,
): RealtimeChannel {
	channel
		.on("presence", { event: "sync" }, () =>
			handlePresenceSync(ctx, channel.presenceState()),
		)
		.on("presence", { event: "leave" }, (payload) =>
			handlePresenceLeave(
				ctx,
				payload as unknown as { leftPresences: Array<{ userId?: string }> },
			),
		);
	for (const event of ROOM_BROADCAST_EVENTS) {
		channel.on("broadcast", { event }, (envelope) =>
			roomBroadcastHandlers[event](ctx, envelope as unknown as Envelope),
		);
	}
	return channel;
}
