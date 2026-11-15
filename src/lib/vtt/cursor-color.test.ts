import { describe, expect, it } from "vitest";
import {
	CURSOR_COLOR_NAMES,
	CURSOR_PALETTE,
	colorToNumber,
	contrastRatio,
	hashUserId,
	mustYieldColor,
	normalizeCursorColor,
	pickCursorColor,
	readableTextColor,
} from "./cursor-color";
import {
	readChosenCursorColor,
	readShowRemoteCursors,
	writeChosenCursorColor,
	writeShowRemoteCursors,
} from "./cursor-prefs";

const uuid = (n: number) =>
	`${n.toString(16).padStart(8, "0")}-1111-4222-8333-${(n * 7919)
		.toString(16)
		.padStart(12, "0")}`;

describe("cor padrão do cursor", () => {
	it("é sempre a mesma para a mesma pessoa", () => {
		const id = uuid(42);
		expect(pickCursorColor(id)).toBe(pickCursorColor(id));
		expect(CURSOR_PALETTE).toContain(pickCursorColor(id));
	});

	it("pessoas diferentes não caem todas na mesma cor", () => {
		const colors = new Set(
			Array.from({ length: 40 }, (_, n) => pickCursorColor(uuid(n + 1))),
		);
		// Com a paleta de 12, 40 ids bem espalhados usam quase todas.
		expect(colors.size).toBeGreaterThanOrEqual(9);
		expect(hashUserId(uuid(1))).not.toBe(hashUserId(uuid(2)));
	});

	// O defeito original: a cor era sorteada sozinha em cada navegador, então
	// duas pessoas na mesa caíam na mesma cor. Entrando uma por vez e fugindo das
	// cores que já estão na mesa, ninguém repete enquanto a paleta dá conta.
	it("fugindo das cores que já estão na mesa, ninguém repete (até 12 pessoas)", () => {
		for (let seed = 0; seed < 25; seed++) {
			const taken: string[] = [];
			for (let n = 0; n < CURSOR_PALETTE.length; n++) {
				const color = pickCursorColor(uuid(seed * 100 + n + 1), taken);
				expect(taken).not.toContain(color);
				taken.push(color);
			}
			expect(new Set(taken).size).toBe(CURSOR_PALETTE.length);
		}
	});

	it("com a paleta toda ocupada, volta à cor do id (não quebra)", () => {
		const id = uuid(5);
		expect(CURSOR_PALETTE).toContain(pickCursorColor(id, [...CURSOR_PALETTE]));
	});

	it("ignora cor inválida entre as ocupadas", () => {
		const id = uuid(5);
		expect(pickCursorColor(id, ["vermelho", null, undefined, "#zzz"])).toBe(
			pickCursorColor(id),
		);
	});
});

describe("paleta", () => {
	it("toda cor tem nome e nenhuma se repete", () => {
		expect(new Set(CURSOR_PALETTE).size).toBe(CURSOR_PALETTE.length);
		for (const color of CURSOR_PALETTE) {
			expect(CURSOR_COLOR_NAMES[color]).toBeTruthy();
			expect(normalizeCursorColor(color)).toBe(color);
		}
	});
});

describe("desempate entre duas pessoas com a mesma cor", () => {
	const a = { userId: "a", color: "#38bdf8", onlineAt: 100 };
	const b = { userId: "b", color: "#38bdf8", onlineAt: 200 };

	it("quem entrou depois cede; quem entrou antes fica", () => {
		expect(mustYieldColor(b, [a])).toBe(true);
		expect(mustYieldColor(a, [b])).toBe(false);
	});

	it("entrando no mesmo instante, decide o id (só um cede)", () => {
		const c = { ...b, onlineAt: 100 };
		expect(mustYieldColor(c, [a])).toBe(true);
		expect(mustYieldColor(a, [c])).toBe(false);
	});

	it("cor diferente ou só a própria presença: ninguém cede", () => {
		expect(mustYieldColor(b, [{ ...a, color: "#ef4444" }])).toBe(false);
		expect(mustYieldColor(b, [b])).toBe(false);
		expect(mustYieldColor(b, [])).toBe(false);
	});

	it("quem escolheu à mão ganha, mesmo tendo entrado depois", () => {
		const escolheu = { ...b, chosen: true };
		expect(mustYieldColor(a, [escolheu])).toBe(true);
		expect(mustYieldColor(escolheu, [a])).toBe(false);
		// Duas escolhas iguais: ninguém cede (é decisão das pessoas).
		expect(mustYieldColor(escolheu, [{ ...a, chosen: true }])).toBe(false);
	});

	it("compara a cor sem se importar com maiúsculas", () => {
		expect(mustYieldColor(b, [{ ...a, color: "#38BDF8" }])).toBe(true);
	});
});

describe("cor que vem da rede nunca é confiada", () => {
	it("aceita só #rrggbb e normaliza para minúsculas", () => {
		expect(normalizeCursorColor("#38BDF8")).toBe("#38bdf8");
		expect(normalizeCursorColor("  #a855f7 ")).toBe("#a855f7");
	});

	it.each([
		"red",
		"#fff",
		"#12345",
		"#1234567",
		"38bdf8",
		"#gggggg",
		"url(javascript:alert(1))",
		'#38bdf8" onload="x',
		"#38bdf8; background:url(x)",
		"",
		null,
		undefined,
		42,
		{ color: "#38bdf8" },
	])("recusa %o", (value) => {
		expect(normalizeCursorColor(value)).toBeNull();
	});

	it("vira número para o Pixi, e inválida cai na cor padrão", () => {
		expect(colorToNumber("#38bdf8")).toBe(0x38bdf8);
		expect(colorToNumber("quebrada")).toBe(0x38bdf8);
	});
});

describe("texto legível sobre a cor", () => {
	it("tem contraste de pelo menos 4,5:1 em toda a paleta", () => {
		for (const color of CURSOR_PALETTE) {
			const text = readableTextColor(color);
			expect(contrastRatio(color, text)).toBeGreaterThanOrEqual(4.5);
		}
	});

	it("tem contraste em cores livres de todo tipo (cinza médio é o pior caso)", () => {
		for (let v = 0; v <= 255; v += 5) {
			for (const [r, g, b] of [
				[v, v, v],
				[v, 0, 0],
				[0, v, 0],
				[0, 0, v],
				[v, v, 0],
				[255 - v, v, 128],
			]) {
				const hex = `#${[r, g, b]
					.map((n) => n.toString(16).padStart(2, "0"))
					.join("")}`;
				expect(
					contrastRatio(hex, readableTextColor(hex)),
				).toBeGreaterThanOrEqual(4.5);
			}
		}
	});

	it("claro leva texto escuro e escuro leva texto claro", () => {
		expect(readableTextColor("#f59e0b")).toBe("#000000");
		expect(readableTextColor("#84cc16")).toBe("#000000");
		expect(readableTextColor("#2563eb")).toBe("#ffffff");
		expect(readableTextColor("#9333ea")).toBe("#ffffff");
	});
});

function memoryStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value),
		removeItem: (key: string) => void data.delete(key),
		data,
	};
}

describe("preferências guardadas no navegador", () => {
	it("a cor escolhida fica por conta e volta ao reabrir", () => {
		const storage = memoryStorage();
		writeChosenCursorColor("u1", "#EC4899", storage);
		expect(readChosenCursorColor("u1", storage)).toBe("#ec4899");
		expect(readChosenCursorColor("u2", storage)).toBeNull();
	});

	it("voltar ao automático apaga a escolha", () => {
		const storage = memoryStorage();
		writeChosenCursorColor("u1", "#ec4899", storage);
		writeChosenCursorColor("u1", null, storage);
		expect(readChosenCursorColor("u1", storage)).toBeNull();
	});

	it("valor adulterado no storage é ignorado", () => {
		const storage = memoryStorage({
			"arkhiveon:vtt:cursor-color:v1:u1": "javascript:alert(1)",
		});
		expect(readChosenCursorColor("u1", storage)).toBeNull();
		// Gravar valor inválido não grava lixo: limpa o que havia.
		writeChosenCursorColor("u1", "nao-e-cor", storage);
		expect(storage.data.has("arkhiveon:vtt:cursor-color:v1:u1")).toBe(false);
	});

	it("cursores dos outros aparecem por padrão e a escolha de ocultar persiste", () => {
		const storage = memoryStorage();
		expect(readShowRemoteCursors(storage)).toBe(true);
		writeShowRemoteCursors(false, storage);
		expect(readShowRemoteCursors(storage)).toBe(false);
		writeShowRemoteCursors(true, storage);
		expect(readShowRemoteCursors(storage)).toBe(true);
	});

	it("storage quebrado não derruba nada", () => {
		const broken = {
			getItem: () => {
				throw new Error("bloqueado");
			},
			setItem: () => {
				throw new Error("bloqueado");
			},
			removeItem: () => {
				throw new Error("bloqueado");
			},
		};
		expect(readChosenCursorColor("u1", broken)).toBeNull();
		expect(readShowRemoteCursors(broken)).toBe(true);
		expect(() => writeChosenCursorColor("u1", "#ec4899", broken)).not.toThrow();
		expect(() => writeShowRemoteCursors(false, broken)).not.toThrow();
	});
});
