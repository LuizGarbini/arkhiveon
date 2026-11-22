// @vitest-environment jsdom
/**
 * Caracterização do canal da sala (`vtt-room:*`) da rota da mesa.
 *
 * Escrito contra a main ANTES do refactor (R8 do plano 0066). Grava tudo o que
 * a rota faz no Realtime: nome e config do canal, quantos subscribes, os
 * handlers registrados, o que vai no `track`, cada `send` (evento + payload)
 * e o efeito de cada evento recebido na store. O snapshot é a prova de que o
 * refactor não muda tópico, eventos, payloads nem a regra de papel.
 */
import { act, cleanup, render, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useExploredStore } from "./explored-store";
import type { VTTToken } from "./types";
import { useVTTStore } from "./vtt-store";

type Handler = (payload: unknown) => void;

const mock = vi.hoisted(() => ({
	role: "owner" as "owner" | "viewer",
	channels: [] as Array<{
		name: string;
		config: unknown;
		on: Array<{ type: string; event?: string }>;
		handlers: Map<string, Handler>;
		sent: unknown[];
		tracked: unknown[];
		subscribes: number;
		statusCallback: ((status: string) => unknown) | null;
	}>,
	removed: [] as string[],
	byChannel: new WeakMap<object, { name: string }>(),
	canvas: null as null | Record<string, unknown>,
	fogControls: null as null | Record<string, unknown>,
}));

vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	useParams: () => ({ campaignId: "campaign" }),
}));
vi.mock("@/lib/auth", () => ({
	useAuth: () => ({ user }),
}));
vi.mock("@/lib/store", () => ({
	useRPGStore: (selector: (s: unknown) => unknown) => selector({ campaigns }),
}));
vi.mock("@/components/vtt/vtt-canvas", () => ({
	VTTCanvas: (props: Record<string, unknown>) => {
		mock.canvas = props;
		return null;
	},
}));
vi.mock("@/components/vtt/vtt-fog-controls", () => ({
	VTTFogControls: (props: Record<string, unknown>) => {
		mock.fogControls = props;
		return null;
	},
}));
vi.mock("@/components/ui/toast", () => ({ showToast: () => {} }));
vi.mock("@/lib/vtt/audio", () => ({ playPingAudio: () => {} }));
vi.mock("@/components/vtt/vtt-grid-settings", () => ({
	VTTGridSettings: () => null,
}));
vi.mock("@/components/vtt/vtt-journal", () => ({ VTTJournal: () => null }));
vi.mock("@/components/vtt/vtt-roster-drawer", () => ({
	VTTRosterDrawer: () => null,
}));
vi.mock("@/components/vtt/vtt-scene-bar", () => ({ VTTSceneBar: () => null }));
vi.mock("@/components/vtt/vtt-sheet-drawer", () => ({
	VTTSheetDrawer: () => null,
}));
vi.mock("@/components/vtt/vtt-template-controls", () => ({
	VTTTemplateControls: () => null,
}));
vi.mock("@/components/vtt/vtt-token-menu", () => ({
	VTTTokenMenu: () => null,
}));
vi.mock("@/components/vtt/vtt-toolbar", () => ({ VTTToolbar: () => null }));
vi.mock("@/components/vtt/vtt-zoom-controls", () => ({
	VTTZoomControls: () => null,
}));

const user = {
	id: "mestre",
	email: "mestre@example.invalid",
	user_metadata: { full_name: "Mestra Ana" },
};
const campaigns = [
	{
		id: "campaign",
		ownerId: "mestre",
		get myRole() {
			return mock.role;
		},
	},
];
const sceneRow = {
	id: "scene-a",
	campaign_id: "campaign",
	name: "Cena A",
	map_image_url: null,
	grid_type: "square",
	grid_size: 70,
	grid_color: "#ffffff",
	grid_opacity: 0.2,
	grid_scale_distance: 1.5,
	grid_scale_unit: "m",
	grid_offset_x: 0,
	grid_offset_y: 0,
	map_scale: 1,
	width: 1000,
	height: 1000,
	fog_enabled: true,
	fog_exploration: false,
	is_active: true,
	order_index: 0,
	created_at: "a",
	updated_at: "a",
};
const token: VTTToken = {
	id: "token",
	sceneId: "scene-a",
	characterId: "character",
	name: "Hero",
	layer: "token",
	x: 0,
	y: 0,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
	hpCurrent: 12,
};

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
		from: (table: string) => {
			const query = {
				select: () => query,
				eq: () => query,
				in: () => query,
				order: () => query,
				update: () => query,
				upsert: () => Promise.resolve({ error: null }),
				single: () => Promise.resolve({ data: null, error: null }),
				maybeSingle: () => Promise.resolve({ data: null, error: null }),
				// biome-ignore lint/suspicious/noThenProperty: Supabase queries are intentionally thenable.
				then: (resolve: (value: unknown) => unknown) =>
					Promise.resolve({
						data:
							table === "vtt_scenes"
								? [sceneRow]
								: table === "characters"
									? [{ id: "character", user_id: "mestre" }]
									: [],
						error: null,
					}).then(resolve),
			};
			return query;
		},
		channel: (name: string, config?: unknown) => {
			const record = {
				name,
				config: config ?? null,
				on: [] as Array<{ type: string; event?: string }>,
				handlers: new Map<string, Handler>(),
				sent: [] as unknown[],
				tracked: [] as unknown[],
				subscribes: 0,
				statusCallback: null as ((status: string) => unknown) | null,
			};
			mock.channels.push(record);
			const channel = {
				on: (type: string, filter: { event?: string }, callback: Handler) => {
					record.on.push({ type, event: filter?.event });
					record.handlers.set(`${type}:${filter?.event ?? ""}`, callback);
					return channel;
				},
				subscribe: (cb?: (status: string) => unknown) => {
					record.subscribes++;
					record.statusCallback = cb ?? null;
					return channel;
				},
				send: (message: unknown) => {
					record.sent.push(message);
					return Promise.resolve("ok");
				},
				track: (payload: unknown) => {
					record.tracked.push(payload);
					return Promise.resolve("ok");
				},
				presenceState: () => ({
					mestre: [
						{
							userId: "mestre",
							userName: "Mestra Ana",
							color: "#a855f7",
							isGM: true,
							onlineAt: 1,
						},
					],
					lia: [
						{
							userId: "lia",
							userName: "Lia",
							color: "#22c55e",
							isGM: false,
							isCoGM: false,
							onlineAt: 2,
						},
					],
				}),
				unsubscribe: vi.fn(),
				untrack: vi.fn(),
			};
			mock.byChannel.set(channel, record);
			return channel;
		},
		removeChannel: (channel: object) => {
			mock.removed.push(mock.byChannel.get(channel)?.name ?? "canal");
		},
	}),
}));

import { Route } from "@/routes/campaigns/$campaignId/vtt";

const Page = (Route as unknown as { component: ComponentType }).component;
const initialVtt = useVTTStore.getState();
const initialExplored = useExploredStore.getState();
const NOW = new Date("2026-11-22T06:00:00.000Z");

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(NOW);
	mock.role = "owner";
	mock.channels = [];
	mock.removed = [];
	mock.canvas = null;
	mock.fogControls = null;
	useVTTStore.setState(initialVtt, true);
	useExploredStore.setState(initialExplored, true);
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

function room() {
	const found = mock.channels.filter((c) => c.name.startsWith("vtt-room:"));
	expect(found.length).toBeGreaterThan(0);
	return found[found.length - 1];
}

/** Datas e ids gerados na hora viram marcadores estáveis. */
function stable(value: unknown): unknown {
	return JSON.parse(
		JSON.stringify(value, (key, v) => {
			if (
				typeof v === "number" &&
				/^(timestamp|onlineAt|expiresAt|receivedAt|startedAt|createdAt)$/.test(
					key,
				)
			)
				return "<t>";
			if (key === "id" && typeof v === "string" && v.length > 20) return "<id>";
			return v;
		}),
	);
}

async function openTable() {
	render(<Page />);
	await waitFor(() => expect(mock.canvas).not.toBeNull());
	await act(async () => {
		useVTTStore.getState().setTokens([token]);
	});
	await waitFor(() =>
		expect(mock.channels.some((c) => c.name.startsWith("vtt-room:"))).toBe(
			true,
		),
	);
	await act(async () => {
		await room().statusCallback?.("SUBSCRIBED");
	});
}

function call(name: string, ...args: unknown[]) {
	const fn = mock.canvas?.[name];
	expect(typeof fn).toBe("function");
	return (fn as (...a: unknown[]) => unknown)(...args);
}

it("canal da sala: tópico, config, handlers, presença e o que é enviado", async () => {
	await openTable();
	const r = room();
	const roomChannels = mock.channels.filter((c) =>
		c.name.startsWith("vtt-room:"),
	);

	await act(async () => {
		call("onBroadcastDrag", "token", 10, 20);
		call("onBroadcastDragBatch", [
			{ tokenId: "token", x: 30, y: 40 },
			{ tokenId: "outro", x: 1, y: 1 },
		]);
		call("onBroadcastCursor", 5, 6);
		call("onBroadcastRuler", {
			startX: 0,
			startY: 0,
			endX: 70,
			endY: 0,
			distance: 1.5,
			unit: "m",
		});
		call("onBroadcastRuler", null);
		call("onBroadcastPing", {
			id: "p1",
			x: 1,
			y: 2,
			userId: "mestre",
			userName: "Mestra Ana",
			color: "#a855f7",
			timestamp: 123,
			kind: "attention",
		});
		call("onBroadcastFog", {
			id: "f1",
			type: "rect",
			mode: "reveal",
			x: 0,
			y: 0,
			width: 10,
			height: 10,
		});
		call(
			"onBroadcastTemplate",
			{ id: "t1", shape: "circle", x: 0, y: 0, size: 3, color: "#fff" },
			true,
		);
		call("onBroadcastTemplate", null);
		call("onRemoveTemplates", ["t1"]);
		call("onRemoveTemplates", []);
	});
	await act(async () => {
		(mock.fogControls?.onClearFog as (m: string) => void)("all_revealed");
	});

	expect(
		stable({
			roomChannels: roomChannels.length,
			name: r.name,
			config: r.config,
			subscribes: r.subscribes,
			on: r.on,
			tracked: r.tracked,
			sent: r.sent,
		}),
	).toMatchSnapshot();
});

it("canal da sala: efeito de cada evento recebido na store", async () => {
	await openTable();
	const r = room();
	const fire = async (key: string, payload: unknown) => {
		const handler = r.handlers.get(key);
		expect(handler, key).toBeTypeOf("function");
		const [type, event] = key.split(":");
		await act(async () => {
			// Broadcast chega embrulhado como no supabase-js; presença, direto.
			handler?.(type === "broadcast" ? { type, event, payload } : payload);
		});
	};
	const pick = () => {
		const s = useVTTStore.getState();
		return stable({
			onlineUsers: s.onlineUsers,
			targets: s.tokens.map((t) => ({
				id: t.id,
				targetX: (t as { targetX?: number }).targetX,
				targetY: (t as { targetY?: number }).targetY,
			})),
			remoteCursors: s.remoteCursors,
			remoteMeasurements: s.remoteMeasurements,
			activePings: s.activePings,
			fogPaths: s.fogPaths,
			remoteTemplates: s.remoteTemplates,
			remoteTemplatePreviews: s.remoteTemplatePreviews,
			placedTemplates: s.placedTemplates,
			explored: useExploredStore.getState(),
		});
	};
	const steps: Array<[string, unknown]> = [];
	const step = async (key: string, payload: unknown) => {
		await fire(key, payload);
		steps.push([key, pick()]);
	};

	await step("presence:sync", undefined);
	await step("broadcast:token_drag", { tokenId: "token", x: 140, y: 70 });
	await step("broadcast:token_drag", { tokenId: "token" });
	await step("broadcast:token_drag_batch", {
		moves: [{ tokenId: "token", x: 210, y: 70 }],
	});
	await step("broadcast:cursor_move", {
		userId: "lia",
		userName: "Lia",
		color: "#22c55e",
		x: 11,
		y: 12,
	});
	await step("broadcast:ruler_move", {
		userId: "lia",
		measurement: {
			startX: 0,
			startY: 0,
			endX: 70,
			endY: 70,
			distance: 1.5,
			unit: "m",
		},
	});
	await step("broadcast:ruler_move", { userId: "lia", measurement: null });
	// Ping comum de jogador: aparece, não leva a câmera.
	await step("broadcast:ping", {
		id: "ping-1",
		x: 50,
		y: 60,
		userId: "lia",
		userName: "Lia",
		color: "#22c55e",
		timestamp: 1,
		kind: "danger",
	});
	// Relógio de quem mandou 10 min à frente (#238): conta a chegada, não o envio.
	await step("broadcast:ping", {
		id: "ping-2",
		x: 51,
		y: 61,
		userId: "rui",
		userName: "Rui",
		color: "#22c55e",
		timestamp: NOW.getTime() + 600_000,
	});
	// Jogador que manda "Todos aqui" à força: vira ping comum.
	await step("broadcast:ping", {
		id: "ping-3",
		x: 52,
		y: 62,
		userId: "bea",
		userName: "Bea",
		color: "#22c55e",
		timestamp: 1,
		kind: "focus",
	});
	await step("broadcast:fog_update", {
		path: {
			id: "fog-1",
			type: "rect",
			mode: "reveal",
			x: 0,
			y: 0,
			width: 5,
			height: 5,
		},
	});
	await step("broadcast:fog_update", {
		paths: [
			{
				id: "fog-2",
				type: "rect",
				mode: "hide",
				x: 1,
				y: 1,
				width: 2,
				height: 2,
			},
		],
	});
	await step("broadcast:fog_update", { nada: true });
	await step("broadcast:explored_cells", {
		sceneId: "scene-a",
		cells: ["1:1", "2:2"],
	});
	await step("broadcast:explored_cleared", {
		sceneId: "scene-a",
		cells: ["1:1"],
	});
	await step("broadcast:explored_cells", { sceneId: "outra", cells: ["9:9"] });
	await step("broadcast:explored_reset", { sceneId: "scene-a" });
	await step("broadcast:template_move", {
		userId: "lia",
		sceneId: "scene-a",
		template: { id: "tp", shape: "circle", x: 0, y: 0, size: 2, color: "#0f0" },
	});
	await step("broadcast:template_move", {
		userId: "lia",
		sceneId: "scene-a",
		placed: true,
		template: { id: "tl", shape: "circle", x: 0, y: 0, size: 2, color: "#0f0" },
	});
	await step("broadcast:template_move", {
		userId: "lia",
		sceneId: "outra",
		placed: true,
		template: { id: "tx", shape: "circle", x: 0, y: 0, size: 2, color: "#0f0" },
	});
	await step("broadcast:template_move", {
		userId: "lia",
		sceneId: "scene-a",
		removedIds: ["tl"],
	});
	await step("presence:leave", { leftPresences: [{ userId: "lia" }] });

	expect(steps).toMatchSnapshot();
});

it("troca de cena e saída: um subscribe por cena e o canal é removido", async () => {
	await openTable();
	const before = mock.channels.filter((c) => c.name.startsWith("vtt-room:"));
	await act(async () => {
		useVTTStore.getState().setUserColor("#ff0000");
	});
	const afterColor = room();
	cleanup();
	expect(
		stable({
			roomChannelsBefore: before.map((c) => [c.name, c.subscribes]),
			trackedAfterColor: afterColor.tracked,
			removed: mock.removed.filter((n) => n.startsWith("vtt-room:")),
		}),
	).toMatchSnapshot();
});
