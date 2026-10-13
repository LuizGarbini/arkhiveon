import { PDFDocument, PDFName, PDFString } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
	FONT_SIZES_KEY,
	fontSizeFor,
	mergeStoredValues,
	parseFontSizes,
	preparePdfWithFontSizes,
	readDaFontSize,
	readTextFields,
	setDaFontSize,
	splitStoredValues,
} from "./pdf-font-sizes";

async function makePdf(): Promise<ArrayBuffer> {
	const doc = await PDFDocument.create();
	const page = doc.addPage([400, 400]);
	const form = doc.getForm();
	const nome = form.createTextField("nome");
	nome.addToPage(page, {
		x: 20,
		y: 300,
		width: 200,
		height: 24,
		borderWidth: 1,
	});
	nome.setText("Elbereth");
	const classe = form.createTextField("classe");
	classe.addToPage(page, { x: 20, y: 250, width: 200, height: 24 });
	classe.acroField.dict.set(
		PDFName.of("DA"),
		PDFString.of("0.2 g /Helv 14 Tf"),
	);
	const notas = form.createTextField("notas");
	notas.addToPage(page, { x: 20, y: 150, width: 200, height: 60 });
	notas.acroField.dict.delete(PDFName.of("DA")); // herda do AcroForm
	form.createCheckBox("inspiracao").addToPage(page, { x: 250, y: 300 });
	const bytes = await doc.save();
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

describe("DA rewrite", () => {
	it("troca só o tamanho do Tf, mantendo fonte e cor", () => {
		expect(setDaFontSize("/Helv 0 Tf 0 g", 9)).toBe("/Helv 9 Tf 0 g");
		expect(setDaFontSize("0.2 0.1 0.4 rg /TiRo 12.5 Tf", 8)).toBe(
			"0.2 0.1 0.4 rg /TiRo 8 Tf",
		);
		expect(setDaFontSize("/F1#20Bold 24 Tf 1 g", 0)).toBe(
			"/F1#20Bold 0 Tf 1 g",
		);
		expect(setDaFontSize("/Helv .5 Tf", 10.25)).toBe("/Helv 10.25 Tf");
	});

	it("DA sem Tf ganha Helvetica com o tamanho", () => {
		expect(setDaFontSize("0 g", 9)).toBe("/Helv 9 Tf 0 g");
		expect(setDaFontSize("", 9)).toBe("/Helv 9 Tf");
	});

	it("lê o tamanho do DA", () => {
		expect(readDaFontSize("/Helv 0 Tf 0 g")).toBe(0);
		expect(readDaFontSize("0 g /Cour 11 Tf")).toBe(11);
		expect(readDaFontSize("0 g")).toBeNull();
	});
});

describe("tamanhos guardados", () => {
	it("separa e junta com a chave reservada", () => {
		const stored = mergeStoredValues(
			{ nome: "A" },
			{ all: 9, fields: { nome: 8 } },
		);
		expect(Object.keys(stored)).toEqual(["nome", FONT_SIZES_KEY]);
		expect(splitStoredValues(stored)).toEqual({
			values: { nome: "A" },
			sizes: { all: 9, fields: { nome: 8 } },
		});
		expect(mergeStoredValues({ nome: "A" }, { fields: {} })).toEqual({
			nome: "A",
		});
	});

	it("descarta tamanhos inválidos", () => {
		expect(
			parseFontSizes('{"all":2,"fields":{"a":10,"b":"9","c":500,"d":0}}'),
		).toEqual({
			fields: { a: 10, d: 0 },
		});
		expect(parseFontSizes("not json")).toEqual({ fields: {} });
		expect(parseFontSizes(undefined)).toEqual({ fields: {} });
	});

	it("campo sobrepõe o 'todos'", () => {
		const sizes = { all: 9, fields: { nome: 7 } };
		expect(fontSizeFor(sizes, "nome")).toBe(7);
		expect(fontSizeFor(sizes, "outro")).toBe(9);
		expect(fontSizeFor({ fields: {} }, "nome")).toBeUndefined();
	});
});

describe("preparePdfWithFontSizes", () => {
	it("sem tamanhos devolve o original e lista os campos de texto", async () => {
		const pdf = await makePdf();
		const out = await preparePdfWithFontSizes(pdf, { fields: {} });
		expect(out.buffer).toBe(pdf);
		expect(out.fields.map((f) => f.name)).toEqual(["nome", "classe", "notas"]);
		expect(out.fields.find((f) => f.name === "classe")?.originalSize).toBe(14);
	});

	it("aplica por campo e para todos, sem perder valores, borda nem checkbox", async () => {
		const pdf = await makePdf();
		const out = await preparePdfWithFontSizes(pdf, {
			all: 8,
			fields: { classe: 11 },
		});
		const read = await readTextFields(out.buffer);
		expect(read.nome).toEqual({ size: 8, value: "Elbereth" });
		expect(read.classe.size).toBe(11);
		expect(read.notas.size).toBe(8);

		const doc = await PDFDocument.load(out.buffer);
		const form = doc.getForm();
		// cor do DA preservada
		const classeDa = form
			.getTextField("classe")
			.acroField.dict.lookup(PDFName.of("DA"));
		expect((classeDa as PDFString).decodeText()).toBe("0.2 g /Helv 11 Tf");
		// borda (/MK) intacta, aparência removida pra ser regenerada
		const widget = form.getTextField("nome").acroField.getWidgets()[0];
		expect(widget.dict.has(PDFName.of("MK"))).toBe(true);
		expect(widget.dict.has(PDFName.of("AP"))).toBe(false);
		expect(
			form.acroForm.dict.get(PDFName.of("NeedAppearances"))?.toString(),
		).toBe("true");
		// checkbox não é tocado
		const box = form.getCheckBox("inspiracao").acroField.getWidgets()[0];
		expect(box.dict.has(PDFName.of("AP"))).toBe(true);
	});

	it("só o campo escolhido muda quando não há 'todos'", async () => {
		const pdf = await makePdf();
		const out = await preparePdfWithFontSizes(pdf, { fields: { nome: 6 } });
		const read = await readTextFields(out.buffer);
		expect(read.nome.size).toBe(6);
		expect(read.classe.size).toBe(14);
		const doc = await PDFDocument.load(out.buffer);
		const classe = doc
			.getForm()
			.getTextField("classe")
			.acroField.getWidgets()[0];
		expect(classe.dict.has(PDFName.of("AP"))).toBe(true);
	});

	it("PDF ilegível volta intacto", async () => {
		const junk = new TextEncoder().encode("não é pdf").buffer as ArrayBuffer;
		const out = await preparePdfWithFontSizes(junk, { all: 9, fields: {} });
		expect(out.buffer).toBe(junk);
		expect(out.fields).toEqual([]);
	});
});
