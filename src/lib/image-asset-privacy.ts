import { remoteErrorMessage } from "./store/helpers";
import type { MembershipRole } from "./store/types";

/**
 * Regras de `image_assets` (RLS da migração 0054):
 * - qualquer membro da mesa sobe imagem (jogador incluído);
 * - qualquer um pode privar a própria imagem; o mestre sempre vê tudo.
 */

/** Pode gravar uma linha em `image_assets`? Desde a 0054, todo membro pode; a RLS decide. */
export function canWriteImageLibrary(
	_role: MembershipRole | undefined,
): boolean {
	return true;
}

/** Decide `isPrivate` de uma imagem nova. Padrão: pública para a mesa. */
export function resolveImageAssetPrivacy(
	_role: MembershipRole | undefined,
	requested: boolean | undefined,
): boolean {
	return requested ?? false;
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
