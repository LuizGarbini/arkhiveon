// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { useVTTStore } from "./vtt-store";

const mock = vi.hoisted(() => ({
	user: { id: "gm" },
	campaigns: [{ id: "campaign", ownerId: "gm", myRole: "owner" }],
	writes: [] as {
		patch: Record<string, unknown>;
		filters: Record<string, string>;
		resolve: (v: unknown) => void;
	}[],
	rpc: [] as { args: unknown; resolve: (v: unknown) => void }[],
	remoteScale: 1,
	fogBroadcast: vi.fn(),
	fogPersistence: vi.fn(),
	holdTokenRead: false,
	tokenAnswers: [] as ((v: unknown) => void)[],
}));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	useParams: () => ({ campaignId: "campaign" }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: mock.user }) }));
vi.mock("@/lib/store", async (importOriginal) => ({
	...(await importOriginal<typeof import("@/lib/store")>()),
	useRPGStore: (selector: (s: unknown) => unknown) =>
		selector({ campaigns: mock.campaigns }),
}));
vi.mock("@/components/vtt/vtt-canvas", () => ({ VTTCanvas: () => null }));
vi.mock("@/components/vtt/vtt-ai-chat", () => ({ VTTAiChat: () => null }));
vi.mock("@/components/vtt/vtt-combat-panel", () => ({
	VTTCombatPanel: () => null,
}));
vi.mock("@/components/vtt/vtt-feed-panel", () => ({
	VTTFeedPanel: () => null,
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
function row(id: string) {
	return {
		id,
		campaign_id: "campaign",
		name: id,
		map_image_url: null,
		grid_type: "square",
		grid_size: 70,
		grid_color: "#ffffff",
		grid_opacity: 0.2,
		grid_scale_distance: 1.5,
		grid_scale_unit: "m",
		grid_offset_x: 0,
		grid_offset_y: 0,
		map_scale: id === "a" ? mock.remoteScale : 1,
		width: 1000,
		height: 1000,
		fog_enabled: false,
		fog_exploration: false,
		is_active: id === "a",
		order_index: id === "a" ? 0 : 1,
		created_at: "now",
		updated_at: "now",
	};
}
vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		rpc: (_name: string, args: unknown) => ({
			abortSignal: () =>
				new Promise((resolve) => mock.rpc.push({ args, resolve })),
		}),
		from: (table: string) => {
			let patch: Record<string, unknown> | null = null;
			const filters: Record<string, string> = {};
			const query = {
				select: () => query,
				upsert: (value: unknown) => {
					if (table === "vtt_fog_states") mock.fogPersistence(value);
					return Promise.resolve({ data: null, error: null });
				},
				order: () => query,
				eq: (k: string, v: string) => {
					filters[k] = v;
					return query;
				},
				update: (value: Record<string, unknown>) => {
					patch = value;
					return query;
				},
				maybeSingle: () =>
					patch
						? new Promise((resolve) =>
								mock.writes.push({ patch: patch ?? {}, filters, resolve }),
							)
						: Promise.resolve({
								data: table === "vtt_scenes" ? row(filters.id) : null,
								error: null,
							}),
				single: () => Promise.resolve({ data: null, error: null }),
				// biome-ignore lint/suspicious/noThenProperty: Supabase's public fluent query is thenable.
				then: (resolve: (v: unknown) => unknown) =>
					(table === "vtt_tokens" && mock.holdTokenRead
						? new Promise((answer) => mock.tokenAnswers.push(answer))
						: Promise.resolve({
								data: table === "vtt_scenes" ? [row("a"), row("b")] : [],
								error: null,
							})
					).then(resolve),
			};
			return query;
		},
		channel: () => {
			const channel = {
				on: () => channel,
				subscribe: () => channel,
				track: vi.fn(),
				untrack: vi.fn(),
				send: (value: { event?: string }) => {
					if (value.event === "fog_update") mock.fogBroadcast(value);
				},
				presenceState: () => ({}),
			};
			return channel;
		},
		removeChannel: vi.fn(),
	}),
}));

import { Route } from "@/routes/campaigns/$campaignId/vtt";

const Page = (Route as unknown as { component: ComponentType }).component;
beforeEach(() => {
	mock.writes = [];
	mock.rpc = [];
	mock.remoteScale = 1;
	mock.fogBroadcast.mockClear();
	mock.fogPersistence.mockClear();
	mock.holdTokenRead = false;
	mock.tokenAnswers = [];
	useVTTStore.setState({
		isGM: false,
		scenes: [],
		activeSceneId: null,
		tokens: [],
		walls: [],
		showGridSettings: true,
		gridMoreOpen: true,
		showFogControls: false,
	});
});
afterEach(cleanup);
async function open() {
	render(
		<ToastProvider>
			<Page />
		</ToastProvider>,
	);
	await waitFor(() =>
		expect(
			(screen.getByLabelText("Tamanho da célula (px)") as HTMLInputElement)
				.value,
		).toBe("70"),
	);
}
const plus = () => screen.getByRole("button", { name: "Aumentar célula" });
const ack = (index: number, error: unknown = null) =>
	act(async () =>
		mock.writes[index].resolve({
			data: error ? null : { id: "a", updated_at: "ack" },
			error,
		}),
	);
describe("P2b rota real + grid real + P1 real", () => {
	it("ACK A não sobrescreve B/cor; writer captura campaign e envia B só depois", async () => {
		await open();
		fireEvent.click(plus());
		await waitFor(() => expect(mock.writes).toHaveLength(1));
		fireEvent.click(plus());
		fireEvent.click(
			screen.getByRole("button", { name: "Cor do grid #000000" }),
		);
		expect(mock.writes[0]).toMatchObject({
			patch: { grid_size: 71 },
			filters: { id: "a", campaign_id: "campaign" },
		});
		expect(
			(screen.getByLabelText("Tamanho da célula (px)") as HTMLInputElement)
				.value,
		).toBe("72");
		await ack(0);
		await waitFor(() => expect(mock.writes).toHaveLength(2));
		expect(mock.writes[1].patch).toEqual({
			grid_size: 72,
			grid_color: "#000000",
		});
		expect(useVTTStore.getState().scenes[0].gridSize).toBe(72);
		await ack(1);
	});
	it("RLS zero rows mantém B/erro só A; A→B→A e retry reaproveitam último delta", async () => {
		await open();
		fireEvent.click(plus());
		await waitFor(() => expect(mock.writes).toHaveLength(1));
		fireEvent.click(plus());
		await act(async () => mock.writes[0].resolve({ data: null, error: null }));
		expect((await screen.findByRole("alert")).textContent).toContain(
			"Não foi possível salvar",
		);
		expect(useVTTStore.getState().scenes[0].gridSize).toBe(72);
		act(() => useVTTStore.getState().setActiveSceneId("b"));
		expect(screen.queryByRole("alert")).toBeNull();
		act(() => useVTTStore.getState().setActiveSceneId("a"));
		expect(screen.getByRole("alert").textContent).toContain(
			"Não foi possível salvar",
		);
		fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
		await waitFor(() => expect(mock.writes).toHaveLength(2));
		expect(mock.writes[1].patch).toEqual({ grid_size: 72 });
		await ack(1);
		await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
	});
	it("scale aguarda grid e envia uma vez para A mesmo se ativar B antes do ACK", async () => {
		await open();
		fireEvent.click(plus());
		await waitFor(() => expect(mock.writes).toHaveLength(1));
		fireEvent.click(
			screen.getByRole("button", { name: "Aumentar escala do mapa" }),
		);
		expect(mock.rpc).toHaveLength(0);
		act(() => useVTTStore.getState().setActiveSceneId("b"));
		await ack(0);
		await waitFor(() => expect(mock.rpc).toHaveLength(1));
		expect(mock.rpc[0].args).toEqual({ p_scene_id: "a", p_factor: 1.05 });
		await act(async () =>
			mock.rpc[0].resolve({
				data: null,
				error: { code: "42501", message: "negado" },
			}),
		);
		expect(
			useVTTStore.getState().scenes.find((s) => s.id === "a")?.mapScale,
		).toBe(1);
		expect(useVTTStore.getState().activeSceneId).toBe("b");
	});
	it("resultado perdido exige leitura de cena/geometria e nunca repete fator", async () => {
		await open();
		fireEvent.click(
			screen.getByRole("button", { name: "Aumentar escala do mapa" }),
		);
		await waitFor(() => expect(mock.rpc).toHaveLength(1));
		await act(async () =>
			mock.rpc[0].resolve({
				data: null,
				error: { code: "", message: "network" },
			}),
		);
		expect(
			await screen.findByRole("button", { name: "Reconciliar" }),
		).toBeTruthy();
		mock.remoteScale = 1.05;
		fireEvent.click(screen.getByRole("button", { name: "Reconciliar" }));
		await waitFor(() =>
			expect(screen.queryByRole("button", { name: "Reconciliar" })).toBeNull(),
		);
		expect(mock.rpc).toHaveLength(1);
		expect(useVTTStore.getState().scenes[0].mapScale).toBe(1.05);
	});
});

it("GET inicial atrasado não apaga geometria relida após ACK da escala", async () => {
	mock.holdTokenRead = true;
	await open();
	await waitFor(() => expect(mock.tokenAnswers).toHaveLength(1));
	fireEvent.click(
		screen.getByRole("button", { name: "Aumentar escala do mapa" }),
	);
	await waitFor(() => expect(mock.rpc).toHaveLength(1));
	mock.remoteScale = 1.05;
	await act(async () => mock.rpc[0].resolve({ data: null, error: null }));
	await waitFor(() => expect(mock.tokenAnswers).toHaveLength(2));
	const token = {
		id: "token-a",
		scene_id: "a",
		name: "A",
		layer: "token",
		x: 105,
		y: 210,
		size_cells: 1,
		rotation: 0,
		elevation: 0,
		vision_range: 0,
		is_locked: false,
		is_hidden: false,
		controlled_by: [],
	};
	await act(async () => mock.tokenAnswers[1]({ data: [token], error: null }));
	await waitFor(() => expect(useVTTStore.getState().tokens[0]?.x).toBe(105));
	await act(async () =>
		mock.tokenAnswers[0]({ data: [{ ...token, x: 100, y: 200 }], error: null }),
	);
	expect(useVTTStore.getState().tokens[0]?.x).toBe(105);
	expect(mock.rpc).toHaveLength(1);
});

it("online enable pendente seguido de Revelar Tudo e 42501 produz ZERO clear/broadcast/persistence", async () => {
	const originalClear = useVTTStore.getState().clearFog;
	const clear = vi.fn(originalClear);
	useVTTStore.setState({ clearFog: clear });
	try {
		await open();
		act(() => useVTTStore.getState().setShowFogControls(true));
		fireEvent.click(screen.getByRole("button", { name: "Névoa Inativa" }));
		await waitFor(() => expect(mock.writes).toHaveLength(1));
		expect(useVTTStore.getState().scenes[0].fogEnabled).toBe(true);
		fireEvent.click(screen.getByRole("button", { name: "Revelar Tudo" }));
		await ack(0, { code: "42501", message: "negado" });
		expect({
			clear: clear.mock.calls.length,
			broadcast: mock.fogBroadcast.mock.calls.length,
			persistence: mock.fogPersistence.mock.calls.length,
		}).toEqual({ clear: 0, broadcast: 0, persistence: 0 });
	} finally {
		useVTTStore.setState({ clearFog: originalClear });
	}
});

it("online ACK do enable libera Revelar Tudo e cada efeito ocorre uma vez", async () => {
	const originalClear = useVTTStore.getState().clearFog;
	const clear = vi.fn(originalClear);
	useVTTStore.setState({ clearFog: clear });
	try {
		await open();
		act(() => useVTTStore.getState().setShowFogControls(true));
		fireEvent.click(screen.getByRole("button", { name: "Névoa Inativa" }));
		await waitFor(() => expect(mock.writes).toHaveLength(1));
		expect(
			screen
				.getByRole("button", { name: "Revelar Tudo" })
				.hasAttribute("disabled"),
		).toBe(true);
		await ack(0);
		const reveal = screen.getByRole("button", { name: "Revelar Tudo" });
		expect(reveal.hasAttribute("disabled")).toBe(false);
		fireEvent.click(reveal);
		expect({
			clear: clear.mock.calls.length,
			broadcast: mock.fogBroadcast.mock.calls.length,
			persistence: mock.fogPersistence.mock.calls.length,
		}).toEqual({ clear: 1, broadcast: 1, persistence: 1 });
	} finally {
		useVTTStore.setState({ clearFog: originalClear });
	}
});
