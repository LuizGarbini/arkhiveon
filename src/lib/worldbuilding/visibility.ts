import type { MembershipRole } from "../store/types";

export type PublicationScope = "global" | "restricted";
export type EntityVisibility = "public" | "master_secret";

export interface ScopedContent {
	worldId: string;
	publicationScope?: PublicationScope;
	audience?: PublicationScope;
	campaignIds: string[];
	visibility: EntityVisibility;
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
export function canViewScopedContent(
	content: ScopedContent,
	activeCampaign: ActiveCampaignContext | null | undefined,
	role: MembershipRole | undefined,
	worldCampaigns?: Array<WorldCampaignRole>,
): boolean {
	if (!activeCampaign || !role) return false;
	const normalized = toScopedContent(content);
	if (normalized.worldId !== activeCampaign.worldId) return false;

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
): T[] {
	return items.filter((item) =>
		canViewScopedContent(item, activeCampaign, role, worldCampaigns),
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
