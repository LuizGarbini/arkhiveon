import { describe, expect, it } from "vitest";
import {
	classifyUploads,
	libraryMatchKey,
	needsUploadReview,
} from "./upload-dedupe";

const MB = 1024 * 1024;
const existing = [
	{ title: "Poções Mágicas", sizeBytes: 1000 },
	{ title: "Rise of Tiamat — Livro da Aventura", sizeBytes: 31876321 },
];
const f = (name: string, size: number) => ({ name, size });

describe("libraryMatchKey", () => {
	it("ignora NFD, acento quebrado, maiúscula e espaço nas pontas", () => {
		const nfc = libraryMatchKey("Poções Mágicas");
		expect(libraryMatchKey("Poc\u0327o\u0303es Ma\u0301gicas")).toBe(nfc);
		expect(libraryMatchKey("PoÃ§Ãµes MÃ¡gicas")).toBe(nfc);
		expect(libraryMatchKey("  POÇÕES MÁGICAS ")).toBe(nfc);
	});
});

describe("classifyUploads", () => {
	it("lista vazia: tudo é novo e segue direto", () => {
		const files = [f("A.pdf", 10), f("B.pdf", 20)];
		const review = classifyUploads(files, []);
		expect(review.fresh).toEqual(files);
		expect(review.duplicates).toEqual([]);
		expect(review.tooLarge).toEqual([]);
		expect(needsUploadReview(review)).toBe(false);
	});

	it("mesmo título (NFD, mojibake, maiúscula) e mesmo tamanho = duplicado", () => {
		const files = [
			f("Poc\u0327o\u0303es Ma\u0301gicas.pdf", 1000),
			f("PoÃ§Ãµes MÃ¡gicas.PDF", 1000),
			f("rise of tiamat — livro da aventura.pdf", 31876321),
		];
		const review = classifyUploads(files, existing);
		expect(review.duplicates).toEqual(files);
		expect(review.fresh).toEqual([]);
		expect(needsUploadReview(review)).toBe(true);
	});

	it("mesmo nome com tamanho diferente é novo", () => {
		const review = classifyUploads([f("Poções Mágicas.pdf", 1001)], existing);
		expect(review.fresh).toHaveLength(1);
		expect(review.duplicates).toHaveLength(0);
	});

	it("exatamente 200 MB passa; 1 byte a mais é grande demais", () => {
		const ok = f("Grande.pdf", 200 * MB);
		const big = f("Enorme.pdf", 200 * MB + 1);
		const review = classifyUploads([ok, big], []);
		expect(review.fresh).toEqual([ok]);
		expect(review.tooLarge).toEqual([big]);
		expect(needsUploadReview(review)).toBe(true);
	});

	it("grande demais ganha de duplicado", () => {
		const big = f("Enorme.pdf", 300 * MB);
		const review = classifyUploads(
			[big],
			[{ title: "Enorme", sizeBytes: 300 * MB }],
		);
		expect(review.tooLarge).toEqual([big]);
		expect(review.duplicates).toEqual([]);
	});

	it("arquivo repetido no mesmo lote: segunda cópia é duplicado", () => {
		const a = f("Mapa.pdf", 50);
		const b = f("MAPA.pdf", 50);
		const review = classifyUploads([a, b], []);
		expect(review.fresh).toEqual([a]);
		expect(review.duplicates).toEqual([b]);
	});
});
