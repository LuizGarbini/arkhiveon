// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import {
	normalizeVision,
	saveCharacterVision,
	visionDraftError,
} from "./character-vision";

const base = {
	id: "c1",
	system: "dnd5e",
	characterName: "Dante",
	visionDistance: 30,
	darkvisionDistance: 60,
} as unknown as Character;
const get = () => useRPGStore.getState().characters[0] as Character;

beforeEach(() => {
	useRPGStore.setState({ characters: [structuredClone(base)] });
});

describe("normalizeVision", () => {
	it("aceita número e texto com vírgula ou ponto, com uma casa decimal", () => {
		expect(normalizeVision(18)).toBe(18);
		expect(normalizeVision("18")).toBe(18);
		expect(normalizeVision("7,46")).toBe(7.5);
		expect(normalizeVision("7.44")).toBe(7.4);
	});

	it("vazio, zero, negativo, NaN, infinito e lixo viram 'sem valor'", () => {
		for (const bad of [
			"",
			"   ",
			"abc",
			0,
			"0",
			-3,
			"-3",
			Number.NaN,
			Number.POSITIVE_INFINITY,
			null,
			undefined,
		]) {
			expect(normalizeVision(bad), String(bad)).toBeUndefined();
		}
	});

	it("limita a 1000", () => {
		expect(normalizeVision(5000)).toBe(1000);
		expect(normalizeVision("1000.4")).toBe(1000);
	});
});

describe("saveCharacterVision", () => {
	it("muda a tela na hora e chama a função do banco com os dois valores", async () => {
		let resolve: (v: unknown) => void = () => {};
		const rpc = vi.fn(
			() =>
				new Promise((r) => {
					resolve = r;
				}),
		);
		const pending = saveCharacterVision({
			characterId: "c1",
			values: { visionDistance: 40, darkvisionDistance: 90 },
			rpc,
		});
		expect(get().visionDistance).toBe(40);
		expect(get().darkvisionDistance).toBe(90);
		expect(rpc).toHaveBeenCalledWith({
			p_character_id: "c1",
			p_vision: 40,
			p_darkvision: 90,
		});
		resolve({});
		expect(await pending).toEqual({ ok: true });
	});

	it("apagar um campo manda null e tira da ficha", async () => {
		const rpc = vi.fn(async () => ({}));
		await saveCharacterVision({
			characterId: "c1",
			values: { visionDistance: 30 },
			rpc,
		});
		expect(rpc).toHaveBeenCalledWith({
			p_character_id: "c1",
			p_vision: 30,
			p_darkvision: null,
		});
		expect(get().darkvisionDistance).toBeUndefined();
		expect(get().visionDistance).toBe(30);
	});

	it("valores inválidos viram 'sem valor' antes de ir ao banco", async () => {
		const rpc = vi.fn(async () => ({}));
		await saveCharacterVision({
			characterId: "c1",
			values: { visionDistance: -4, darkvisionDistance: 99999 },
			rpc,
		});
		expect(rpc).toHaveBeenCalledWith({
			p_character_id: "c1",
			p_vision: null,
			p_darkvision: 1000,
		});
	});

	it("nada mudou: não chama o banco", async () => {
		const rpc = vi.fn(async () => ({}));
		const result = await saveCharacterVision({
			characterId: "c1",
			values: { visionDistance: 30, darkvisionDistance: 60 },
			rpc,
		});
		expect(result).toEqual({ ok: true });
		expect(rpc).not.toHaveBeenCalled();
	});

	it("falha: volta ao que estava e explica", async () => {
		const rpc = vi.fn(async () => {
			throw {
				code: "42501",
				message: "Você não pode mudar a visão desta ficha.",
			};
		});
		const result = await saveCharacterVision({
			characterId: "c1",
			values: { visionDistance: 5 },
			rpc,
		});
		expect(result.ok).toBe(false);
		expect(!result.ok && result.reason).toBe("forbidden");
		expect(!result.ok && result.message).toMatch(/visão desta ficha/);
		expect(get().visionDistance).toBe(30);
		expect(get().darkvisionDistance).toBe(60);
	});

	it("sem conexão e função ausente têm mensagens próprias", async () => {
		const offline = await saveCharacterVision({
			characterId: "c1",
			values: { visionDistance: 5 },
			rpc: async () => {
				throw { code: "offline" };
			},
		});
		expect(!offline.ok && offline.reason).toBe("offline");
		const missing = await saveCharacterVision({
			characterId: "c1",
			values: { visionDistance: 6 },
			rpc: async () => {
				throw { code: "PGRST202" };
			},
		});
		expect(!missing.ok && missing.reason).toBe("unavailable");
	});

	it("não desfaz se outra edição mexeu na visão nesse meio tempo", async () => {
		const rpc = vi.fn(async () => {
			useRPGStore.setState((s) => ({
				characters: s.characters.map((c) => ({
					...c,
					visionDistance: 77,
					darkvisionDistance: 88,
				})),
			}));
			throw new Error("falhou");
		});
		await saveCharacterVision({
			characterId: "c1",
			values: { visionDistance: 5 },
			rpc,
		});
		expect(get().visionDistance).toBe(77);
		expect(get().darkvisionDistance).toBe(88);
	});

	it("ficha que não existe", async () => {
		const result = await saveCharacterVision({
			characterId: "nope",
			values: { visionDistance: 5 },
			rpc: vi.fn(),
		});
		expect(result.ok).toBe(false);
	});
});

describe("visionDraftError", () => {
	it("vazio e números válidos passam", () => {
		for (const ok of ["", "  ", "1", "18", "7,5", "7.5", "1000"]) {
			expect(visionDraftError(ok), ok).toBeNull();
		}
	});

	it("zero, negativo, texto e infinito pedem um número maior que 0", () => {
		for (const bad of ["0", "-3", "abc", "1e999", "--"]) {
			expect(visionDraftError(bad), bad).toBe("Use um número maior que 0.");
		}
	});

	it("acima de 1000 avisa o máximo", () => {
		expect(visionDraftError("1000.1")).toBe("O máximo é 1000.");
		expect(visionDraftError("99999")).toBe("O máximo é 1000.");
	});
});
