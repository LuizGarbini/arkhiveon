import { describe, expect, it, vi } from "vitest";
import { tryUploadLibraryThumb } from "./library-thumb-upload";

function webpBytes(size = 64): Uint8Array {
	const bytes = new Uint8Array(size);
	bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
	return bytes;
}

function pdfFile(size: number): File {
	const file = new File(["%PDF-1.7 test"], "teste.pdf", {
		type: "application/pdf",
	});
	Object.defineProperty(file, "size", { value: size });
	return file;
}

describe("tryUploadLibraryThumb", () => {
	it("acima do teto marca failed e não renderiza", async () => {
		const invoke = vi.fn(async (body: Record<string, unknown>) => {
			expect(body.action).toBe("report-thumb-failed");
			return {};
		});
		const render = vi.fn();
		const put = vi.fn();
		// sizeLimit 1 byte: o File real é maior, então o teto impede o render.
		const status = await tryUploadLibraryThumb("file-1", pdfFile(1024), {
			invoke,
			put,
			render,
			sizeLimit: 1,
		});
		expect(status).toBe("failed");
		expect(render).not.toHaveBeenCalled();
		expect(put).not.toHaveBeenCalled();
		expect(invoke).toHaveBeenCalledTimes(1);
	});

	it("erro no render marca failed e não lança", async () => {
		const invoke = vi.fn(async () => ({}));
		const status = await tryUploadLibraryThumb("file-2", pdfFile(1024), {
			invoke,
			put: vi.fn(),
			render: async () => {
				throw new Error("PDF protegido por senha.");
			},
			sizeLimit: 64 * 1024 * 1024,
		});
		expect(status).toBe("failed");
		expect(invoke).toHaveBeenCalledWith({
			action: "report-thumb-failed",
			fileId: "file-2",
		});
	});

	it("sucesso pede o PUT, confirma e devolve ready", async () => {
		const bytes = webpBytes(80);
		const invoke = vi.fn(async (body: Record<string, unknown>) => {
			if (body.action === "request-thumb-upload") {
				expect(body.size).toBe(80);
				return {
					uploadUrl: "https://example.test/put",
					headers: { "Content-Type": "image/webp" },
				};
			}
			if (body.action === "confirm-thumb") return { thumbStatus: "ready" };
			throw new Error(`ação inesperada ${String(body.action)}`);
		});
		const put = vi.fn(async (url: string, body: Blob) => {
			expect(url).toBe("https://example.test/put");
			expect(body.type).toBe("image/webp");
			expect(body.size).toBe(80);
		});
		const status = await tryUploadLibraryThumb("file-3", pdfFile(2048), {
			invoke,
			put,
			render: async () => bytes,
			sizeLimit: 64 * 1024 * 1024,
		});
		expect(status).toBe("ready");
		expect(put).toHaveBeenCalledTimes(1);
		expect(invoke.mock.calls.map((c) => c[0].action)).toEqual([
			"request-thumb-upload",
			"confirm-thumb",
		]);
	});

	it("falha no confirm marca failed e o chamador não vê a exceção", async () => {
		const invoke = vi.fn(async (body: Record<string, unknown>) => {
			if (body.action === "request-thumb-upload") {
				return { uploadUrl: "https://example.test/put", headers: {} };
			}
			if (body.action === "confirm-thumb") {
				throw new Error("Capa inválida.");
			}
			return {};
		});
		const status = await tryUploadLibraryThumb("file-4", pdfFile(2048), {
			invoke,
			put: vi.fn(async () => {}),
			render: async () => webpBytes(80),
			sizeLimit: 64 * 1024 * 1024,
		});
		expect(status).toBe("failed");
		expect(invoke.mock.calls.map((c) => c[0].action)).toEqual([
			"request-thumb-upload",
			"confirm-thumb",
			"report-thumb-failed",
		]);
	});
});
