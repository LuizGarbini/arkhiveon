import { describe, expect, it } from "vitest";
import {
	clampBody,
	clampTitle,
	filterNotes,
	mapNoteRow,
	NOTE_BODY_MAX,
	NOTE_TITLE_MAX,
	newNote,
	noteSnippet,
	noteTitle,
	relativeTime,
	sortNotes,
	type VttNote,
} from "./notes";

const note = (over: Partial<VttNote> = {}): VttNote => ({
	id: "n",
	campaignId: "c",
	title: "",
	body: "",
	createdAt: "2026-11-14T10:00:00.000Z",
	updatedAt: "2026-11-14T10:00:00.000Z",
	...over,
});

describe("mapNoteRow", () => {
	it("lê uma linha válida", () => {
		expect(
			mapNoteRow({
				id: "1",
				campaign_id: "c",
				title: "T",
				body: "B",
				created_at: "a",
				updated_at: "b",
			}),
		).toEqual({
			id: "1",
			campaignId: "c",
			title: "T",
			body: "B",
			createdAt: "a",
			updatedAt: "b",
		});
	});

	it("título e texto ausentes viram vazio", () => {
		const n = mapNoteRow({
			id: "1",
			campaign_id: "c",
			title: null,
			created_at: "a",
			updated_at: "b",
		});
		expect(n).toMatchObject({ title: "", body: "" });
	});

	it.each([
		null,
		undefined,
		3,
		"x",
		{},
		{ id: "1" },
		{ id: 1, campaign_id: "c", created_at: "a", updated_at: "b" },
	])("rejeita %j", (row) => {
		expect(mapNoteRow(row)).toBeNull();
	});
});

describe("limites", () => {
	it("corta título e texto nos máximos do banco", () => {
		expect(clampTitle("x".repeat(NOTE_TITLE_MAX + 5))).toHaveLength(
			NOTE_TITLE_MAX,
		);
		expect(clampBody("x".repeat(NOTE_BODY_MAX + 5))).toHaveLength(
			NOTE_BODY_MAX,
		);
		expect(clampTitle("curto")).toBe("curto");
	});
});

describe("newNote", () => {
	it("nasce vazia, com o id e a campanha dados", () => {
		const n = newNote("c1", "id-1", new Date("2026-11-14T12:00:00Z"));
		expect(n).toEqual({
			id: "id-1",
			campaignId: "c1",
			title: "",
			body: "",
			createdAt: "2026-11-14T12:00:00.000Z",
			updatedAt: "2026-11-14T12:00:00.000Z",
		});
	});
});

describe("noteTitle e noteSnippet", () => {
	it("usa o título quando há", () => {
		expect(noteTitle(note({ title: "  Cripta  ", body: "x" }))).toBe("Cripta");
	});

	it("sem título, usa a primeira linha do texto", () => {
		expect(
			noteTitle(note({ body: "\n\n  Plano da sessão\nsegunda linha" })),
		).toBe("Plano da sessão");
	});

	it("linha longa vira título cortado", () => {
		const t = noteTitle(note({ body: "a".repeat(100) }));
		expect(t).toHaveLength(58);
		expect(t.endsWith("…")).toBe(true);
	});

	it("nota vazia tem um nome", () => {
		expect(noteTitle(note())).toBe("Nota sem título");
		expect(noteTitle(note({ title: "   ", body: "  \n " }))).toBe(
			"Nota sem título",
		);
	});

	it("a prévia não repete a linha usada como título", () => {
		expect(
			noteSnippet(
				note({ body: "Plano da sessão\nchefe no porão\nusar fumaça" }),
			),
		).toBe("chefe no porão usar fumaça");
	});

	it("com título, a prévia é o texto inteiro, sem quebras", () => {
		expect(noteSnippet(note({ title: "T", body: "linha 1\n\nlinha 2" }))).toBe(
			"linha 1 linha 2",
		);
	});

	it("prévia longa é cortada", () => {
		const s = noteSnippet(note({ title: "T", body: "b".repeat(200) }));
		expect(s).toHaveLength(88);
		expect(s.endsWith("…")).toBe(true);
	});
});

describe("sortNotes e filterNotes", () => {
	const a = note({ id: "a", title: "Alfa", updatedAt: "2026-11-14T10:00:00Z" });
	const b = note({
		id: "b",
		title: "Bruxo",
		body: "Maldição",
		updatedAt: "2026-11-14T12:00:00Z",
	});
	const c = note({
		id: "c",
		title: "Cripta",
		updatedAt: "2026-11-13T09:00:00Z",
	});

	it("ordena das mais recentes para as mais antigas, sem mutar", () => {
		const input = [a, b, c];
		expect(sortNotes(input).map((n) => n.id)).toEqual(["b", "a", "c"]);
		expect(input.map((n) => n.id)).toEqual(["a", "b", "c"]);
	});

	it("busca no título e no texto, sem acento nem maiúscula", () => {
		expect(filterNotes([a, b, c], "maldicao").map((n) => n.id)).toEqual(["b"]);
		expect(filterNotes([a, b, c], "CRIPTA").map((n) => n.id)).toEqual(["c"]);
		expect(filterNotes([a, b, c], "zzz")).toEqual([]);
	});

	it("busca vazia devolve tudo", () => {
		expect(filterNotes([a, b, c], "   ")).toHaveLength(3);
	});
});

describe("relativeTime", () => {
	const now = new Date("2026-11-14T12:00:00Z");
	it.each([
		["2026-11-14T11:59:30Z", "agora"],
		["2026-11-14T11:55:00Z", "há 5 min"],
		["2026-11-14T09:00:00Z", "há 3 h"],
		["2026-11-13T09:00:00Z", "ontem"],
		["2026-11-10T09:00:00Z", "há 4 dias"],
	])("%s → %s", (iso, expected) => {
		expect(relativeTime(iso, now)).toBe(expected);
	});

	it("semanas atrás mostra a data; data inválida não quebra", () => {
		expect(relativeTime("2026-10-01T09:00:00Z", now)).toMatch(/\d{2}/);
		expect(relativeTime("lixo", now)).toBe("");
	});
});
