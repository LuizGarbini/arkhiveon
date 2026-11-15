// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkImageUpload } from "../../../supabase/functions/_shared/image-upload";

const invoke = vi.fn();
vi.mock("../supabase", () => ({
	supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));
const PNG = new Uint8Array([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
]);
const WEBP = new Uint8Array([
	...ascii("RIFF"),
	1,
	0,
	0,
	0,
	...ascii("WEBP"),
	0,
]);

/** Simula o canvas: `encoded` é o que o navegador consegue gerar quando pedem WebP. */
function fakeCanvas(encoded: Uint8Array, mime: string) {
	vi.stubGlobal("createImageBitmap", async () => ({
		width: 800,
		height: 600,
		close() {},
	}));
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
		(() => ({
			drawImage() {},
		})) as unknown as HTMLCanvasElement["getContext"],
	);
	vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
		(callback) => {
			callback(new Blob([encoded as BlobPart], { type: mime }));
		},
	);
}

/** jsdom não tem Blob.arrayBuffer; o FileReader tem. */
function readAll(blob: Blob): Promise<Uint8Array> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
		reader.readAsArrayBuffer(blob);
	});
}

async function sentFile(): Promise<{
	file: File;
	bytes: Uint8Array;
	body: FormData;
}> {
	const call = invoke.mock.calls.at(-1);
	const body = (call?.[1] as { body: FormData }).body;
	const file = body.get("file") as File;
	return { file, bytes: await readAll(file), body };
}

beforeEach(() => {
	invoke.mockReset();
	invoke.mockResolvedValue({
		data: { key: "user/factions/1-abc.webp" },
		error: null,
	});
	vi.stubEnv("VITE_R2_PUBLIC_URL", "https://cdn.test");
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	vi.unstubAllEnvs();
});

describe("CloudflareR2ImageStorage.upload · o arquivo enviado", () => {
	it("navegador COM WebP: envia WebP e o servidor aceita", async () => {
		fakeCanvas(WEBP, "image/webp");
		const { CloudflareR2ImageStorage } = await import("../image-storage");
		const url = await new CloudflareR2ImageStorage().upload(
			new File([PNG], "brasao.png"),
			{
				folder: "factions",
				campaignId: "camp-1",
			},
		);
		const { file, bytes, body } = await sentFile();
		expect(file.type).toBe("image/webp");
		expect(checkImageUpload(file.type, bytes).ok).toBe(true);
		expect(body.get("folder")).toBe("factions");
		expect(body.get("campaignId")).toBe("camp-1");
		expect(url).toBe("https://cdn.test/user/factions/1-abc.webp");
	});

	it("navegador SEM WebP (canvas devolve PNG): envia PNG declarado como PNG, não 415", async () => {
		fakeCanvas(PNG, "image/png");
		const { CloudflareR2ImageStorage } = await import("../image-storage");
		await new CloudflareR2ImageStorage().upload(new File([PNG], "brasao.jpg"), {
			folder: "factions",
			campaignId: "camp-1",
		});
		const { file, bytes } = await sentFile();
		expect(file.type).toBe("image/png");
		expect(file.name).toBe("brasao.png");
		expect(checkImageUpload(file.type, bytes)).toEqual({
			ok: true,
			extension: "png",
		});
	});

	it("o canvas devolveu algo que não é imagem: erro claro e NADA é enviado", async () => {
		fakeCanvas(new Uint8Array(ascii("not an image at all")), "text/plain");
		const { CloudflareR2ImageStorage } = await import("../image-storage");
		await expect(
			new CloudflareR2ImageStorage().upload(new File([PNG], "a.png"), {
				campaignId: "c",
			}),
		).rejects.toThrow(/formato que não dá para enviar/);
		expect(invoke).not.toHaveBeenCalled();
	});
});
