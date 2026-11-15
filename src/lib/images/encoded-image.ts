/**
 * O arquivo que vai para o servidor tem de declarar o tipo que ele realmente é.
 *
 * O app pede WebP ao canvas (`toBlob("image/webp")`), mas nem todo navegador
 * sabe gerar WebP: o Safari, por exemplo, devolve PNG nesse caso. Declarar
 * `image/webp` para bytes de PNG faz o servidor recusar o envio (415, "o arquivo
 * não é a imagem que o tipo informa"). Aqui o tipo vem dos primeiros bytes.
 */

export type EncodedImageType =
	| "image/webp"
	| "image/png"
	| "image/jpeg"
	| "image/gif";

const EXTENSION: Readonly<Record<EncodedImageType, string>> = {
	"image/webp": "webp",
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
};

export const UNSUPPORTED_ENCODED_IMAGE_MESSAGE =
	"Seu navegador gerou a imagem num formato que não dá para enviar. Tente outra imagem ou outro navegador.";

/** Tipo da imagem pelos primeiros bytes; `null` se não for um formato aceito. */
export function sniffImageType(bytes: Uint8Array): EncodedImageType | null {
	const at = (offset: number, text: string) =>
		[...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));
	if (bytes.length >= 12 && at(0, "RIFF") && at(8, "WEBP")) return "image/webp";
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		at(1, "PNG") &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	)
		return "image/png";
	if (
		bytes.length >= 3 &&
		bytes[0] === 0xff &&
		bytes[1] === 0xd8 &&
		bytes[2] === 0xff
	)
		return "image/jpeg";
	if (bytes.length >= 6 && (at(0, "GIF87a") || at(0, "GIF89a")))
		return "image/gif";
	return null;
}

/** Lê os bytes do Blob; navegadores sem `Blob.arrayBuffer` (Safari antigo) usam FileReader. */
function readBytes(blob: Blob): Promise<Uint8Array> {
	if (typeof blob.arrayBuffer === "function") {
		return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
	}
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
		reader.readAsArrayBuffer(blob);
	});
}

/**
 * Embrulha o que o canvas gerou num arquivo com o tipo e a extensão corretos,
 * seja WebP (o normal) ou o formato de reserva do navegador.
 */
export async function encodedImageFile(
	blob: Blob,
	originalName: string,
): Promise<File> {
	const head = await readBytes(blob.slice(0, 16));
	const type = sniffImageType(head);
	if (!type) throw new Error(UNSUPPORTED_ENCODED_IMAGE_MESSAGE);
	const base = originalName.replace(/\.[^/.]+$/, "") || "imagem";
	return new File([blob], `${base}.${EXTENSION[type]}`, { type });
}
