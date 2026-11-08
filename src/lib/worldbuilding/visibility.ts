import type { ContentShare, MembershipRole } from "../store/types";

export type PublicationScope = "global" | "restricted";
export type EntityVisibility = "public" | "master_secret";

export interface ScopedContent {
	worldId: string;
	publicationScope?: PublicationScope;
	audience?: PublicationScope;
	campaignIds: string[];
	visibility: EntityVisibility;
	/** Quando presente, substitui `visibility` na hora de decidir quem vê. */
	share?: ContentShare;
	sharedWith?: string[];
	createdBy?: string;
}

export function resolvePublicationScope(
	content: Pick<ScopedContent, "publicationScope" | "audience">,
): PublicationScope {
	return content.publicationScope ?? content.audience ?? "global";
}

export function toScopedContent(content: ScopedContent): Required<
	Pick<ScopedContent, "worldId" | "campaignIds" | "visibility">
> & {
	publicationScope: PublicationScope;
} {
	return {
		worldId: content.worldId,
		publicationScope: resolvePublicationScope(content),
		campaignIds: content.campaignIds,
		visibility: content.visibility,
	};
}

export interface ActiveCampaignContext {
	id: string;
	worldId: string;
}

export type WorldCampaignRole = {
	worldId: string;
	myRole?: MembershipRole;
};

export function isWorldStaff(role: MembershipRole | undefined): boolean {
	return role === "owner" || role === "editor";
}

export function isWorldStaffInWorld(
	campaigns: Array<WorldCampaignRole>,
	worldId: string,
): boolean {
	return campaigns.some((c) => c.worldId === worldId && isWorldStaff(c.myRole));
}

export function passesScope(
	content: Pick<ScopedContent, "publicationScope" | "audience" | "campaignIds">,
	activeCampaign: ActiveCampaignContext,
): boolean {
	const scope = resolvePublicationScope(content);
	if (scope === "global") return true;
	return content.campaignIds.includes(activeCampaign.id);
}

/**
 * Matriz §4 — filtra biblioteca/mural pela campanha ativa.
 * Segredo restrito fora do escopo: staff do Mundo ainda vê (grimório do mestre).
 */
function shareAllows(
	content: ScopedContent,
	role: MembershipRole | undefined,
	userId: string | null | undefined,
	worldCampaigns: Array<WorldCampaignRole> | undefined,
): boolean | "legacy" {
	if (!content.share) return "legacy";
	if (role === "owner") return true;
	if (userId && content.createdBy && content.createdBy === userId) return true;
	if (content.share === "table") return role != null;
	if (content.share === "staff") {
		if (isWorldStaff(role)) return true;
		if (worldCampaigns)
			return isWorldStaffInWorld(worldCampaigns, content.worldId);
		return false;
	}
	if (content.share === "players") return role === "viewer";
	if (content.share === "chosen") {
		return !!userId && (content.sharedWith ?? []).includes(userId);
	}
	return "legacy";
}

export function canViewScopedContent(
	content: ScopedContent,
	activeCampaign: ActiveCampaignContext | null | undefined,
	role: MembershipRole | undefined,
	worldCampaigns?: Array<WorldCampaignRole>,
	userId?: string | null,
): boolean {
	if (!activeCampaign || !role) return false;
	const normalized = toScopedContent(content);
	if (normalized.worldId !== activeCampaign.worldId) return false;

	const allowed = shareAllows(content, role, userId, worldCampaigns);
	if (allowed !== "legacy") {
		if (!allowed) return false;
		if (content.share === "staff") return true;
		return passesScope(normalized, activeCampaign);
	}

	if (normalized.visibility === "master_secret") {
		if (worldCampaigns) {
			return isWorldStaffInWorld(worldCampaigns, normalized.worldId);
		}
		return isWorldStaff(role);
	}

	return passesScope(normalized, activeCampaign);
}

export function canCommentOnNews(
	news: ScopedContent & { commentsLocked?: boolean },
	activeCampaign: ActiveCampaignContext | null | undefined,
	role: MembershipRole | undefined,
	worldCampaigns?: Array<WorldCampaignRole>,
): boolean {
	if (!canViewScopedContent(news, activeCampaign, role, worldCampaigns))
		return false;
	if (news.commentsLocked) {
		if (worldCampaigns) {
			return isWorldStaffInWorld(worldCampaigns, news.worldId);
		}
		return isWorldStaff(role);
	}
	return true;
}

export function filterVisibleContent<T extends ScopedContent>(
	items: T[],
	activeCampaign: ActiveCampaignContext | null | undefined,
	role: MembershipRole | undefined,
	worldCampaigns?: Array<WorldCampaignRole>,
	userId?: string | null,
): T[] {
	return items.filter((item) =>
		canViewScopedContent(item, activeCampaign, role, worldCampaigns, userId),
	);
}

export function defaultWorldEntityFields(
	worldId: string,
	campaignId: string,
): ScopedContent {
	return {
		worldId,
		publicationScope: "restricted",
		campaignIds: [campaignId],
		visibility: "public",
	};
}

export function validateRestrictedScope(
	publicationScope: PublicationScope,
	campaignIds: string[],
	worldCampaignIds: string[],
): string | null {
	if (publicationScope === "global") return null;
	if (campaignIds.length < 1) {
		return "Escopo restrito exige ao menos uma campanha.";
	}
	const invalid = campaignIds.find((id) => !worldCampaignIds.includes(id));
	if (invalid) {
		return "Campanhas selecionadas devem pertencer ao mesmo Mundo.";
	}
	return null;
}
