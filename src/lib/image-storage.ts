/**
 * Camada de abstracao para armazenamento de imagens.
 *
 * Agora usamos a impl `CloudflareR2ImageStorage`, que converte a imagem para WebP localmente
 * e envia para o Cloudflare R2 usando uma Supabase Edge Function para segurança.
 */

import { supabase } from "./supabase";

export interface UploadOptions {
	/** Pasta logica (ex: "characters", "npcs"). Util para futuro R2/Supabase. */
	folder?: string;
	/** Limite maximo do lado maior em px. Padrao: 640. */
	maxDimension?: number;
	/** Qualidade da imagem (0..1) usada quando convertemos. Padrao: 0.72. */
	quality?: number;
}

export interface ImageStorage {
	upload(file: File, options?: UploadOptions): Promise<string>;
	delete(url: string): Promise<void>;
}

const DEFAULT_MAX_DIMENSION = 640;
const DEFAULT_QUALITY = 0.72;

function readFileAsImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () => {
			const img = new Image();
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error("Falha ao carregar imagem."));
			img.src = String(reader.result);
		};
		reader.readAsDataURL(file);
	});
}

function readBlobAsDataURL(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(reader.error);
		reader.onload = () => resolve(String(reader.result));
		reader.readAsDataURL(blob);
	});
}

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Falha ao criar blob"));
			},
			type,
			quality,
		);
	});
}

function canvasToDataURL(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<string> {
	return new Promise((resolve) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					resolve(canvas.toDataURL(type, quality));
					return;
				}

				void readBlobAsDataURL(blob).then(resolve);
			},
			type,
			quality,
		);
	});
}

async function resizeToDataURL(
	file: File,
	maxDimension: number,
	quality: number,
): Promise<string> {
	const source =
		"createImageBitmap" in window
			? await createImageBitmap(file)
			: await readFileAsImage(file);
	const ratio = Math.min(
		1,
		maxDimension / Math.max(source.width, source.height),
	);
	const width = Math.round(source.width * ratio);
	const height = Math.round(source.height * ratio);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Nao foi possivel inicializar canvas.");
	ctx.drawImage(source, 0, 0, width, height);

	if ("close" in source && typeof source.close === "function") {
		source.close();
	}

	return canvasToDataURL(canvas, "image/webp", quality);
}

async function resizeToBlob(
	file: File,
	maxDimension: number,
	quality: number,
): Promise<Blob> {
	const source =
		"createImageBitmap" in window
			? await createImageBitmap(file)
			: await readFileAsImage(file);
	const ratio = Math.min(
		1,
		maxDimension / Math.max(source.width, source.height),
	);
	const width = Math.round(source.width * ratio);
	const height = Math.round(source.height * ratio);

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const ctx = canvas.getContext("2d");
	if (!ctx) throw new Error("Nao foi possivel inicializar canvas.");
	ctx.drawImage(source, 0, 0, width, height);

	if ("close" in source && typeof source.close === "function") {
		source.close();
	}

	return canvasToBlob(canvas, "image/webp", quality);
}

export class LocalImageStorage implements ImageStorage {
	async upload(file: File, options: UploadOptions = {}): Promise<string> {
		const max = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
		const quality = options.quality ?? DEFAULT_QUALITY;
		return resizeToDataURL(file, max, quality);
	}

	async delete(_url: string): Promise<void> {
		// noop: a imagem local vive dentro do estado e some quando o campo e limpo.
	}
}

export class CloudflareR2ImageStorage implements ImageStorage {
	async upload(file: File, options: UploadOptions = {}): Promise<string> {
		const max = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
		const quality = options.quality ?? DEFAULT_QUALITY;
		
		// 1. Redimensiona e converte para WebP (blob) localmente
		const blob = await resizeToBlob(file, max, quality);
		const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), { type: "image/webp" });

		// 2. Chama a Edge Function para pegar a URL de Upload temporária
		const { data, error } = await supabase.functions.invoke("r2-upload", {
			body: {
				fileName: webpFile.name,
				contentType: webpFile.type,
				fileSize: webpFile.size,
			},
		});

		if (error || !data?.url || !data?.key) {
			console.error("R2 Upload Error:", error || data?.error);
			throw new Error("Falha ao gerar link de upload seguro do R2.");
		}

		// 3. Faz o upload da imagem diretamente para o R2
		const uploadRes = await fetch(data.url, {
			method: "PUT",
			headers: {
				"Content-Type": webpFile.type,
			},
			body: webpFile,
		});

		if (!uploadRes.ok) {
			throw new Error("Falha no upload do arquivo para o R2.");
		}

		// 4. Retorna a URL pública
		const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
		if (!publicUrl) {
			console.warn("Aviso: VITE_R2_PUBLIC_URL não definida no .env. A imagem pode não renderizar.");
			return data.key;
		}

		return `${publicUrl.replace(/\/$/, "")}/${data.key}`;
	}

	async delete(_url: string): Promise<void> {
		// TODO: Implementar exclusão futura através de Edge Function
	}
}

export const imageStorage: ImageStorage = new CloudflareR2ImageStorage();

export function isImageUrl(value: string | undefined | null): boolean {
	if (!value) return false;
	return value.startsWith("data:image/") || /^https?:\/\//.test(value);
}
