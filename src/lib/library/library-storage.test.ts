import { describe, expect, it } from "vitest";
import {
	canManageLibraryRole,
	checkPdfFile,
	checkTitleDraft,
	formatBytes,
	libraryErrorMessage,
	titleFromFileName,
} from "./library-storage";

function fileOf(content: string, name: string, type: string, size?: number) {
	const file = new File([content], name, { type });
	if (size !== undefined) Object.defineProperty(file, "size", { value: size });
	return file;
}

describe("library-storage", () => {
	it("aceita PDF real e tira .pdf do título", async () => {
		await expect(
			checkPdfFile(
				fileOf("%PDF-1.7 ...", "Manual do Jogador.pdf", "application/pdf"),
			),
		).resolves.toEqual({ ok: true, title: "Manual do Jogador" });
	});

	it("recusa outro tipo, >200 MB e arquivo renomeado", async () => {
		expect((await checkPdfFile(fileOf("x", "a.png", "image/png"))).ok).toBe(
			false,
		);
		expect(
			(
				await checkPdfFile(
					fileOf("%PDF-", "a.pdf", "application/pdf", 209715201),
				)
			).ok,
		).toBe(false);
		expect(
			(
				await checkPdfFile(
					fileOf("PK\u0003\u0004", "zip.pdf", "application/pdf"),
				)
			).ok,
		).toBe(false);
	});

	it("só mestre/editor gerenciam", () => {
		expect(canManageLibraryRole("owner")).toBe(true);
		expect(canManageLibraryRole("editor")).toBe(true);
		expect(canManageLibraryRole("viewer")).toBe(false);
		expect(canManageLibraryRole(undefined)).toBe(false);
	});

	it("mapeia erros para texto leigo", () => {
		expect(libraryErrorMessage(403)).toMatch(/permissão/);
		expect(libraryErrorMessage(413)).toMatch(/200 MB/);
		expect(libraryErrorMessage(422)).toMatch(/PDF/);
		expect(libraryErrorMessage(500)).toMatch(/Tente de novo/);
	});

	it("formata tamanho e título longo", () => {
		expect(formatBytes(2048)).toBe("2 KB");
		expect(formatBytes(3.5 * 1024 * 1024)).toBe("3,5 MB");
		expect(titleFromFileName(`${"a".repeat(300)}.pdf`)).toHaveLength(200);
	});

	it("conserta acento quebrado no nome do arquivo antes do envio", async () => {
		const nfdBroken = new TextDecoder().decode(
			Uint8Array.from([
				0x50, 0x6f, 0x41, 0xcc, 0x83, 0xc2, 0xa7, 0x41, 0xcc, 0x83, 0xc2, 0xb5,
				0x65, 0x73, 0x2e, 0x70, 0x64, 0x66,
			]),
		); // "PoÃ§Ãµes.pdf" em NFD
		expect(titleFromFileName(nfdBroken)).toBe("Poções");
		expect(titleFromFileName("Península de Chult.pdf")).toBe(
			"Península de Chult",
		);
		expect(titleFromFileName("Biblioteca Ã_lfica.pdf")).toBe(
			"Biblioteca Ã_lfica",
		);
		await expect(
			checkPdfFile(fileOf("%PDF-1.7", "MÃ¡gicas.pdf", "application/pdf")),
		).resolves.toEqual({ ok: true, title: "Mágicas" });
	});

	it("valida o nome digitado ao renomear", () => {
		expect(checkTitleDraft("  Livro do Jogador ")).toEqual({
			ok: true,
			title: "Livro do Jogador",
		});
		expect(checkTitleDraft("   ")).toEqual({
			ok: false,
			error: "O nome não pode ficar vazio.",
		});
		expect(checkTitleDraft("a".repeat(201))).toEqual({
			ok: false,
			error: "Use até 200 caracteres.",
		});
	});
});
