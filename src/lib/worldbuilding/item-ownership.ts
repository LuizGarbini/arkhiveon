import type { MembershipRole } from "../store/types";
import { isWorldStaff } from "./visibility";

/** Item criado (ou atribuído) ao jogador — conteúdo próprio da campanha (§5.3). */
export interface OwnableItem {
	createdBy?: string;
}

export function canCreateCampaignItem(
	role: MembershipRole | undefined,
): boolean {
	return role === "owner" || role === "editor" || role === "viewer";
}

export function canManageOwnItem(
	item: OwnableItem,
	userId: string | undefined,
	roleOrStaff: MembershipRole | undefined | boolean,
): boolean {
	const staff =
		typeof roleOrStaff === "boolean"
			? roleOrStaff
			: isWorldStaff(roleOrStaff);
	if (staff) return true;
	return Boolean(userId && item.createdBy && item.createdBy === userId);
}

/** Campos de grimório que viewers não podem alterar ao criar/editar item próprio. */
export function viewerSafeItemPublication(campaignId: string) {
	return {
		publicationScope: "restricted" as const,
		campaignIds: [campaignId],
		visibility: "public" as const,
	};
}
