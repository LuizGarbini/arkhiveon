import { beforeEach, describe, expect, it, vi } from "vitest";

type Answer = {
	data?: unknown;
	error?: { code?: string; message?: string } | null;
};

const mock = vi.hoisted(() => ({
	table: "" as string,
	selectAnswer: (): Promise<Answer> =>
		Promise.resolve({ data: [], error: null }),
	insert: vi.fn(
		(_row: unknown): Promise<Answer> => Promise.resolve({ error: null }),
	),
	del: vi.fn(
		(_col: string, _val: string): Promise<Answer> =>
			Promise.resolve({ error: null }),
	),
	upd: vi.fn(
		(_patch: unknown, _col: string, _val: string): Promise<Answer> =>
			Promise.resolve({ error: null }),
	),
	toast: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: (table: string) => {
			mock.table = table;
			return {
				select: () => ({ eq: () => ({ order: () => mock.selectAnswer() }) }),
				insert: (row: unknown) => mock.insert(row),
				delete: () => ({ eq: (c: string, v: string) => mock.del(c, v) }),
				update: (patch: unknown) => ({
					eq: (c: string, v: string) => mock.upd(patch, c, v),
				}),
			};
		},
	}),
}));
vi.mock("@/components/ui/toast", () => ({ showToast: mock.toast }));

import {
	createLightZone,
	deleteLightZone,
	finishLightDraft,
	handleLightKey,
	isMissingLightZonesTable,
	loadLightZones,
	setLightZoneLevel,
} from "./light-zone-sync";
import type { VTTLightZone } from "./light-zones";
import { useVTTStore } from "./vtt-store";

const circle = { shape: "circle" as const, x: 100, y: 100, radius: 50 };
const zoneA: VTTLightZone = {
	id: "a",
	sceneId: "s1",
	level: "dark",
	...circle,
};
const zoneB: VTTLightZone = {
	id: "b",
	sceneId: "s1",
	level: "dim",
	shape: "rect",
	x: 0,
	y: 0,
	width: 80,
	height: 80,
};
const row = (z: VTTLightZone) => ({
	id: z.id,
	scene_id: z.sceneId,
	shape: z.shape,
	level: z.level,
	geometry:
		z.shape === "circle"
			? { x: z.x, y: z.y, radius: z.radius }
			: z.shape === "rect"
				? { x: z.x, y: z.y, width: z.width, height: z.height }
				: { points: z.points },
});
const zones = () => useVTTStore.getState().lightZones;

beforeEach(() => {
	vi.clearAllMocks();
	mock.selectAnswer = () => Promise.resolve({ data: [], error: null });
	mock.insert.mockImplementation(() => Promise.resolve({ error: null }));
	mock.del.mockImplementation(() => Promise.resolve({ error: null }));
	mock.upd.mockImplementation(() => Promise.resolve({ error: null }));
	useVTTStore.setState({
		activeSceneId: "s1",
		lightZones: [],
		lightZonesStatus: "idle",
		selectedLightZoneId: null,
	});
});

describe("loadLightZones", () => {
	it("carrega as áreas da cena e marca pronto", async () => {
		mock.selectAnswer = () =>
			Promise.resolve({ data: [row(zoneA), row(zoneB)], error: null });
		await loadLightZones("s1");
		expect(zones().map((z) => z.id)).toEqual(["a", "b"]);
		expect(useVTTStore.getState().lightZonesStatus).toBe("ready");
	});

	it("linha inválida é descartada sem derrubar as outras", async () => {
		mock.selectAnswer = () =>
			Promise.resolve({
				data: [
					row(zoneA),
					{
						id: "x",
						scene_id: "s1",
						shape: "circle",
						level: "dark",
						geometry: { x: 1 },
					},
				],
				error: null,
			});
		await loadLightZones("s1");
		expect(zones().map((z) => z.id)).toEqual(["a"]);
	});

	it("resposta de uma cena que já não é a ativa é ignorada", async () => {
		let answer!: (v: Answer) => void;
		mock.selectAnswer = () =>
			new Promise<Answer>((r) => {
				answer = r;
			});
		const pending = loadLightZones("s1");
		useVTTStore.setState({ activeSceneId: "s2" });
		answer({ data: [row(zoneA)], error: null });
		await pending;
		expect(zones()).toEqual([]);
	});

	it("de duas cargas, só vale a mais nova (a antiga chega depois e não sobrescreve)", async () => {
		let first!: (v: Answer) => void;
		mock.selectAnswer = () =>
			new Promise<Answer>((r) => {
				first = r;
			});
		const slow = loadLightZones("s1");
		mock.selectAnswer = () =>
			Promise.resolve({ data: [row(zoneB)], error: null });
		await loadLightZones("s1");
		first({ data: [row(zoneA)], error: null });
		await slow;
		expect(zones().map((z) => z.id)).toEqual(["b"]);
	});

	it("tabela inexistente: status missing, sem áreas", async () => {
		mock.selectAnswer = () =>
			Promise.resolve({ data: null, error: { code: "42P01" } });
		await loadLightZones("s1");
		expect(useVTTStore.getState().lightZonesStatus).toBe("missing");
		expect(zones()).toEqual([]);
	});

	it("outro erro: status error", async () => {
		mock.selectAnswer = () =>
			Promise.resolve({ data: null, error: { code: "XX000" } });
		await loadLightZones("s1");
		expect(useVTTStore.getState().lightZonesStatus).toBe("error");
	});

	it("uma recarga no meio da gravação não apaga a área recém-criada", async () => {
		let saved!: (v: Answer) => void;
		mock.insert.mockImplementation(
			() =>
				new Promise<Answer>((r) => {
					saved = r;
				}),
		);
		const creating = createLightZone(circle, "dark");
		expect(zones()).toHaveLength(1); // otimista
		mock.selectAnswer = () => Promise.resolve({ data: [], error: null }); // o banco ainda não tem
		await loadLightZones("s1");
		expect(zones()).toHaveLength(1);
		saved({ error: null });
		await creating;
		expect(zones()).toHaveLength(1);
	});

	it("uma recarga no meio da exclusão não traz a área de volta", async () => {
		useVTTStore.setState({ lightZones: [zoneA, zoneB] });
		let removed!: (v: Answer) => void;
		mock.del.mockImplementation(
			() =>
				new Promise<Answer>((r) => {
					removed = r;
				}),
		);
		const deleting = deleteLightZone("a");
		mock.selectAnswer = () =>
			Promise.resolve({ data: [row(zoneA), row(zoneB)], error: null }); // ainda lá
		await loadLightZones("s1");
		expect(zones().map((z) => z.id)).toEqual(["b"]);
		removed({ error: null });
		await deleting;
		expect(zones().map((z) => z.id)).toEqual(["b"]);
	});
});

describe("createLightZone", () => {
	it("aparece na hora e grava com a forma, a luz e a geometria certas", async () => {
		const id = await createLightZone(circle, "dim");
		expect(id).toBeTruthy();
		expect(zones()).toHaveLength(1);
		expect(zones()[0]).toMatchObject({
			id,
			sceneId: "s1",
			level: "dim",
			shape: "circle",
			radius: 50,
		});
		expect(mock.table).toBe("vtt_light_zones");
		expect(mock.insert).toHaveBeenCalledWith({
			id,
			scene_id: "s1",
			shape: "circle",
			level: "dim",
			geometry: { x: 100, y: 100, radius: 50 },
		});
	});

	it("falha do banco: some da mesa e avisa", async () => {
		mock.insert.mockImplementation(() =>
			Promise.resolve({ error: { code: "42501" } }),
		);
		expect(await createLightZone(circle, "dark")).toBeNull();
		expect(zones()).toEqual([]);
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({
				title: "Não foi possível salvar a área de luz",
			}),
		);
	});

	it("exceção de rede também reverte", async () => {
		mock.insert.mockImplementation(() => Promise.reject(new Error("offline")));
		expect(await createLightZone(circle, "dark")).toBeNull();
		expect(zones()).toEqual([]);
		expect(mock.toast).toHaveBeenCalled();
	});

	it("sem cena ativa: nada", async () => {
		useVTTStore.setState({ activeSceneId: null });
		expect(await createLightZone(circle, "dark")).toBeNull();
		expect(mock.insert).not.toHaveBeenCalled();
	});

	it("passou de 200 áreas: recusa e explica, sem chamar o banco", async () => {
		useVTTStore.setState({
			lightZones: Array.from({ length: 200 }, (_, i) => ({
				...zoneA,
				id: `z${i}`,
			})),
		});
		expect(await createLightZone(circle, "dark")).toBeNull();
		expect(mock.insert).not.toHaveBeenCalled();
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({ title: "Limite de áreas de luz" }),
		);
		expect(zones()).toHaveLength(200);
	});

	it("cada criação tem id próprio (não repete)", async () => {
		const a = await createLightZone(circle, "dark");
		const b = await createLightZone(circle, "dark");
		expect(a).not.toBe(b);
		expect(zones()).toHaveLength(2);
	});
});

describe("deleteLightZone", () => {
	it("some na hora e apaga no banco pelo id", async () => {
		useVTTStore.setState({
			lightZones: [zoneA, zoneB],
			selectedLightZoneId: "a",
		});
		expect(await deleteLightZone("a")).toBe(true);
		expect(zones().map((z) => z.id)).toEqual(["b"]);
		expect(mock.del).toHaveBeenCalledWith("id", "a");
		expect(useVTTStore.getState().selectedLightZoneId).toBeNull();
	});

	it("falha: a área volta ao MESMO lugar da ordem (a ordem decide qual luz vale) e selecionada", async () => {
		const c: VTTLightZone = { ...zoneA, id: "c" };
		useVTTStore.setState({ lightZones: [zoneA, zoneB, c] });
		mock.del.mockImplementation(() =>
			Promise.resolve({ error: { code: "42501" } }),
		);
		expect(await deleteLightZone("b")).toBe(false);
		expect(zones().map((z) => z.id)).toEqual(["a", "b", "c"]);
		expect(useVTTStore.getState().selectedLightZoneId).toBe("b");
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({
				title: "Não foi possível apagar a área de luz",
			}),
		);
	});

	it("id que não existe: false, sem chamar o banco", async () => {
		expect(await deleteLightZone("nada")).toBe(false);
		expect(mock.del).not.toHaveBeenCalled();
	});
});

describe("setLightZoneLevel", () => {
	it("troca na hora e grava só a luz", async () => {
		useVTTStore.setState({ lightZones: [zoneA] });
		expect(await setLightZoneLevel("a", "bright")).toBe(true);
		expect(zones()[0]?.level).toBe("bright");
		expect(mock.upd).toHaveBeenCalledWith({ level: "bright" }, "id", "a");
	});

	it("falha: volta à luz anterior e avisa", async () => {
		useVTTStore.setState({ lightZones: [zoneA] });
		mock.upd.mockImplementation(() =>
			Promise.resolve({ error: { code: "42501" } }),
		);
		expect(await setLightZoneLevel("a", "bright")).toBe(false);
		expect(zones()[0]?.level).toBe("dark");
		expect(mock.toast).toHaveBeenCalled();
	});

	it("mesma luz: não chama o banco", async () => {
		useVTTStore.setState({ lightZones: [zoneA] });
		expect(await setLightZoneLevel("a", "dark")).toBe(true);
		expect(mock.upd).not.toHaveBeenCalled();
	});
});

describe("isMissingLightZonesTable", () => {
	it("reconhece tabela inexistente pelo código ou pela mensagem", () => {
		expect(isMissingLightZonesTable({ code: "42P01" })).toBe(true);
		expect(isMissingLightZonesTable({ code: "PGRST205" })).toBe(true);
		expect(
			isMissingLightZonesTable({
				message: 'relation "vtt_light_zones" does not exist',
			}),
		).toBe(true);
		expect(isMissingLightZonesTable({ code: "42501" })).toBe(false);
		expect(isMissingLightZonesTable(null)).toBe(false);
	});
});

// O tratador só lê `key` e os modificadores; não precisa de um KeyboardEvent real.
const key = (
	k: string,
	extra: { ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {},
) =>
	({
		key: k,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		...extra,
	}) as KeyboardEvent;
const tri = [
	{ x: 0, y: 0 },
	{ x: 100, y: 0 },
	{ x: 0, y: 100 },
];

describe("finishLightDraft · fechar o polígono", () => {
	beforeEach(() => {
		useVTTStore.setState({
			isGM: true,
			activeTool: "light",
			lightDrawLevel: "dim",
			lightDraft: [],
		});
	});

	it("3 pontos com área: cria a área com a luz escolhida, limpa o rascunho e seleciona", async () => {
		useVTTStore.setState({ lightDraft: tri });
		expect(await finishLightDraft()).toBe(true);
		expect(zones()).toHaveLength(1);
		expect(zones()[0]).toMatchObject({ shape: "polygon", level: "dim" });
		expect(useVTTStore.getState().lightDraft).toEqual([]);
		expect(useVTTStore.getState().selectedLightZoneId).toBe(zones()[0]?.id);
		expect(mock.insert).toHaveBeenCalledTimes(1);
	});

	it("sem rascunho: não faz nada", async () => {
		expect(await finishLightDraft()).toBe(false);
		expect(mock.insert).not.toHaveBeenCalled();
	});

	it("pontos demais de menos ou em linha reta: descarta, explica e não grava", async () => {
		useVTTStore.setState({
			lightDraft: [
				{ x: 0, y: 0 },
				{ x: 50, y: 50 },
				{ x: 100, y: 100 },
			],
		});
		expect(await finishLightDraft()).toBe(false);
		expect(useVTTStore.getState().lightDraft).toEqual([]);
		expect(zones()).toEqual([]);
		expect(mock.insert).not.toHaveBeenCalled();
		expect(mock.toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({ title: expect.stringContaining("3 pontos") }),
		);
	});

	it("falha do banco: some e o rascunho não volta", async () => {
		mock.insert.mockImplementation(() =>
			Promise.resolve({ error: { code: "42501" } }),
		);
		useVTTStore.setState({ lightDraft: tri });
		expect(await finishLightDraft()).toBe(false);
		expect(zones()).toEqual([]);
		expect(useVTTStore.getState().selectedLightZoneId).toBeNull();
	});
});

describe("handleLightKey · teclado da ferramenta Luz", () => {
	beforeEach(() => {
		useVTTStore.setState({
			isGM: true,
			activeTool: "light",
			lightDraft: [],
			selectedLightZoneId: null,
			lightZones: [{ ...zoneA }],
		});
	});

	it("só para o mestre e só com a ferramenta Luz", () => {
		useVTTStore.setState({ isGM: false, selectedLightZoneId: "a" });
		expect(handleLightKey(key("Delete"))).toBe(false);
		useVTTStore.setState({ isGM: true, activeTool: "wall" });
		expect(handleLightKey(key("Delete"))).toBe(false);
		expect(zones()).toHaveLength(1);
	});

	it("Ctrl/⌘/Alt não são tratadas (ficam para os atalhos globais)", () => {
		useVTTStore.setState({ selectedLightZoneId: "a" });
		expect(handleLightKey(key("Delete", { ctrlKey: true }))).toBe(false);
		expect(handleLightKey(key("Backspace", { metaKey: true }))).toBe(false);
		expect(handleLightKey(key("Delete", { altKey: true }))).toBe(false);
	});

	it("Delete apaga a área selecionada", async () => {
		useVTTStore.setState({ selectedLightZoneId: "a" });
		expect(handleLightKey(key("Delete"))).toBe(true);
		await vi.waitFor(() => expect(zones()).toEqual([]));
		expect(mock.del).toHaveBeenCalledWith("id", "a");
	});

	it("Backspace sem desenho também apaga a selecionada", async () => {
		useVTTStore.setState({ selectedLightZoneId: "a" });
		expect(handleLightKey(key("Backspace"))).toBe(true);
		await vi.waitFor(() => expect(zones()).toEqual([]));
	});

	it("Backspace desenhando tira só o último ponto (e não apaga a selecionada)", () => {
		useVTTStore.setState({ lightDraft: tri, selectedLightZoneId: "a" });
		expect(handleLightKey(key("Backspace"))).toBe(true);
		expect(useVTTStore.getState().lightDraft).toEqual(tri.slice(0, 2));
		expect(zones()).toHaveLength(1);
		expect(mock.del).not.toHaveBeenCalled();
	});

	it("Enter fecha o polígono; sem desenho, Enter não é tratado", async () => {
		expect(handleLightKey(key("Enter"))).toBe(false);
		useVTTStore.setState({ lightDraft: tri, lightDrawLevel: "dark" });
		expect(handleLightKey(key("Enter"))).toBe(true);
		await vi.waitFor(() => expect(zones()).toHaveLength(2));
	});

	it("Esc: cancela o desenho; sem desenho tira a seleção; sem nada não é tratado", () => {
		useVTTStore.setState({ lightDraft: tri, selectedLightZoneId: "a" });
		expect(handleLightKey(key("Escape"))).toBe(true);
		expect(useVTTStore.getState().lightDraft).toEqual([]);
		expect(useVTTStore.getState().selectedLightZoneId).toBe("a"); // 1º Esc só cancela o desenho
		expect(handleLightKey(key("Escape"))).toBe(true);
		expect(useVTTStore.getState().selectedLightZoneId).toBeNull();
		expect(handleLightKey(key("Escape"))).toBe(false);
		expect(zones()).toHaveLength(1); // Esc nunca apaga nada
	});

	it("Delete sem seleção não faz nada", () => {
		expect(handleLightKey(key("Delete"))).toBe(false);
		expect(mock.del).not.toHaveBeenCalled();
	});

	it("outras teclas não são tratadas", () => {
		useVTTStore.setState({ selectedLightZoneId: "a", lightDraft: tri });
		expect(handleLightKey(key("a"))).toBe(false);
		expect(handleLightKey(key("ArrowLeft"))).toBe(false);
	});
});
