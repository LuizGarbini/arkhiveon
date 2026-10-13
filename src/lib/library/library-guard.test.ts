import { describe, expect, it } from "vitest";
import {
	buildLibraryKey,
	canManageLibrary,
	canReadLibrary,
	checkUploadedObject,
	hasPdfMagic,
	isStalePending,
	LIBRARY_MAX_BYTES,
	LIBRARY_READ_TTL_SECONDS,
	parseAllowedOrigins,
	resolveCorsOrigin,
	resolveReadTtl,
	validateUploadRequest,
} from "../../../supabase/functions/_shared/library-guard";

const pdfHead = new TextEncoder().encode("%PDF-");

describe("library-guard", () => {
	it("papéis: mestre/editor gerenciam, todo membro lê", () => {
		expect(canManageLibrary("owner")).toBe(true);
		expect(canManageLibrary("editor")).toBe(true);
		expect(canManageLibrary("viewer")).toBe(false);
		expect(canManageLibrary(null)).toBe(false);
		expect(canReadLibrary("viewer")).toBe(true);
		expect(canReadLibrary(null)).toBe(false);
	});

	it("valida tipo, tamanho e título do upload", () => {
		expect(
			validateUploadRequest({
				title: "Livro",
				size: 10,
				contentType: "image/png",
			}),
		).toMatchObject({ ok: false, status: 415 });
		expect(
			validateUploadRequest({
				title: "Livro",
				size: LIBRARY_MAX_BYTES + 1,
				contentType: "application/pdf",
			}),
		).toMatchObject({ ok: false, status: 413 });
		expect(
			validateUploadRequest({
				title: "Livro",
				size: 0,
				contentType: "application/pdf",
			}),
		).toMatchObject({ ok: false, status: 400 });
		expect(
			validateUploadRequest({
				title: "  ",
				size: 10,
				contentType: "application/pdf",
			}),
		).toMatchObject({ ok: false, status: 400 });
		expect(
			validateUploadRequest({
				title: " Livro ",
				size: LIBRARY_MAX_BYTES,
				contentType: "application/pdf",
			}),
		).toEqual({ ok: true, title: "Livro", size: LIBRARY_MAX_BYTES });
	});

	it("magic bytes %PDF-", () => {
		expect(hasPdfMagic(pdfHead)).toBe(true);
		expect(hasPdfMagic(new TextEncoder().encode("PK\u0003\u0004x"))).toBe(
			false,
		);
		expect(hasPdfMagic(new Uint8Array())).toBe(false);
	});

	it("confere objeto enviado contra o aprovado", () => {
		expect(
			checkUploadedObject(
				100,
				{ contentLength: 100, contentType: "application/pdf" },
				pdfHead,
			),
		).toEqual({ ok: true });
		expect(
			checkUploadedObject(
				100,
				{ contentLength: 101, contentType: "application/pdf" },
				pdfHead,
			).ok,
		).toBe(false);
		expect(
			checkUploadedObject(
				100,
				{ contentLength: 100, contentType: "text/plain" },
				pdfHead,
			).ok,
		).toBe(false);
		expect(
			checkUploadedObject(
				100,
				{ contentLength: 100, contentType: "application/pdf" },
				new TextEncoder().encode("hello"),
			).ok,
		).toBe(false);
	});

	it("chave no prefixo da campanha", () => {
		expect(buildLibraryKey("c", "f")).toBe("library/c/f.pdf");
	});

	it("pendente velho = mais de 1h", () => {
		const now = Date.parse("2026-10-12T18:00:00Z");
		expect(isStalePending("2026-10-12T16:59:00Z", now)).toBe(true);
		expect(isStalePending("2026-10-12T17:30:00Z", now)).toBe(false);
		expect(isStalePending("lixo", now)).toBe(false);
	});

	it("CORS só para origens permitidas", () => {
		const allowed = parseAllowedOrigins(
			"https://arkhiveon.com.br/, https://localhost",
		);
		expect(resolveCorsOrigin("https://localhost", allowed)).toBe(
			"https://localhost",
		);
		expect(resolveCorsOrigin("https://evil.example", allowed)).toBeNull();
		expect(resolveCorsOrigin(null, allowed)).toBeNull();
	});

	it("TTL curto só em modo de teste", () => {
		expect(resolveReadTtl(2, false)).toBe(LIBRARY_READ_TTL_SECONDS);
		expect(resolveReadTtl(2, true)).toBe(2);
		expect(resolveReadTtl(9999, true)).toBe(LIBRARY_READ_TTL_SECONDS);
	});
});
