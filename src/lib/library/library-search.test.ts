import { describe, expect, it } from "vitest";
import {
	filterByTitle,
	libraryCountLabel,
	normalizeForSearch,
} from "./library-search";

const files = [
	{ id: "1", title: "Tiamat — Mapas de Batalha" },
	{ id: "2", title: "D&D 5E - Compêndio de Magia" },
	{ id: "3", title: "Bestiário de Faerûn" },
	{ id: "4", title: "Rise of Tiamat — Livro da Aventura" },
	{ id: "5", title: "Poções".normalize("NFD") },
];

describe("library-search", () => {
	it("ignora maiúscula e acento", () => {
		expect(normalizeForSearch("  CompÊndio   de ")).toBe("compendio de");
		expect(filterByTitle(files, "TIAMAT").map((f) => f.id)).toEqual(["1", "4"]);
		expect(filterByTitle(files, "compendio").map((f) => f.id)).toEqual(["2"]);
		expect(filterByTitle(files, "faerun").map((f) => f.id)).toEqual(["3"]);
		expect(filterByTitle(files, "bestiário").map((f) => f.id)).toEqual(["3"]);
		expect(filterByTitle(files, "pocoes").map((f) => f.id)).toEqual(["5"]);
	});

	it("busca vazia devolve tudo, sem resultado devolve vazio", () => {
		expect(filterByTitle(files, "   ")).toBe(files);
		expect(filterByTitle(files, "beholder")).toEqual([]);
	});

	it("contador N de M só com busca", () => {
		expect(libraryCountLabel(6, 6, "")).toBe("6");
		expect(libraryCountLabel(2, 6, "tiamat")).toBe("2 de 6");
		expect(libraryCountLabel(0, 6, "beholder")).toBe("0 de 6");
	});
});
