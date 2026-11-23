/**
 * Render da página 1 com o mesmo @embedpdf/pdfium do viewer.
 * Só o Worker importa este arquivo, para o wasm não entrar no chunk principal.
 */
import { init, type WrappedPdfiumModule } from "@embedpdf/pdfium";
import { encodeLibraryThumbWebp, scaleLibraryThumbSize } from "./library-thumb";

const FPDF_REVERSE_BYTE_ORDER = 16;
const FPDF_ERR_PASSWORD = 4;

export type RenderThumbInput = {
	pdfBytes: Uint8Array;
	wasmBinary: ArrayBuffer;
};

type PdfiumHeap = {
	HEAPU8: Uint8Array;
	wasmExports: {
		malloc: (size: number) => number;
		free: (ptr: number) => void;
	};
};

function pdfiumHeap(pdfium: WrappedPdfiumModule): PdfiumHeap {
	return pdfium.pdfium as unknown as PdfiumHeap;
}

function cleanup(
	pdfium: WrappedPdfiumModule,
	ptrs: {
		filePtr?: number;
		docPtr?: number;
		pagePtr?: number;
		bitmapPtr?: number;
	},
): void {
	if (ptrs.bitmapPtr) pdfium.FPDFBitmap_Destroy(ptrs.bitmapPtr);
	if (ptrs.pagePtr) pdfium.FPDF_ClosePage(ptrs.pagePtr);
	if (ptrs.docPtr) pdfium.FPDF_CloseDocument(ptrs.docPtr);
	if (ptrs.filePtr) pdfiumHeap(pdfium).wasmExports.free(ptrs.filePtr);
}

async function renderPage1Rgba(
	input: RenderThumbInput,
): Promise<{ width: number; height: number; rgba: Uint8ClampedArray }> {
	const pdfium = await init({ wasmBinary: input.wasmBinary });
	pdfium.PDFiumExt_Init();
	const ptrs: {
		filePtr?: number;
		docPtr?: number;
		pagePtr?: number;
		bitmapPtr?: number;
	} = {};
	try {
		const bytes = input.pdfBytes;
		const heap = pdfiumHeap(pdfium);
		ptrs.filePtr = heap.wasmExports.malloc(bytes.length);
		heap.HEAPU8.set(bytes, ptrs.filePtr);
		ptrs.docPtr = pdfium.FPDF_LoadMemDocument(ptrs.filePtr, bytes.length, "");
		if (!ptrs.docPtr) {
			const error = pdfium.FPDF_GetLastError();
			if (error === FPDF_ERR_PASSWORD) {
				throw new Error("PDF protegido por senha.");
			}
			throw new Error("Não foi possível abrir o PDF.");
		}
		ptrs.pagePtr = pdfium.FPDF_LoadPage(ptrs.docPtr, 0);
		if (!ptrs.pagePtr) throw new Error("Não foi possível ler a página 1.");
		const pageW = pdfium.FPDF_GetPageWidthF(ptrs.pagePtr);
		const pageH = pdfium.FPDF_GetPageHeightF(ptrs.pagePtr);
		const { width, height } = scaleLibraryThumbSize(pageW, pageH);
		ptrs.bitmapPtr = pdfium.FPDFBitmap_Create(width, height, 0);
		if (!ptrs.bitmapPtr) throw new Error("Não foi possível renderizar a capa.");
		pdfium.FPDFBitmap_FillRect(ptrs.bitmapPtr, 0, 0, width, height, 0xffffffff);
		pdfium.FPDF_RenderPageBitmap(
			ptrs.bitmapPtr,
			ptrs.pagePtr,
			0,
			0,
			width,
			height,
			0,
			FPDF_REVERSE_BYTE_ORDER,
		);
		const bufferPtr = pdfium.FPDFBitmap_GetBuffer(ptrs.bitmapPtr);
		if (!bufferPtr) throw new Error("Não foi possível ler o bitmap.");
		const view = new Uint8ClampedArray(
			heap.HEAPU8.buffer,
			heap.HEAPU8.byteOffset + bufferPtr,
			width * height * 4,
		);
		const rgba = new Uint8ClampedArray(view.length);
		rgba.set(view);
		return { width, height, rgba };
	} finally {
		cleanup(pdfium, ptrs);
	}
}

export async function renderLibraryThumbWebpFromPdf(
	input: RenderThumbInput,
): Promise<Uint8Array> {
	if (typeof OffscreenCanvas === "undefined") {
		throw new Error("Este navegador não renderiza a capa no Worker.");
	}
	const { width, height, rgba } = await renderPage1Rgba(input);
	const canvas = new OffscreenCanvas(width, height);
	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Não foi possível desenhar a capa.");
	ctx.putImageData(
		new ImageData(new Uint8ClampedArray(rgba), width, height),
		0,
		0,
	);
	const encoded = await encodeLibraryThumbWebp((quality) =>
		canvas.convertToBlob({ type: "image/webp", quality }),
	);
	if (!encoded.ok) throw new Error("A capa ficou acima de 150 KB.");
	return encoded.bytes;
}
