import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VTTToken } from "./types";

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
		shape: string;
		level: string;
		geometry: { x: number; y: number; radius: number };
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

import {
	lightZonesAfterRemoteDelete,
	subscribeLightZoneChanges,
} from "./light-zone-sync";
import { lightAt, type VTTLightZone } from "./light-zones";
import { resolveTokenVisionCells, visionSources } from "./vision";
import { useVTTStore } from "./vtt-store";

const zone = (
	id: string,
	sceneId: string,
	level: VTTLightZone["level"] = "dark",
): VTTLightZone => ({
	id,
	sceneId,
	level,
	shape: "circle",
	x: 0,
	y: 0,
	radius: 50,
});

const row = (id: string, level = "dim") => ({
	id,
	scene_id: "s1",
	shape: "circle",
	level,
	geometry: { x: 20, y: 20, radius: 30 },
});

const hero: VTTToken = {
	id: "pc",
	sceneId: "s1",
	name: "Herói",
	layer: "token",
	x: 10,
	y: 10,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
	characterId: "c",
};

/** Alcance derivado, como o canvas: luz do lugar → casas da visão. */
function rangeOf(zones: readonly VTTLightZone[]): number | undefined {
	const sources = visionSources([hero], 70, (token) =>
		resolveTokenVisionCells(
			token,
			new Map(),
			lightAt({ x: token.x, y: token.y }, zones, "bright"),
		),
	);
	return sources[0]?.range;
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
		lightZones: [],
		lightZonesStatus: "ready",
		selectedLightZoneId: null,
	});
});

function listen() {
	stop = subscribeLightZoneChanges("s1");
	const changes = db.handlers.find((item) => item.event === "*");
	const deletes = db.handlers.find((item) => item.event === "DELETE");
	if (!changes || !deletes) throw new Error("inscrição incompleta");
	return { changes, deletes };
}

describe("DELETE de área de luz sem filtro", () => {
	it("o ouvinte de DELETE não filtra por coluna; INSERT/UPDATE filtram a cena", () => {
		const { changes, deletes } = listen();
		expect(changes.table).toBe("vtt_light_zones");
		expect(changes.filter).toBe("scene_id=eq.s1");
		expect(deletes.table).toBe("vtt_light_zones");
		expect(deletes.filter).toBeUndefined();
	});

	it("id presente some da store e da seleção, sem recarregar", () => {
		const dark = zone("escura", "s1");
		const keep = zone("fica", "s1", "dim");
		useVTTStore.setState({
			lightZones: [dark, keep],
			selectedLightZoneId: "escura",
		});
		const { deletes } = listen();
		deletes.handler({
			eventType: "DELETE",
			old: { id: "escura", scene_id: "outra-campanha", level: "bright" },
		});
		const state = useVTTStore.getState();
		expect(state.lightZones).toEqual([keep]);
		expect(state.lightZones[0]).toBe(keep);
		expect(state.selectedLightZoneId).toBeNull();
		expect(state.lightZonesStatus).toBe("ready");
		expect(db.selects).toBe(0);
	});

	it("id desconhecido não muda a lista nem a seleção", () => {
		const dark = zone("escura", "s1");
		useVTTStore.setState({
			lightZones: [dark],
			selectedLightZoneId: "escura",
		});
		const before = useVTTStore.getState();
		const { deletes } = listen();
		deletes.handler({ eventType: "DELETE", old: { id: "nao-existe" } });
		expect(useVTTStore.getState().lightZones).toBe(before.lightZones);
		expect(useVTTStore.getState().selectedLightZoneId).toBe(
			before.selectedLightZoneId,
		);
		expect(db.selects).toBe(0);
	});

	it("id de outra cena não muda nada, mesmo que esteja na store", () => {
		const foreign = zone("de-la", "s2");
		const here = zone("aqui", "s1");
		useVTTStore.setState({
			lightZones: [foreign, here],
			selectedLightZoneId: "de-la",
		});
		const before = useVTTStore.getState();
		const { deletes } = listen();
		deletes.handler({ eventType: "DELETE", old: { id: "de-la" } });
		expect(useVTTStore.getState().lightZones).toBe(before.lightZones);
		expect(useVTTStore.getState().selectedLightZoneId).toBe("de-la");
	});

	it("payload sem id utilizável é ignorado", () => {
		const here = zone("aqui", "s1");
		useVTTStore.setState({ lightZones: [here] });
		const before = useVTTStore.getState().lightZones;
		const { deletes } = listen();
		deletes.handler({ eventType: "DELETE", old: { id: "" } });
		deletes.handler({ eventType: "DELETE", old: { id: 4 } });
		deletes.handler({ eventType: "DELETE", old: null });
		expect(useVTTStore.getState().lightZones).toBe(before);
	});

	it("INSERT e UPDATE continuam recarregando a cena, e o DELETE filtrado não", async () => {
		const here = zone("aqui", "s1");
		useVTTStore.setState({ lightZones: [here] });
		db.rows = [row("vinda-do-banco", "bright")];
		const { changes } = listen();
		changes.handler({
			eventType: "DELETE",
			old: { id: "aqui" },
			new: { id: "nao-entra" },
		});
		expect(useVTTStore.getState().lightZones).toEqual([here]);
		expect(db.selects).toBe(0);

		changes.handler({
			eventType: "INSERT",
			new: { id: "do-payload", level: "dark", secret: "x" },
		});
		await vi.waitFor(() =>
			expect(useVTTStore.getState().lightZones.map((item) => item.id)).toEqual([
				"vinda-do-banco",
			]),
		);
		expect(useVTTStore.getState().lightZones[0]?.level).toBe("bright");

		db.rows = [row("vinda-do-banco", "dim")];
		changes.handler({ eventType: "UPDATE", new: { level: "dark" } });
		await vi.waitFor(() =>
			expect(useVTTStore.getState().lightZones[0]?.level).toBe("dim"),
		);
		expect(db.selects).toBe(2);
	});

	it("ao voltar de uma queda, recarrega as áreas da cena", async () => {
		useVTTStore.setState({ lightZones: [zone("velha", "s1")] });
		db.rows = [row("nova")];
		listen();
		db.onStatus?.("SUBSCRIBED");
		await Promise.resolve();
		expect(db.selects).toBe(0);
		db.onStatus?.("TIMED_OUT");
		db.onStatus?.("SUBSCRIBED");
		await vi.waitFor(() =>
			expect(useVTTStore.getState().lightZones.map((item) => item.id)).toEqual([
				"nova",
			]),
		);
	});

	it("a lista pura ignora id desconhecido ou de outra cena", () => {
		const foreign = zone("de-la", "s2");
		const here = zone("aqui", "s1");
		const same = [foreign, here];
		expect(lightZonesAfterRemoteDelete(same, "s1", "de-la")).toBe(same);
		expect(lightZonesAfterRemoteDelete(same, "s1", "nao")).toBe(same);
		expect(lightZonesAfterRemoteDelete(same, "s1", "aqui")).toEqual([foreign]);
	});

	it("sem a área escura, o alcance de visão do lugar volta ao da luz do dia", () => {
		const dark = zone("escura", "s1");
		useVTTStore.setState({ lightZones: [dark] });
		const { deletes } = listen();
		expect(rangeOf(useVTTStore.getState().lightZones)).toBe(70);
		deletes.handler({ eventType: "DELETE", old: { id: "escura" } });
		expect(useVTTStore.getState().lightZones).toEqual([]);
		expect(rangeOf(useVTTStore.getState().lightZones)).toBe(420);
		expect(db.selects).toBe(0);
	});
});
