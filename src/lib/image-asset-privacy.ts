import { remoteErrorMessage } from "./store/helpers";
import type { MembershipRole } from "./store/types";

/**
 * Regras de `image_assets` (RLS em supabase/migrations/0005_image_assets.sql):
 * - INSERT só para `owner` e `editor`;
 * - `is_private = true` só quando quem envia é o `owner` (mestre).
 */

/** Pode gravar uma linha em `image_assets`? `undefined` = papel ainda não carregado; a RLS decide. */
export function canWriteImageLibrary(
	role: MembershipRole | undefined,
): boolean {
	return role !== "viewer";
}

/**
 * Decide `isPrivate` de uma imagem nova. Só o mestre pode criar imagem privada;
 * para qualquer outro papel a imagem vai para a mesa (`false`), senão o INSERT
 * é recusado pela RLS e a imagem some da galeria.
 */
export function resolveImageAssetPrivacy(
	role: MembershipRole | undefined,
	requested: boolean | undefined,
): boolean {
	if (role !== "owner") return false;
	return requested ?? true;
}

export type ImageAssetSyncAction = "create" | "update" | "delete";

const ACTION_TITLE: Record<ImageAssetSyncAction, string> = {
	create: "Imagem não entrou na Biblioteca",
	update: "Alteração da imagem não foi salva",
	delete: "Imagem não foi removida",
};

function isPermissionError(error: unknown): boolean {
	if (typeof error !== "object" || error === null) return false;
	const record = error as Record<string, unknown>;
	if (record.code === "42501") return true;
	const message = typeof record.message === "string" ? record.message : "";
	return /row-level security|permission denied/i.test(message);
}

/** Título + descrição do aviso mostrado quando a escrita em `image_assets` falha. */
export function describeImageAssetSyncError(
	error: unknown,
	action: ImageAssetSyncAction,
): { title: string; description: string } {
	const title = ACTION_TITLE[action];
	if (isPermissionError(error)) {
		return {
			title,
			description:
				"Seu papel nesta mesa não tem permissão para isso. Peça ao mestre.",
		};
	}
	return { title, description: remoteErrorMessage(error) };
}
