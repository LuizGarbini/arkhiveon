import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VTTToken } from "./types";
import type { VTTWall } from "./walls";

type Handler = (payload: {
	eventType?: string;
	old?: unknown;
	new?: unknown;
}) => void;
type StatusHandler = (status: string) => void;

const db = vi.hoisted(() => ({
	handlers: [] as {
		event: string;
		table?: string;
		filter?: string;
		handler: Handler;
	}[],
	onStatus: null as StatusHandler | null,
	rows: [] as {
		id: string;
		scene_id: string;
		x1: number;
		y1: number;
		x2: number;
		y2: number;
	}[],
	selects: 0,
	removed: 0,
}));

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		channel: () => {
			const chain = {
				on: (
					_type: string,
					opts: { event: string; table?: string; filter?: string },
					handler: Handler,
				) => {
					db.handlers.push({
						event: opts.event,
						table: opts.table,
						filter: opts.filter,
						handler,
					});
					return chain;
				},
				subscribe: (cb?: StatusHandler) => {
					db.onStatus = cb ?? null;
					return chain;
				},
			};
			return chain;
		},
		removeChannel: async () => {
			db.removed += 1;
			return "ok";
		},
		from: () => ({
			select: () => ({
				eq: () => ({
					order: () => {
						db.selects += 1;
						return Promise.resolve({ data: db.rows, error: null });
					},
				}),
			}),
		}),
	}),
}));
vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

import { visibleTokenIds } from "./token-motion";
import { pointInPolygon, sourcePolygons, visionSources } from "./vision";
import { useVTTStore } from "./vtt-store";
import {
	realtimeDeleteId,
	subscribeWallChanges,
	wallsAfterRemoteDelete,
} from "./wall-sync";
import { blockingWalls } from "./walls";

const wall = (
	id: string,
	sceneId: string,
	coords: Pick<VTTWall, "x1" | "y1" | "x2" | "y2"> = {
		x1: 0,
		y1: 0,
		x2: 10,
		y2: 0,
	},
): VTTWall => ({ id, sceneId, ...coords });

const row = (id: string, x1 = 0) => ({
	id,
	scene_id: "s1",
	x1,
	y1: 0,
	x2: x1 + 10,
	y2: 0,
});

const token = (over: Partial<VTTToken>): VTTToken => ({
	id: "t",
	sceneId: "s1",
	name: "T",
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
	...over,
});

const exploring = { gridSize: 70, fogEnabled: true, fogExploration: true };
const pc = token({
	id: "pc",
	characterId: "c",
	x: 0,
	y: 0,
	visionRange: 6,
	rotation: 90,
});
const near = token({ id: "near", x: 140, y: 0 });
const behind = { x: 140, y: 0 };

/** O que a mesa deriva das paredes: quem o jogador vê e se a névoa abre atrás. */
function derived(walls: readonly VTTWall[]) {
	const blockers = blockingWalls(walls);
	const sources = visionSources([pc, near], exploring.gridSize);
	const seen = visibleTokenIds([pc, near], false, exploring, {
		sources,
		walls: blockers,
	});
	const revealed = sources.some((source) =>
		sourcePolygons(source, blockers).some((poly) =>
			pointInPolygon(behind, poly),
		),
	);
	return { seen, revealed };
}

let stop: (() => void) | null = null;

beforeEach(() => {
	stop?.();
	stop = null;
	db.handlers = [];
	db.onStatus = null;
	db.rows = [];
	db.selects = 0;
	db.removed = 0;
	useVTTStore.setState({
		activeSceneId: "s1",
		walls: [],
		wallsStatus: "ready",
		selectedWallIds: [],
	});
});

function listen() {
	stop = subscribeWallChanges("s1");
	const changes = db.handlers.find((item) => item.event === "*");
	const deletes = db.handlers.find((item) => item.event === "DELETE");
	if (!changes || !deletes) throw new Error("inscrição incompleta");
	return { changes, deletes };
}

describe("DELETE de parede sem filtro", () => {
	it("o ouvinte de DELETE não filtra por coluna; INSERT/UPDATE filtram a cena", () => {
		const { changes, deletes } = listen();
		expect(changes.table).toBe("vtt_walls");
		expect(changes.filter).toBe("scene_id=eq.s1");
		expect(deletes.table).toBe("vtt_walls");
		expect(deletes.filter).toBeUndefined();
		expect(db.handlers.filter((item) => item.event === "DELETE")).toHaveLength(
			1,
		);
	});

	it("id presente some da store e da seleção, sem recarregar", () => {
		const here = wall("aqui", "s1");
		const keep = wall("fica", "s1", { x1: 1, y1: 1, x2: 2, y2: 2 });
		useVTTStore.setState({
			walls: [here, keep],
			selectedWallIds: ["aqui", "fica"],
		});
		const { deletes } = listen();
		deletes.handler({
			eventType: "DELETE",
			old: { id: "aqui", scene_id: "outra-campanha", secret: "não usar" },
		});
		const state = useVTTStore.getState();
		expect(state.walls).toEqual([keep]);
		expect(state.walls[0]).toBe(keep);
		expect(state.selectedWallIds).toEqual(["fica"]);
		expect(state.wallsStatus).toBe("ready");
		expect(db.selects).toBe(0);
	});

	it("id desconhecido não muda a lista nem a seleção", () => {
		const here = wall("aqui", "s1");
		useVTTStore.setState({ walls: [here], selectedWallIds: ["aqui"] });
		const before = useVTTStore.getState();
		const { deletes } = listen();
		deletes.handler({ eventType: "DELETE", old: { id: "nao-existe" } });
		const state = useVTTStore.getState();
		expect(state.walls).toBe(before.walls);
		expect(state.selectedWallIds).toBe(before.selectedWallIds);
		expect(db.selects).toBe(0);
	});

	it("id de outra cena não muda nada, mesmo que esteja na store", () => {
		const foreign = wall("de-la", "s2");
		const here = wall("aqui", "s1");
		useVTTStore.setState({
			walls: [foreign, here],
			selectedWallIds: ["de-la", "aqui"],
		});
		const before = useVTTStore.getState();
		const { deletes } = listen();
		deletes.handler({ eventType: "DELETE", old: { id: "de-la" } });
		const state = useVTTStore.getState();
		expect(state.walls).toBe(before.walls);
		expect(state.selectedWallIds).toBe(before.selectedWallIds);
		expect(foreign.sceneId).toBe("s2");
	});

	it("payload sem id, id vazio ou id que não é texto é ignorado", () => {
		const here = wall("aqui", "s1");
		useVTTStore.setState({ walls: [here] });
		const before = useVTTStore.getState().walls;
		const { deletes } = listen();
		deletes.handler({ eventType: "DELETE", old: {} });
		deletes.handler({ eventType: "DELETE", old: { id: "" } });
		deletes.handler({ eventType: "DELETE", old: { id: 12 } });
		deletes.handler({ eventType: "DELETE", old: null });
		deletes.handler({ eventType: "DELETE" });
		expect(useVTTStore.getState().walls).toBe(before);
		expect(realtimeDeleteId({ id: "ok", scene_id: "x" })).toBe("ok");
		expect(realtimeDeleteId(null)).toBeNull();
	});

	it("depois que a cena muda, o DELETE da inscrição antiga não mexe na mesa", () => {
		const here = wall("aqui", "s1");
		useVTTStore.setState({ walls: [here] });
		const { deletes } = listen();
		useVTTStore.setState({ activeSceneId: "s2" });
		const before = useVTTStore.getState().walls;
		deletes.handler({ eventType: "DELETE", old: { id: "aqui" } });
		expect(useVTTStore.getState().walls).toBe(before);
	});

	it("INSERT e UPDATE continuam recarregando a cena, e o DELETE filtrado não", async () => {
		const here = wall("aqui", "s1");
		useVTTStore.setState({ walls: [here] });
		db.rows = [row("vinda-do-banco", 4)];
		const { changes } = listen();
		changes.handler({
			eventType: "DELETE",
			old: { id: "aqui" },
			new: { id: "nao-entra", secret: true },
		});
		expect(useVTTStore.getState().walls).toEqual([here]);
		expect(db.selects).toBe(0);

		changes.handler({
			eventType: "INSERT",
			new: { id: "do-payload", scene_id: "outra", secret: "x" },
		});
		await vi.waitFor(() =>
			expect(useVTTStore.getState().walls.map((item) => item.id)).toEqual([
				"vinda-do-banco",
			]),
		);
		expect(useVTTStore.getState().walls[0]?.x1).toBe(4);
		expect(
			useVTTStore.getState().walls.some((item) => item.id === "do-payload"),
		).toBe(false);

		db.rows = [row("vinda-do-banco", 9)];
		changes.handler({ eventType: "UPDATE", new: { id: "do-payload", x1: 1 } });
		await vi.waitFor(() => expect(useVTTStore.getState().walls[0]?.x1).toBe(9));
		expect(db.selects).toBe(2);
	});

	it("ao voltar de uma queda, recarrega as paredes da cena", async () => {
		useVTTStore.setState({ walls: [wall("velha", "s1")] });
		db.rows = [row("nova")];
		listen();
		db.onStatus?.("SUBSCRIBED");
		await Promise.resolve();
		expect(db.selects).toBe(0);
		db.onStatus?.("CHANNEL_ERROR");
		db.onStatus?.("SUBSCRIBED");
		await vi.waitFor(() =>
			expect(useVTTStore.getState().walls.map((item) => item.id)).toEqual([
				"nova",
			]),
		);
	});

	it("depois de cancelar a inscrição, um DELETE atrasado não altera a store", () => {
		const here = wall("aqui", "s1");
		useVTTStore.setState({ walls: [here] });
		const { deletes } = listen();
		stop?.();
		stop = null;
		const before = useVTTStore.getState().walls;
		deletes.handler({ eventType: "DELETE", old: { id: "aqui" } });
		expect(useVTTStore.getState().walls).toBe(before);
		expect(db.removed).toBe(1);
	});
});

describe("visão e névoa quando a parede sai", () => {
	const blocker = wall("muro", "s1", { x1: 70, y1: -100, x2: 70, y2: 100 });

	it("a lista pura não mexe em id de outra cena e tira o da cena atual", () => {
		const foreign = wall("de-la", "s2");
		const same = [foreign, blocker];
		expect(wallsAfterRemoteDelete(same, "s1", "de-la")).toBe(same);
		expect(wallsAfterRemoteDelete(same, "s1", "nao-existe")).toBe(same);
		expect(wallsAfterRemoteDelete(same, "s1", null)).toBe(same);
		expect(wallsAfterRemoteDelete(same, null, "muro")).toBe(same);
		expect(wallsAfterRemoteDelete(same, "s1", "muro")).toEqual([foreign]);
	});

	it("o jogador passa a ver atrás da parede, e a névoa abre, sem recarregar", () => {
		useVTTStore.setState({ walls: [blocker] });
		const { deletes } = listen();
		expect(derived(useVTTStore.getState().walls)).toEqual({
			seen: "pc",
			revealed: false,
		});
		deletes.handler({ eventType: "DELETE", old: { id: "muro" } });
		expect(useVTTStore.getState().walls).toEqual([]);
		expect(derived(useVTTStore.getState().walls)).toEqual({
			seen: "pc|near",
			revealed: true,
		});
		expect(db.selects).toBe(0);
	});
});
