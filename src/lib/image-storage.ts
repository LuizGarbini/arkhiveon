/**
 * Image storage layer.
 *
 * Images are resized to WebP in the browser, then sent to a Supabase Edge
 * Function. The function uploads to Cloudflare R2 server-side so the browser
 * does not depend on R2 bucket CORS for PUT requests.
 */

import { supabase } from "./supabase";
import {
	describeUploadFailure,
	UPLOAD_NETWORK_MESSAGE,
	uploadAbortError,
} from "./upload-error";

export interface UploadOptions {
	/** Logical folder, for example "characters" or "npcs". */
	folder?: string;
	/** Campaign id used by the Edge Function for ownership and quota checks. */
	campaignId?: string;
	/** Longest side in px. Defaults to 640. */
	maxDimension?: number;
	/** WebP quality from 0 to 1. Defaults to 0.72. */
	quality?: number;
	/** Cancels the upload; the promise rejects with an AbortError. */
	signal?: AbortSignal;
}

export interface ImageStorage {
	upload(file: File, options?: UploadOptions): Promise<string>;
	delete(url: string): Promise<void>;
}

interface R2UploadResponse {
	key?: string;
	url?: string;
	error?: string;
}

type ConfiguredSupabaseClient = NonNullable<typeof supabase>;

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
		// Noop: local images live in the in-memory state.
	}
}

export class CloudflareR2ImageStorage implements ImageStorage {
	async upload(file: File, options: UploadOptions = {}): Promise<string> {
		const max = options.maxDimension ?? DEFAULT_MAX_DIMENSION;
		const quality = options.quality ?? DEFAULT_QUALITY;
		const blob = await resizeToBlob(file, max, quality);
		if (options.signal?.aborted) throw uploadAbortError();
		const webpFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
			type: "image/webp",
		});

		if (!supabase) {
			throw new Error(
				"Supabase nao configurado. Impossivel fazer upload da imagem.",
			);
		}

		const data = await uploadThroughFunction(supabase, webpFile, options);
		if (!data.key) {
			throw new Error(data.error || "Falha ao enviar imagem para o R2.");
		}

		return publicR2Url(data.key);
	}

	async delete(_url: string): Promise<void> {
		// TODO: Delete through the Edge Function when library removal needs it.
	}
}

async function uploadThroughFunction(
	client: ConfiguredSupabaseClient,
	webpFile: File,
	options: UploadOptions,
): Promise<R2UploadResponse> {
	const body = new FormData();
	body.append("file", webpFile);
	appendOptionalFormValue(body, "campaignId", options.campaignId);
	appendOptionalFormValue(body, "folder", options.folder);

	const { data, error } = await client.functions.invoke<R2UploadResponse>(
		"r2-upload",
		{ body, signal: options.signal },
	);

	if (options.signal?.aborted) throw uploadAbortError();
	if (error) {
		console.error("R2 server-side upload failed:", error);
		throw new Error(await uploadErrorMessage(error));
	}
	if (!data?.key) {
		console.error("R2 server-side upload failed:", data?.error);
		throw new Error(data?.error || "Falha ao enviar imagem para o R2.");
	}

	return { key: data.key };
}

async function uploadErrorMessage(error: {
	name?: string;
	context?: unknown;
}): Promise<string> {
	if (error.name === "FunctionsFetchError") return UPLOAD_NETWORK_MESSAGE;
	const response = error.context instanceof Response ? error.context : null;
	let serverMessage: string | undefined;
	try {
		const payload = (await response?.clone().json()) as
			| { error?: string }
			| undefined;
		serverMessage = payload?.error;
	} catch {
		// Body is not JSON; the status alone decides the message.
	}
	return describeUploadFailure(response?.status, serverMessage);
}

function appendOptionalFormValue(
	body: FormData,
	key: string,
	value: string | undefined,
) {
	if (value) body.append(key, value);
}

function publicR2Url(key: string): string {
	const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL;
	if (!publicUrl) {
		console.warn(
			"Aviso: VITE_R2_PUBLIC_URL nao definida no .env. A imagem pode nao renderizar.",
		);
		return key;
	}

	return `${publicUrl.replace(/\/$/, "")}/${key}`;
}

export const imageStorage: ImageStorage = new CloudflareR2ImageStorage();

export function isImageUrl(value: string | undefined | null): boolean {
	if (!value) return false;
	return (
		value.startsWith("data:image/") ||
		value.startsWith("/") ||
		/^https?:\/\//.test(value)
	);
}
