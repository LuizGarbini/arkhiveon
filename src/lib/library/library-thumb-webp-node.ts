/**
 * Encode WebP no backfill: usa o Chromium do Playwright (já é devDependency).
 * O render do PDF continua no pdfium, em Node; o navegador só vira o bitmap
 * em WebP, com as mesmas qualidades do cliente.
 */
import { type Browser, chromium, type Page } from "playwright";
import { encodeLibraryThumbWebp } from "./library-thumb";

export type PlaywrightWebpEncoder = {
	encode: (
		rgba: Uint8ClampedArray,
		width: number,
		height: number,
	) => Promise<Uint8Array>;
	close: () => Promise<void>;
};

async function encodeOnPage(
	page: Page,
	rgba: Uint8ClampedArray,
	width: number,
	height: number,
	quality: number,
): Promise<Blob> {
	const payload = Array.from(rgba);
	const bytes = await page.evaluate(
		async ({ data, w, h, q }) => {
			const canvas = new OffscreenCanvas(w, h);
			const ctx = canvas.getContext("2d");
			if (!ctx) throw new Error("OffscreenCanvas indisponível.");
			ctx.putImageData(new ImageData(Uint8ClampedArray.from(data), w, h), 0, 0);
			const blob = await canvas.convertToBlob({
				type: "image/webp",
				quality: q,
			});
			const buffer = new Uint8Array(await blob.arrayBuffer());
			let binary = "";
			for (const value of buffer) binary += String.fromCharCode(value);
			return { type: blob.type, b64: btoa(binary) };
		},
		{ data: payload, w: width, h: height, q: quality },
	);
	const raw = Uint8Array.from(atob(bytes.b64), (char) => char.charCodeAt(0));
	return new Blob([raw], { type: bytes.type || "image/webp" });
}

export async function createPlaywrightWebpEncoder(options?: {
	executablePath?: string;
}): Promise<PlaywrightWebpEncoder> {
	const browser: Browser = await chromium.launch({
		headless: true,
		executablePath: options?.executablePath,
	});
	const page = await browser.newPage();
	return {
		async encode(rgba, width, height) {
			const encoded = await encodeLibraryThumbWebp((quality) =>
				encodeOnPage(page, rgba, width, height, quality),
			);
			if (!encoded.ok) throw new Error("A capa ficou acima de 150 KB.");
			return encoded.bytes;
		},
		async close() {
			await browser.close();
		},
	};
}
