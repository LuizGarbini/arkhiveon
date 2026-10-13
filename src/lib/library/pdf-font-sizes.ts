/**
 * Biblioteca — tamanho da fonte dos campos de texto (AcroForm), por pessoa.
 *
 * O EmbedPDF não expõe tamanho de fonte, então reescrevemos o DA ("default
 * appearance", ex.: "/Helv 12 Tf 0 g") de cada campo com pdf-lib nos bytes,
 * ANTES de abrir no viewer. O pdfium então desenha e exporta já com o novo
 * tamanho. O PDF original no R2 não muda: os tamanhos ficam guardados junto
 * dos valores da pessoa (chave reservada em `field_values`).
 *
 * Tamanho 0 = automático (padrão AcroForm: a fonte se ajusta ao espaço).
 */
import {
	PDFBool,
	PDFDict,
	PDFDocument,
	PDFHexString,
	PDFName,
	PDFString,
	PDFTextField,
} from "pdf-lib";
import type { FormValues } from "./library-forms";

/** Chave reservada dentro de `field_values` (nenhum campo de PDF usa isso). */
export const FONT_SIZES_KEY = "__arkhiveon.fontSizes";
export const FONT_SIZE_AUTO = 0;
export const FONT_SIZE_MIN = 4;
export const FONT_SIZE_MAX = 72;
/** Opções da interface (0 = automático). */
export const FONT_SIZE_OPTIONS = [
	0, 6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24,
];

export interface FontSizes {
	/** Vale para todo campo de texto sem tamanho próprio. */
	all?: number;
	/** Tamanho por nome de campo (sobrepõe `all`). */
	fields: Record<string, number>;
}

export const EMPTY_FONT_SIZES: FontSizes = { fields: {} };

export function isValidFontSize(value: unknown): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		(value === FONT_SIZE_AUTO ||
			(value >= FONT_SIZE_MIN && value <= FONT_SIZE_MAX))
	);
}

export function hasFontSizes(sizes: FontSizes): boolean {
	return sizes.all !== undefined || Object.keys(sizes.fields).length > 0;
}

/** Lê o que veio do banco; descarta qualquer coisa estranha. */
export function parseFontSizes(raw: unknown): FontSizes {
	let data: unknown = raw;
	if (typeof raw === "string") {
		try {
			data = JSON.parse(raw);
		} catch {
			return { fields: {} };
		}
	}
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		return { fields: {} };
	}
	const obj = data as { all?: unknown; fields?: unknown };
	const out: FontSizes = { fields: {} };
	if (isValidFontSize(obj.all)) out.all = obj.all;
	if (
		obj.fields &&
		typeof obj.fields === "object" &&
		!Array.isArray(obj.fields)
	) {
		for (const [name, size] of Object.entries(obj.fields)) {
			if (name.length > 0 && name.length <= 300 && isValidFontSize(size)) {
				out.fields[name] = size;
			}
		}
	}
	return out;
}

/** Separa os valores dos campos dos tamanhos guardados na chave reservada. */
export function splitStoredValues(stored: FormValues): {
	values: FormValues;
	sizes: FontSizes;
} {
	const { [FONT_SIZES_KEY]: raw, ...values } = stored;
	return { values, sizes: parseFontSizes(raw) };
}

/** Junta valores + tamanhos para gravar numa linha só. */
export function mergeStoredValues(
	values: FormValues,
	sizes: FontSizes,
): FormValues {
	const { [FONT_SIZES_KEY]: _ignored, ...clean } = values;
	if (!hasFontSizes(sizes)) return clean;
	return { ...clean, [FONT_SIZES_KEY]: JSON.stringify(sizes) };
}

/** Tamanho efetivo de um campo (undefined = deixa o do PDF). */
export function fontSizeFor(
	sizes: FontSizes,
	fieldName: string,
): number | undefined {
	return sizes.fields[fieldName] ?? sizes.all;
}

const TF_RE = /(\/[^\s/()<>[\]{}%]+)\s+([-+]?(?:\d+\.?\d*|\.\d+))\s+Tf\b/;

function formatSize(size: number): string {
	return String(Math.round(size * 100) / 100);
}

/** Tamanho no DA (0 = automático); null se o DA não tem operador Tf. */
export function readDaFontSize(da: string): number | null {
	const match = TF_RE.exec(da);
	return match ? Number(match[2]) : null;
}

/** Troca só o tamanho do operador Tf do DA; mantém fonte e cor. */
export function setDaFontSize(da: string, size: number): string {
	const value = formatSize(size);
	if (TF_RE.test(da)) {
		return da.replace(TF_RE, (_match, font: string) => `${font} ${value} Tf`);
	}
	return `/Helv ${value} Tf ${da}`.trim();
}

function daOf(dict: PDFDict): string | undefined {
	const da = dict.lookup(PDFName.of("DA"));
	if (da instanceof PDFString || da instanceof PDFHexString) {
		return da.decodeText();
	}
	return undefined;
}

/** DA herdado: o próprio campo, os pais e por fim o do AcroForm. */
function inheritedDa(dict: PDFDict, acroForm: PDFDict): string {
	let node: PDFDict | undefined = dict;
	for (let depth = 0; node && depth < 32; depth++) {
		const da = daOf(node);
		if (da !== undefined) return da;
		const parent: unknown = node.lookup(PDFName.of("Parent"));
		node = parent instanceof PDFDict ? parent : undefined;
	}
	return daOf(acroForm) ?? "/Helv 0 Tf 0 g";
}

export interface TextFieldInfo {
	name: string;
	/** Tamanho que está no PDF original (0 = automático). */
	originalSize: number;
}

export interface PreparedPdf {
	buffer: ArrayBuffer;
	fields: TextFieldInfo[];
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

/**
 * Lista os campos de texto e aplica os tamanhos (se houver) nos bytes.
 * Só mexe no DA dos campos com tamanho escolhido e remove a aparência
 * pronta (/AP) só desses widgets, para o pdfium redesenhar com o novo
 * tamanho; borda/fundo (/MK), valores e demais campos ficam como estão.
 * Se o PDF não der pra ler com pdf-lib, devolve o original intacto.
 */
export async function preparePdfWithFontSizes(
	original: ArrayBuffer,
	sizes: FontSizes,
): Promise<PreparedPdf> {
	let doc: PDFDocument;
	try {
		doc = await PDFDocument.load(original.slice(0), {
			ignoreEncryption: true,
			updateMetadata: false,
		});
	} catch {
		return { buffer: original, fields: [] };
	}
	const form = doc.getForm();
	const acroForm = form.acroForm.dict;
	const fields: TextFieldInfo[] = [];
	let changed = false;
	for (const field of form.getFields()) {
		if (!(field instanceof PDFTextField)) continue;
		const name = field.getName();
		const dict = field.acroField.dict;
		const da = inheritedDa(dict, acroForm);
		fields.push({ name, originalSize: readDaFontSize(da) ?? 0 });
		const size = fontSizeFor(sizes, name);
		if (size === undefined) continue;
		dict.set(PDFName.of("DA"), PDFString.of(setDaFontSize(da, size)));
		for (const widget of field.acroField.getWidgets()) {
			const widgetDa = daOf(widget.dict);
			if (widgetDa !== undefined) {
				widget.dict.set(
					PDFName.of("DA"),
					PDFString.of(setDaFontSize(widgetDa, size)),
				);
			}
			widget.dict.delete(PDFName.of("AP"));
		}
		changed = true;
	}
	if (!changed) return { buffer: original, fields };
	// Pede ao leitor (pdfium e outros) para gerar as aparências que faltam.
	acroForm.set(PDFName.of("NeedAppearances"), PDFBool.True);
	const bytes = await doc.save({ updateFieldAppearances: false });
	return { buffer: toArrayBuffer(bytes), fields };
}

/** Lê de volta (testes/verificação): tamanho e valor de cada campo de texto. */
export async function readTextFields(
	buffer: ArrayBuffer,
): Promise<Record<string, { size: number | null; value: string }>> {
	const doc = await PDFDocument.load(buffer.slice(0), {
		ignoreEncryption: true,
		updateMetadata: false,
	});
	const form = doc.getForm();
	const out: Record<string, { size: number | null; value: string }> = {};
	for (const field of form.getFields()) {
		if (!(field instanceof PDFTextField)) continue;
		out[field.getName()] = {
			size: readDaFontSize(
				inheritedDa(field.acroField.dict, form.acroForm.dict),
			),
			value: field.getText() ?? "",
		};
	}
	return out;
}
