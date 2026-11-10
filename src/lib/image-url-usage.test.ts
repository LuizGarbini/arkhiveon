import { describe, expect, it } from "vitest";
import { isImageUrlInUse, r2KeyFromPublicUrl } from "./image-url-usage";

const URL_A = "https://cdn.exemplo.com/u1/npcs/1760000000000-aaa.webp";

describe("a imagem ainda é usada por outra coisa?", () => {
	it("a própria linha da galeria não conta", () => {
		const state = { imageAssets: [{ id: "a1", url: URL_A }], characters: [] };
		expect(isImageUrlInUse(state, URL_A, "a1")).toBe(false);
	});

	it("outra imagem da galeria com a mesma URL segura o arquivo", () => {
		const state = {
			imageAssets: [
				{ id: "a1", url: URL_A },
				{ id: "a2", url: URL_A },
			],
		};
		expect(isImageUrlInUse(state, URL_A, "a1")).toBe(true);
	});

	it("ficha ou NPC que guarda a URL direto segura o arquivo", () => {
		const state = {
			imageAssets: [{ id: "a1", url: URL_A }],
			characters: [{ id: "c1", imageUrl: URL_A }],
		};
		expect(isImageUrlInUse(state, URL_A, "a1")).toBe(true);
		expect(
			isImageUrlInUse({ npcs: [{ id: "n1", imageUrl: URL_A }] }, URL_A, "a1"),
		).toBe(true);
	});

	it("URL diferente não segura nada, e funções e vazios são ignorados", () => {
		const state = {
			imageAssets: [{ id: "a1", url: URL_A }],
			characters: [
				{
					id: "c1",
					imageUrl: "https://cdn.exemplo.com/u1/npcs/1760000000001-bbb.webp",
				},
			],
			load: () => URL_A,
			nada: null,
			texto: URL_A,
		};
		expect(isImageUrlInUse(state, URL_A, "a1")).toBe(false);
		expect(isImageUrlInUse(state, "", "a1")).toBe(false);
	});

	it("estrutura que não vira JSON: na dúvida, o arquivo fica", () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;
		expect(isImageUrlInUse({ x: circular }, URL_A, "a1")).toBe(true);
	});
});

describe("chave do R2 pela URL pública", () => {
	const base = "https://cdn.exemplo.com";
	it("tira o endereço público e ignora parâmetros", () => {
		expect(r2KeyFromPublicUrl(URL_A, base)).toBe(
			"u1/npcs/1760000000000-aaa.webp",
		);
		expect(r2KeyFromPublicUrl(`${URL_A}?v=2`, `${base}/`)).toBe(
			"u1/npcs/1760000000000-aaa.webp",
		);
	});

	it("URL de outro lugar, data URL ou sem base não vira chave", () => {
		expect(r2KeyFromPublicUrl("https://outro.com/x.webp", base)).toBeNull();
		expect(r2KeyFromPublicUrl("data:image/png;base64,AAAA", base)).toBeNull();
		expect(r2KeyFromPublicUrl(URL_A, undefined)).toBeNull();
		expect(r2KeyFromPublicUrl(`${base}/`, base)).toBeNull();
	});
});
