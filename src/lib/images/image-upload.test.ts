import { describe, expect, it } from "vitest";
import {
	bytesMatchImageType,
	canDeleteImage,
	checkImageUpload,
	imageExtensionForType,
	parseDeleteRequest,
	storageUsedAfterDelete,
} from "../../../supabase/functions/_shared/image-upload";

const OWNER = "00000000-0000-4000-8000-0000000000a1";
const KEY = `${OWNER}/npcs/1760000000000-11111111-1111-4111-8111-111111111111.webp`;
const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

const WEBP = new Uint8Array([...ascii("RIFF"), 1, 0, 0, 0, ...ascii("WEBP")]);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0);
const GIF = new Uint8Array(ascii("GIF89a\0\0"));

describe("tipos de imagem aceitos", () => {
	it("aceita só WebP, PNG, JPEG e GIF, ignorando maiúscula e parâmetros", () => {
		expect(imageExtensionForType("image/webp")).toBe("webp");
		expect(imageExtensionForType("IMAGE/PNG")).toBe("png");
		expect(imageExtensionForType("image/jpeg; charset=binary")).toBe("jpg");
		expect(imageExtensionForType("image/gif")).toBe("gif");
	});

	it("recusa HTML, SVG, PDF e o que não for texto", () => {
		for (const type of [
			"text/html",
			"image/svg+xml",
			"application/pdf",
			"application/octet-stream",
			"",
		])
			expect(imageExtensionForType(type)).toBeNull();
		expect(imageExtensionForType(undefined)).toBeNull();
		expect(imageExtensionForType(42)).toBeNull();
	});
});

describe("conteúdo bate com o tipo declarado", () => {
	it("reconhece o começo de cada formato", () => {
		expect(bytesMatchImageType("image/webp", WEBP)).toBe(true);
		expect(bytesMatchImageType("image/png", PNG)).toBe(true);
		expect(bytesMatchImageType("image/jpeg", JPEG)).toBe(true);
		expect(bytesMatchImageType("image/gif", GIF)).toBe(true);
	});

	it("recusa página HTML disfarçada de imagem", () => {
		const html = new Uint8Array(ascii("<html><script>alert(1)</script>"));
		for (const type of ["image/webp", "image/png", "image/jpeg", "image/gif"])
			expect(bytesMatchImageType(type, html)).toBe(false);
	});

	it("recusa arquivo curto demais e tipo trocado", () => {
		expect(bytesMatchImageType("image/png", bytes(0x89, 0x50))).toBe(false);
		expect(bytesMatchImageType("image/webp", PNG)).toBe(false);
		expect(bytesMatchImageType("image/gif", new Uint8Array())).toBe(false);
	});

	it("checkImageUpload junta as duas regras", () => {
		expect(checkImageUpload("image/webp", WEBP)).toEqual({
			ok: true,
			extension: "webp",
		});
		expect(checkImageUpload("text/html", WEBP)).toMatchObject({ ok: false });
		expect(checkImageUpload("image/png", WEBP)).toMatchObject({ ok: false });
	});
});

describe("exclusão", () => {
	it("só entende a chave no formato do upload", () => {
		expect(parseDeleteRequest({ key: KEY })).toEqual({
			key: KEY,
			ownerId: OWNER,
		});
		for (const body of [
			null,
			{},
			{ key: "../outra/pasta.png" },
			{ key: `${OWNER}/../x.png` },
			{ key: `${OWNER}/arquivo.html` },
			{ key: 42 },
		])
			expect(parseDeleteRequest(body)).toBeNull();
	});

	it("o dono da pasta ou a equipe da campanha dele pode apagar; os outros não", () => {
		expect(
			canDeleteImage({ userId: OWNER, ownerId: OWNER, isStaffOfOwner: false }),
		).toBe(true);
		expect(
			canDeleteImage({ userId: "co", ownerId: OWNER, isStaffOfOwner: true }),
		).toBe(true);
		expect(
			canDeleteImage({
				userId: "jogador",
				ownerId: OWNER,
				isStaffOfOwner: false,
			}),
		).toBe(false);
	});

	it("a cota diminui pelo tamanho real e nunca fica negativa", () => {
		expect(storageUsedAfterDelete(1000, 400)).toBe(600);
		expect(storageUsedAfterDelete(300, 400)).toBe(0);
		expect(storageUsedAfterDelete(1000, -5)).toBe(1000);
		expect(storageUsedAfterDelete(Number.NaN, 10)).toBe(0);
	});
});
