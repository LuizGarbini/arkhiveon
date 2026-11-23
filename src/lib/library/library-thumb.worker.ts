/// <reference lib="webworker" />
import { renderLibraryThumbWebpFromPdf } from "./library-thumb-render";

export type LibraryThumbWorkerRequest = {
	pdfBytes: ArrayBuffer;
	wasmUrl: string;
};

export type LibraryThumbWorkerResponse =
	| { ok: true; webp: ArrayBuffer }
	| { ok: false; error: string };

self.onmessage = async (event: MessageEvent<LibraryThumbWorkerRequest>) => {
	try {
		const { pdfBytes, wasmUrl } = event.data;
		const wasmBinary = await (await fetch(wasmUrl)).arrayBuffer();
		const webp = await renderLibraryThumbWebpFromPdf({
			pdfBytes: new Uint8Array(pdfBytes),
			wasmBinary,
		});
		const copy = new ArrayBuffer(webp.byteLength);
		new Uint8Array(copy).set(webp);
		const response: LibraryThumbWorkerResponse = { ok: true, webp: copy };
		(self as DedicatedWorkerGlobalScope).postMessage(response, [copy]);
	} catch (error) {
		const message = error instanceof Error ? error.message : "Falha na capa.";
		const response: LibraryThumbWorkerResponse = { ok: false, error: message };
		(self as DedicatedWorkerGlobalScope).postMessage(response);
	}
};
