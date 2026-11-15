import { describe, expect, it } from "vitest";
import { checkImageUpload } from "../../../supabase/functions/_shared/image-upload";
import {
	encodedImageFile,
	sniffImageType,
	UNSUPPORTED_ENCODED_IMAGE_MESSAGE,
} from "./encoded-image";

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
const WEBP = new Uint8Array([
	...ascii("RIFF"),
	1,
	0,
	0,
	0,
	...ascii("WEBP"),
	0,
]);
const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0,
]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const GIF = new Uint8Array([...ascii("GIF89a"), 0, 0]);

const bytesOf = async (file: File) => new Uint8Array(await file.arrayBuffer());

describe("sniffImageType · o tipo vem dos bytes", () => {
	it.each([
		["WebP", WEBP, "image/webp"],
		["PNG", PNG, "image/png"],
		["JPEG", JPEG, "image/jpeg"],
		["GIF", GIF, "image/gif"],
		["GIF87a", new Uint8Array([...ascii("GIF87a"), 0]), "image/gif"],
	])("%s", (_name, bytes, expected) => {
		expect(sniffImageType(bytes)).toBe(expected);
	});

	it("outra coisa, vazio ou curto demais: null", () => {
		expect(sniffImageType(new Uint8Array())).toBeNull();
		expect(sniffImageType(new Uint8Array([0x89, 0x50]))).toBeNull();
		expect(sniffImageType(new Uint8Array(ascii("%PDF-1.7 ......")))).toBeNull();
		expect(sniffImageType(new Uint8Array(ascii("<svg xmlns=...>")))).toBeNull();
		// RIFF que não é WebP (ex.: WAV)
		expect(
			sniffImageType(
				new Uint8Array([...ascii("RIFF"), 1, 0, 0, 0, ...ascii("WAVE")]),
			),
		).toBeNull();
	});
});

describe("encodedImageFile", () => {
	it("WebP (o normal): fica .webp com o tipo certo", async () => {
		const file = await encodedImageFile(
			new Blob([WEBP], { type: "image/webp" }),
			"foto.jpg",
		);
		expect(file.type).toBe("image/webp");
		expect(file.name).toBe("foto.webp");
	});

	it("navegador sem WebP devolve PNG: o arquivo declara PNG, não WebP", async () => {
		const file = await encodedImageFile(
			new Blob([PNG], { type: "image/png" }),
			"brasao.png",
		);
		expect(file.type).toBe("image/png");
		expect(file.name).toBe("brasao.png");
	});

	it("mesmo se o Blob vier com o tipo errado, vale o que os bytes dizem", async () => {
		const file = await encodedImageFile(
			new Blob([PNG], { type: "image/webp" }),
			"x.webp",
		);
		expect(file.type).toBe("image/png");
		expect(file.name).toBe("x.png");
		const jpg = await encodedImageFile(new Blob([JPEG]), "y.heic");
		expect(jpg.type).toBe("image/jpeg");
		expect(jpg.name).toBe("y.jpg");
	});

	it("só troca a última extensão e aguenta nome sem extensão ou vazio", async () => {
		expect((await encodedImageFile(new Blob([WEBP]), "a.b.c.png")).name).toBe(
			"a.b.c.webp",
		);
		expect((await encodedImageFile(new Blob([WEBP]), "semextensao")).name).toBe(
			"semextensao.webp",
		);
		expect((await encodedImageFile(new Blob([WEBP]), "")).name).toBe(
			"imagem.webp",
		);
		expect((await encodedImageFile(new Blob([WEBP]), ".png")).name).toBe(
			"imagem.webp",
		);
	});

	it("o conteúdo não é alterado", async () => {
		const file = await encodedImageFile(new Blob([PNG]), "a.png");
		expect(await bytesOf(file)).toEqual(PNG);
	});

	it("bytes que não são imagem aceita: erro claro, sem enviar lixo", async () => {
		await expect(
			encodedImageFile(
				new Blob([new Uint8Array(ascii("<html>nope</html>"))]),
				"a.png",
			),
		).rejects.toThrow(UNSUPPORTED_ENCODED_IMAGE_MESSAGE);
		await expect(encodedImageFile(new Blob([]), "a.png")).rejects.toThrow(
			UNSUPPORTED_ENCODED_IMAGE_MESSAGE,
		);
	});
});

describe("cliente e servidor concordam (a regressão do 415)", () => {
	it("o defeito antigo: PNG declarado como WebP é recusado pelo servidor", () => {
		const verdict = checkImageUpload("image/webp", PNG);
		expect(verdict.ok).toBe(false);
		expect(!verdict.ok && verdict.message).toBe(
			"O arquivo não é a imagem que o tipo informa.",
		);
	});

	it.each([
		["WebP", WEBP],
		["PNG", PNG],
		["JPEG", JPEG],
		["GIF", GIF],
	])(
		"o arquivo que o cliente monta para %s passa na checagem do servidor",
		async (_name, bytes) => {
			const file = await encodedImageFile(new Blob([bytes]), "a.webp");
			const verdict = checkImageUpload(file.type, await bytesOf(file));
			expect(verdict.ok).toBe(true);
		},
	);
});
