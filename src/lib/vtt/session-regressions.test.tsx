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
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { VTTScene, VTTToken } from "./types";
import { useVTTStore } from "./vtt-store";

const mock = vi.hoisted(() => ({
	rpc: vi.fn().mockResolvedValue({ data: "scene-b", error: null }),
	toasts: [] as Array<{ variant: string; description: string }>,
	role: "viewer" as "owner" | "viewer",
	sceneBar: null as null | {
		onActivateScene: (sceneId: string) => Promise<void>;
	},
	fogControls: null as null | {
		onUpdateScene: (
			sceneId: string,
			updates: Partial<VTTScene>,
		) => Promise<void>;
	},
	ownersFail: false,
	writes: [] as Array<(value: unknown) => void>,
	patches: [] as unknown[],
	tokenChanges: [] as Array<(payload: unknown) => void>,
	canvas: null as null | {
		onUpdateToken: (id: string, updates: Partial<VTTToken>) => Promise<void>;
		characterOwners: unknown[];
		controlError: string | null;
	},
}));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	useParams: () => ({ campaignId: "campaign" }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/lib/store", () => ({
	useRPGStore: (selector: (s: unknown) => unknown) => selector({ campaigns }),
}));
vi.mock("@/components/vtt/vtt-canvas", () => ({
	VTTCanvas: (props: typeof mock.canvas) => {
		mock.canvas = props;
		return null;
	},
}));
vi.mock("@/components/vtt/vtt-fog-controls", () => ({
	VTTFogControls: (props: NonNullable<typeof mock.fogControls>) => {
		mock.fogControls = props;
		return null;
	},
}));
vi.mock("@/components/ui/toast", () => ({
	showToast: (variant: string, toast: { description: string }) =>
		mock.toasts.push({ variant, description: toast.description }),
}));
vi.mock("@/components/vtt/vtt-grid-settings", () => ({
	VTTGridSettings: () => null,
}));
vi.mock("@/components/vtt/vtt-journal", () => ({ VTTJournal: () => null }));
vi.mock("@/components/vtt/vtt-roster-drawer", () => ({
	VTTRosterDrawer: () => null,
}));
vi.mock("@/components/vtt/vtt-scene-bar", () => ({
	VTTSceneBar: (props: NonNullable<typeof mock.sceneBar>) => {
		mock.sceneBar = props;
		return null;
	},
}));
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

const user = { id: "player" };
const campaigns = [
	{
		id: "campaign",
		ownerId: "gm",
		get myRole() {
			return mock.role;
		},
	},
];
const sceneRow = (id: string, isActive: boolean) => ({
	id,
	campaign_id: "campaign",
	name: id === "scene-a" ? "Cena A" : "Cena B",
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
	fog_enabled: false,
	fog_exploration: false,
	is_active: isActive,
	order_index: id === "scene-a" ? 0 : 1,
	created_at: id,
	updated_at: id,
});
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
		rpc: mock.rpc,
		from: (table: string) => {
			let writing = false;
			const query = {
				select: () => query,
				eq: () => query,
				order: () => query,
				update: (patch: unknown) => {
					if (
						table === "vtt_scenes" &&
						typeof patch === "object" &&
						patch !== null &&
						"is_active" in patch
					) {
						throw new Error("publicação passou pelo UPDATE direto");
					}
					writing = true;
					if (table === "vtt_tokens") mock.patches.push(patch);
					return query;
				},
				single: () =>
					writing
						? new Promise((resolve) => mock.writes.push(resolve))
						: Promise.resolve({ data: null, error: null }),
				maybeSingle: () => Promise.resolve({ data: null, error: null }),
				// biome-ignore lint/suspicious/noThenProperty: Supabase queries are intentionally thenable.
				then: (resolve: (value: unknown) => unknown) =>
					Promise.resolve(
						table === "characters"
							? {
									data: mock.ownersFail
										? null
										: [{ id: "character", user_id: "player" }],
									error: mock.ownersFail ? new Error("offline") : null,
								}
							: {
									data:
										table === "vtt_scenes"
											? writing
												? [{ id: "scene-a" }]
												: [
														sceneRow("scene-a", true),
														sceneRow("scene-b", false),
													]
											: [],
									error: null,
								},
					).then(resolve),
			};
			return query;
		},
		channel: () => {
			const channel = {
				on: (
					type: string,
					filter: { table?: string },
					callback: (payload: unknown) => void,
				) => {
					if (type === "postgres_changes" && filter?.table === "vtt_tokens")
						mock.tokenChanges.push(callback);
					return channel;
				},
				subscribe: () => channel,
				unsubscribe: vi.fn(),
				untrack: vi.fn(),
				track: vi.fn(),
			};
			return channel;
		},
		removeChannel: vi.fn(),
	}),
}));

import { Route } from "@/routes/campaigns/$campaignId/vtt";

const Page = (Route as unknown as { component: ComponentType }).component;
const initial = useVTTStore.getState();
beforeEach(() => {
	mock.role = "viewer";
	mock.ownersFail = false;
	mock.writes = [];
	mock.patches = [];
	mock.tokenChanges = [];
	mock.rpc.mockClear().mockResolvedValue({ data: "scene-b", error: null });
	mock.toasts = [];
	mock.sceneBar = null;
	mock.fogControls = null;
	mock.canvas = null;
	useVTTStore.setState(initial, true);
});
afterEach(cleanup);
async function open() {
	const view = render(<Page />);
	await waitFor(() => expect(mock.canvas?.characterOwners.length).toBe(1));
	await act(async () => {
		useVTTStore.getState().setTokens([token]);
	});
	await waitFor(() => expect(useVTTStore.getState().tokens).toHaveLength(1));
	return view;
}
it("shows an ownership query error and retries it to restore control", async () => {
	mock.ownersFail = true;
	render(<Page />);
	const retry = await screen.findByRole("button", {
		name: "Recarregar permissões",
	});
	expect(screen.getByRole("alert").textContent).toContain("permissões");
	mock.ownersFail = false;
	fireEvent.click(retry);
	await waitFor(() => expect(mock.canvas?.characterOwners.length).toBe(1));
	expect(screen.queryByRole("alert")).toBeNull();
});
it("does not let a response from an unmounted session overwrite current HP", async () => {
	const old = await open();
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { hpCurrent: 10 });
	});
	old.unmount();
	await open();
	act(() => {
		useVTTStore.getState().updateToken("token", { hpCurrent: 8 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await pending;
	});
	expect(useVTTStore.getState().tokens[0].hpCurrent).toBe(8);
});
it("does not rewind the token while another drag is active", async () => {
	await open();
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { x: 100 });
	});
	act(() => {
		useVTTStore.setState({ draggedTokenId: "token" });
		useVTTStore.getState().updateToken("token", { x: 200 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await pending;
	});
	expect(useVTTStore.getState().tokens[0].x).toBe(200);
});

it("a resposta de um passo não volta o token quando há um passo mais novo esperando na fila", async () => {
	await open();
	let first: Promise<void>;
	let second: Promise<void>;
	act(() => {
		first = canvas().onUpdateToken("token", { x: 100, y: 0 });
	});
	act(() => {
		useVTTStore.getState().updateToken("token", { x: 100, y: 0 });
		// o passo seguinte chega com o primeiro ainda em voo: espera na fila
		second = canvas().onUpdateToken("token", { x: 200, y: 0 });
		useVTTStore.getState().updateToken("token", { x: 200, y: 0 });
	});
	expect(mock.writes).toHaveLength(1);
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await first;
	});
	expect(useVTTStore.getState().tokens[0].x).toBe(200);
	// a última posição sempre sai: a segunda gravação leva o passo mais novo
	await waitFor(() => expect(mock.writes).toHaveLength(2));
	await act(async () => {
		mock.writes[1]({ data: { id: "token" }, error: null });
		await second;
	});
	expect(useVTTStore.getState().tokens[0].x).toBe(200);
});

it("passos rápidos viram poucas gravações, e a última posição é a gravada", async () => {
	await open();
	const results: Promise<void>[] = [];
	act(() => {
		for (let i = 1; i <= 8; i++) {
			results.push(canvas().onUpdateToken("token", { x: i * 10, y: 0 }));
			useVTTStore.getState().updateToken("token", { x: i * 10, y: 0 });
		}
	});
	// uma em voo (o primeiro passo); os outros 7 esperam, fundidos
	expect(mock.writes).toHaveLength(1);
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await results[0];
	});
	await waitFor(() => expect(mock.writes).toHaveLength(2));
	await act(async () => {
		mock.writes[1]({ data: { id: "token" }, error: null });
		await Promise.all(results);
	});
	expect(mock.writes).toHaveLength(2);
	expect(useVTTStore.getState().tokens[0].x).toBe(80);
});

it("o passo gravado larga o alvo de interpolação velho (devolver do histórico)", async () => {
	await open();
	act(() => {
		useVTTStore.getState().updateToken("token", { targetX: 500, targetY: 500 });
	});
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { x: 100, y: 100 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await pending;
	});
	const token = useVTTStore.getState().tokens[0];
	expect(token).toMatchObject({ x: 100, y: 100 });
	expect(token.targetX).toBeUndefined();
	expect(token.targetY).toBeUndefined();
});

it("a posição já igual na mesa também larga o alvo velho quando a gravação confirma", async () => {
	await open();
	act(() => {
		useVTTStore
			.getState()
			.updateToken("token", { x: 100, y: 100, targetX: 500, targetY: 500 });
	});
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { x: 100, y: 100 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await pending;
	});
	const token = useVTTStore.getState().tokens[0];
	expect(token.targetX).toBeUndefined();
	expect(token.targetY).toBeUndefined();
});

const row = (over: Record<string, unknown> = {}) => ({
	id: "token",
	scene_id: "scene-a",
	character_id: "character",
	npc_id: null,
	name: "Hero",
	avatar_url: null,
	layer: "token",
	x: 0,
	y: 0,
	size_cells: 1,
	rotation: 0,
	hp_current: 12,
	hp_max: null,
	temp_hp: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	vision_range: 6,
	is_locked: false,
	is_hidden: false,
	controlled_by: [],
	created_at: "",
	updated_at: "",
	...over,
});
function echo(over: Record<string, unknown>) {
	const handler = mock.tokenChanges[mock.tokenChanges.length - 1];
	if (!handler) throw new Error("sem canal de tokens");
	act(() => handler({ eventType: "UPDATE", new: row(over), old: {} }));
}

it("giro só de rotation passa pela fila: gira rápido várias vezes e a ÚLTIMA rotação é a gravada", async () => {
	await open();
	const results: Promise<void>[] = [];
	act(() => {
		for (const rotation of [45, 90, 135, 180, 225]) {
			useVTTStore.getState().updateToken("token", { rotation });
			results.push(canvas().onUpdateToken("token", { rotation }));
		}
	});
	expect(mock.writes).toHaveLength(1);
	expect(mock.patches[0]).toEqual({ rotation: 45 });
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await results[0];
	});
	await waitFor(() => expect(mock.writes).toHaveLength(2));
	expect(mock.patches[1]).toEqual({ rotation: 225 });
	await act(async () => {
		mock.writes[1]({ data: { id: "token" }, error: null });
		await Promise.all(results);
	});
	expect(useVTTStore.getState().tokens[0].rotation).toBe(225);
});

it("o eco VELHO da minha gravação não volta o token, mas a rotação isolada de OUTRO usuário é aplicada", async () => {
	await open();
	let first: Promise<void>;
	act(() => {
		useVTTStore.getState().updateToken("token", { x: 70, y: 0 });
		first = canvas().onUpdateToken("token", { x: 70, y: 0 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await first;
	});
	// já andei mais um passo (o anterior foi enviado; este espera na fila)
	act(() => {
		useVTTStore.getState().updateToken("token", { x: 140, y: 0 });
		void canvas().onUpdateToken("token", { x: 140, y: 0 });
	});
	// eco velho do passo 1 (x=70): ignorado
	echo({ x: 70, y: 0 });
	expect(useVTTStore.getState().tokens[0].x).toBe(140);
	// OUTRO usuário gira o token: mesma posição que eu enviei antes (70,0), rotação
	// nova. Estado inteiro que eu nunca enviei -> tem que ser aplicado.
	echo({ x: 70, y: 0, rotation: 90 });
	expect(useVTTStore.getState().tokens[0]).toMatchObject({
		x: 70,
		y: 0,
		rotation: 90,
	});
});

it("giro pelo painel (a mesa só gira quando a gravação confirma): o eco velho dele também é reconhecido", async () => {
	await open();
	act(() => {
		void canvas().onUpdateToken("token", { rotation: 90 });
		void canvas().onUpdateToken("token", { rotation: 180 });
	});
	// 90 foi enviado, 180 espera: o eco de 90 é velho e não pode mexer na mesa
	echo({ x: 0, y: 0, rotation: 90 });
	expect(useVTTStore.getState().tokens[0].rotation).toBe(0);
});

it("a linha que só repete o que a mesa já mostra não mexe na store (sem render à toa)", async () => {
	await open();
	// a linha do banco traz todos os campos: a mesa já tem os mesmos valores
	act(() =>
		useVTTStore.getState().updateToken("token", { hpMax: null, tempHp: 0 }),
	);
	const before = useVTTStore.getState().tokens;
	echo({ x: 0, y: 0, rotation: 0 });
	expect(useVTTStore.getState().tokens).toBe(before);
});

it("mudança de OUTRO usuário em outro token ou em posição nunca enviada por mim é aplicada", async () => {
	await open();
	act(() => {
		useVTTStore.getState().updateToken("token", { x: 70, y: 0 });
		void canvas().onUpdateToken("token", { x: 70, y: 0 });
	});
	echo({ x: 350, y: 70 });
	expect(useVTTStore.getState().tokens[0]).toMatchObject({ x: 350, y: 70 });
});

it("o eco do ÚLTIMO estado que enviei, com a fila vazia, é aplicado (corrige divergência)", async () => {
	await open();
	let first: Promise<void>;
	act(() => {
		useVTTStore.getState().updateToken("token", { x: 70, y: 0 });
		first = canvas().onUpdateToken("token", { x: 70, y: 0 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await first;
	});
	// outro usuário mexeu no meio e a mesa ficou em (350,70); o banco ficou em (70,0)
	act(() => useVTTStore.getState().updateToken("token", { x: 350, y: 70 }));
	echo({ x: 70, y: 0 });
	expect(useVTTStore.getState().tokens[0]).toMatchObject({ x: 70, y: 0 });
});

function canvas() {
	if (!mock.canvas) throw new Error("Canvas not mounted");
	return mock.canvas;
}

it("ignores a failed write from an ended session without reloading current tokens", async () => {
	const old = await open();
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { hpCurrent: 10 });
	});
	old.unmount();
	await open();
	act(() => {
		useVTTStore.getState().updateToken("token", { hpCurrent: 8 });
	});
	await act(async () => {
		mock.writes[0]({ data: null, error: new Error("rejected") });
		await pending;
	});
	expect(useVTTStore.getState().tokens[0].hpCurrent).toBe(8);
	expect(screen.queryByRole("alert")).toBeNull();
});
it("applies HP updates during a drag without overwriting its position", async () => {
	await open();
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { x: 100, y: 100, hpCurrent: 8 });
	});
	act(() => {
		useVTTStore.setState({ draggedTokenId: "token" });
		useVTTStore.getState().updateToken("token", { x: 200, y: 300 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await pending;
	});
	expect(useVTTStore.getState().tokens[0]).toMatchObject({
		x: 200,
		y: 300,
		hpCurrent: 8,
	});
});

it("publishes one scene through exactly one RPC, without the old UPDATE pair", async () => {
	mock.role = "owner";
	await open();
	await waitFor(() => expect(mock.sceneBar).not.toBeNull());
	act(() => useVTTStore.getState().setActiveSceneId("scene-b"));
	await act(async () => mock.sceneBar?.onActivateScene("scene-b"));
	expect(useVTTStore.getState().activeSceneId).toBe("scene-b");
	expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("publish_scene", {
		p_scene_id: "scene-b",
	});
	expect(useVTTStore.getState().scenes.map((scene) => scene.isActive)).toEqual([
		false,
		true,
	]);
});

it("keeps every game scene activation on the same RPC for A then B", async () => {
	mock.role = "owner";
	await open();
	act(() => useVTTStore.getState().setActiveSceneId("scene-b"));
	expect(useVTTStore.getState().activeSceneId).toBe("scene-b");
	await act(async () => mock.sceneBar?.onActivateScene("scene-a"));
	expect(useVTTStore.getState().activeSceneId).toBe("scene-b");
	expect(useVTTStore.getState().scenes.map((scene) => scene.isActive)).toEqual([
		true,
		false,
	]);
	await act(async () => mock.sceneBar?.onActivateScene("scene-b"));
	expect(mock.rpc).toHaveBeenCalledTimes(2);
	expect(
		useVTTStore.getState().scenes.filter((scene) => scene.isActive),
	).toHaveLength(1);
	expect(useVTTStore.getState().scenes[1].isActive).toBe(true);
});

it("surfaces a missing RPC without falling back to the old two UPDATEs", async () => {
	mock.role = "owner";
	mock.rpc.mockResolvedValue({
		data: null,
		error: { code: "PGRST202", message: "function not found" },
	});
	await open();
	await expect(mock.sceneBar?.onActivateScene("scene-b")).rejects.toThrow(
		"publicação atômica ainda não está habilitada",
	);
	expect(mock.toasts[0].description).toContain("administrador");
	expect(useVTTStore.getState().scenes[0].isActive).toBe(true);
});

it("shares a duplicate publication click while one RPC is in flight", async () => {
	mock.role = "owner";
	let finish: ((value: unknown) => void) | undefined;
	mock.rpc.mockImplementationOnce(
		() =>
			new Promise((resolve) => {
				finish = resolve;
			}),
	);
	await open();
	const first = mock.sceneBar?.onActivateScene("scene-b");
	const second = mock.sceneBar?.onActivateScene("scene-b");
	expect(mock.rpc).toHaveBeenCalledTimes(1);
	await act(async () => {
		finish?.({ data: "scene-b", error: null });
		await Promise.all([first, second]);
	});
});

it("refuses a direct isActive patch and never converts it into publication", async () => {
	mock.role = "owner";
	await open();
	await waitFor(() => expect(mock.fogControls).not.toBeNull());
	await expect(
		mock.fogControls?.onUpdateScene("scene-b", { isActive: true }),
	).rejects.toThrow("publica");
	expect(mock.rpc).not.toHaveBeenCalled();
	expect(useVTTStore.getState().scenes[1].isActive).toBe(false);
	expect(mock.toasts).toHaveLength(1);
});
