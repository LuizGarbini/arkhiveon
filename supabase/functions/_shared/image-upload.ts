/**
 * image-upload — regras puras do upload e da exclusão de imagens no R2.
 *
 * Sem dependência de Deno: roda nas Edge Functions `r2-upload` e `r2-delete` e
 * nos testes do Vitest.
 */

import { isValidStorageKey } from "./image-guard.ts";

/** Só imagens: o app converte tudo para WebP antes de enviar. */
const IMAGE_TYPES: Readonly<Record<string, string>> = {
	"image/webp": "webp",
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/gif": "gif",
};

/** Extensão do arquivo pelo tipo declarado; `null` se não for imagem aceita. */
export function imageExtensionForType(contentType: unknown): string | null {
	if (typeof contentType !== "string") return null;
	const base = contentType.split(";")[0].trim().toLowerCase();
	return IMAGE_TYPES[base] ?? null;
}

/**
 * Confere se os primeiros bytes são mesmo da imagem que o tipo declara. Quem
 * chama a função direto pode declarar `image/png` e mandar outra coisa.
 */
export function bytesMatchImageType(
	contentType: string,
	bytes: Uint8Array,
): boolean {
	const base = contentType.split(";")[0].trim().toLowerCase();
	const at = (offset: number, text: string) =>
		[...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));
	switch (base) {
		case "image/webp":
			return bytes.length >= 12 && at(0, "RIFF") && at(8, "WEBP");
		case "image/png":
			return (
				bytes.length >= 8 &&
				bytes[0] === 0x89 &&
				at(1, "PNG") &&
				bytes[4] === 0x0d &&
				bytes[5] === 0x0a &&
				bytes[6] === 0x1a &&
				bytes[7] === 0x0a
			);
		case "image/jpeg":
			return (
				bytes.length >= 3 &&
				bytes[0] === 0xff &&
				bytes[1] === 0xd8 &&
				bytes[2] === 0xff
			);
		case "image/gif":
			return bytes.length >= 6 && (at(0, "GIF87a") || at(0, "GIF89a"));
		default:
			return false;
	}
}

export type UploadCheck =
	| { ok: true; extension: string }
	| { ok: false; message: string };

export function checkImageUpload(
	contentType: unknown,
	bytes: Uint8Array,
): UploadCheck {
	const extension = imageExtensionForType(contentType);
	if (!extension || typeof contentType !== "string")
		return {
			ok: false,
			message: "Só imagens WebP, PNG, JPEG ou GIF são aceitas.",
		};
	if (!bytesMatchImageType(contentType, bytes))
		return {
			ok: false,
			message: "O arquivo não é a imagem que o tipo informa.",
		};
	return { ok: true, extension };
}

// ── Exclusão ─────────────────────────────────────────────────────────

export interface DeleteRequest {
	key: string;
	/** Dono da pasta no R2 (primeiro trecho da chave). */
	ownerId: string;
}

/** `{ key }` no formato que o upload gera; `null` para qualquer outra coisa. */
export function parseDeleteRequest(body: unknown): DeleteRequest | null {
	if (!body || typeof body !== "object") return null;
	const key = (body as { key?: unknown }).key;
	if (!isValidStorageKey(key)) return null;
	return { key, ownerId: key.split("/")[0].toLowerCase() };
}

/**
 * Quem pode apagar o arquivo: o dono da pasta, ou mestre/co-mestre de uma
 * campanha dele (os membros enviam para a pasta do mestre, que paga a cota).
 */
export function canDeleteImage(input: {
	userId: string;
	ownerId: string;
	isStaffOfOwner: boolean;
}): boolean {
	return (
		input.userId.toLowerCase() === input.ownerId.toLowerCase() ||
		input.isStaffOfOwner
	);
}

/** Cota depois de apagar `size` bytes; nunca fica negativa. */
export function storageUsedAfterDelete(used: number, size: number): number {
	const current = Number.isFinite(used) ? used : 0;
	const removed = Number.isFinite(size) && size > 0 ? size : 0;
	return Math.max(0, current - removed);
}
