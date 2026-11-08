import {
	IA_MESA_IMAGE_MEDIA_TYPES,
	IA_MESA_MAX_IMAGE_BASE64_CHARS,
	IA_MESA_MAX_IMAGES,
	type IaMesaImageAttachment,
	type IaMesaImageMediaType,
} from "./proposal";

export { IA_MESA_MAX_IMAGES };

export const MAX_RAW_IMAGE_BYTES = 15 * 1024 * 1024;
const DIRECT_READ_THRESHOLD_BYTES = 800 * 1024;
const VISION_MAX_DIMENSION = 1568;
const VISION_WEBP_QUALITY = 0.85;

export interface IaMesaPreparedImage {
	id: string;
	name: string;
	mediaType: IaMesaImageMediaType;
	/** Base64 sem prefixo data:... */
	data: string;
	/** Data URL completa para miniatura no chat. */
	dataUrl: string;
}

export type PrepareImageResult =
	| { ok: true; image: IaMesaPreparedImage }
	| { ok: false; error: string };

let imageSeq = 0;
function nextImageId(): string {
	imageSeq += 1;
	return `ia-img-${Date.now()}-${imageSeq}`;
}

export function resolveImageMediaType(file: {
	type?: string;
	name?: string;
}): IaMesaImageMediaType | null {
	const mime = (file.type ?? "").toLowerCase().trim();
	if (mime === "image/jpg") return "image/jpeg";
	if ((IA_MESA_IMAGE_MEDIA_TYPES as readonly string[]).includes(mime)) {
		return mime as IaMesaImageMediaType;
	}
	const name = (file.name ?? "").toLowerCase();
	if (name.endsWith(".png")) return "image/png";
	if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
	if (name.endsWith(".webp")) return "image/webp";
	if (name.endsWith(".gif")) return "image/gif";
	return null;
}

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const slice = bytes.subarray(i, i + chunkSize);
		binary += String.fromCharCode(...slice);
	}
	return btoa(binary);
}

async function readFileBase64(file: Blob): Promise<string> {
	if (typeof file.arrayBuffer === "function") {
		const buffer = await file.arrayBuffer();
		return bytesToBase64(new Uint8Array(buffer));
	}
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Falha ao ler a imagem."));
		reader.onload = () => {
			const raw = String(reader.result ?? "");
			const comma = raw.indexOf(",");
			resolve(comma === -1 ? raw : raw.slice(comma + 1));
		};
		reader.readAsDataURL(file);
	});
}

async function tryResizeLargeImage(
	file: File,
): Promise<{ mediaType: IaMesaImageMediaType; data: string } | null> {
	if (typeof document === "undefined") return null;
	try {
		const bitmap =
			"createImageBitmap" in window ? await createImageBitmap(file) : null;
		if (!bitmap) return null;
		const ratio = Math.min(
			1,
			VISION_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height),
		);
		const width = Math.max(1, Math.round(bitmap.width * ratio));
		const height = Math.max(1, Math.round(bitmap.height * ratio));
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) return null;
		ctx.drawImage(bitmap, 0, 0, width, height);
		const dataUrl = canvas.toDataURL("image/webp", VISION_WEBP_QUALITY);
		const match = /^data:(image\/(?:webp|png|jpeg));base64,(.+)$/i.exec(
			dataUrl,
		);
		if (!match) return null;
		const mediaType = match[1].toLowerCase() as IaMesaImageMediaType;
		const data = match[2];
		return { mediaType, data };
	} catch {
		return null;
	}
}

/**
 * Lê e otimiza uma imagem para envio ao Assistente da mesa (Claude Vision).
 * Imagens grandes são redimensionadas para até 1568px em WebP.
 */
export async function prepareMesaImage(
	file: File,
): Promise<PrepareImageResult> {
	const detectedType = resolveImageMediaType(file);
	if (!detectedType) {
		return {
			ok: false,
			error: "Formato não suportado. Use PNG, JPG, WebP ou GIF.",
		};
	}
	if (file.size <= 0) {
		return { ok: false, error: "A imagem está vazia." };
	}
	if (file.size > MAX_RAW_IMAGE_BYTES) {
		return {
			ok: false,
			error: "A imagem passa de 15 MB. Escolha um arquivo menor.",
		};
	}

	let mediaType: IaMesaImageMediaType = detectedType;
	let data = "";

	if (file.size > DIRECT_READ_THRESHOLD_BYTES && detectedType !== "image/gif") {
		const resized = await tryResizeLargeImage(file);
		if (resized) {
			mediaType = resized.mediaType;
			data = resized.data;
		}
	}

	if (!data) {
		try {
			data = await readFileBase64(file);
		} catch {
			return { ok: false, error: "Não foi possível ler a imagem." };
		}
	}

	if (!data || data.length > IA_MESA_MAX_IMAGE_BASE64_CHARS) {
		return {
			ok: false,
			error: "A imagem é grande demais para enviar. Tente recortar ou reduzir.",
		};
	}

	const name = (file.name || "imagem").slice(0, 80);
	return {
		ok: true,
		image: {
			id: nextImageId(),
			name,
			mediaType,
			data,
			dataUrl: `data:${mediaType};base64,${data}`,
		},
	};
}

export function toImageAttachments(
	images: IaMesaPreparedImage[],
): IaMesaImageAttachment[] {
	return images.map((img) => ({
		mediaType: img.mediaType,
		data: img.data,
		name: img.name,
	}));
}
