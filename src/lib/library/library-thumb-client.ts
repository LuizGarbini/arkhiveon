/**
 * Dispara o Worker lazy do pdfium e devolve o WebP da página 1.
 * O wasm é o mesmo do viewer e só baixa quando alguém envia um PDF.
 */
import pdfiumWasmUrl from "@embedpdf/pdfium/pdfium.wasm?url";

const WORKER_TIMEOUT_MS = 60_000;

export async function renderLibraryThumbInWorker(
	pdfBytes: Uint8Array,
): Promise<Uint8Array> {
	const wasmUrl = new URL(pdfiumWasmUrl, self.location.href).href;
	const worker = new Worker(
		new URL("./library-thumb.worker.ts", import.meta.url),
		{ type: "module" },
	);
	try {
		const copy = pdfBytes.buffer.slice(
			pdfBytes.byteOffset,
			pdfBytes.byteOffset + pdfBytes.byteLength,
		);
		return await new Promise<Uint8Array>((resolve, reject) => {
			const timer = setTimeout(() => {
				reject(new Error("A geração da capa demorou demais."));
			}, WORKER_TIMEOUT_MS);
			worker.onmessage = (event: MessageEvent) => {
				clearTimeout(timer);
				const data = event.data as
					| { ok: true; webp: ArrayBuffer }
					| { ok: false; error: string };
				if (data?.ok) resolve(new Uint8Array(data.webp));
				else reject(new Error(data?.error || "Falha na capa."));
			};
			worker.onerror = () => {
				clearTimeout(timer);
				reject(new Error("O Worker da capa falhou."));
			};
			worker.postMessage({ pdfBytes: copy, wasmUrl }, [copy]);
		});
	} finally {
		worker.terminate();
	}
}
