import type { Campaign, ImageAsset, MembershipRole } from "./store/types";
import { MAP_STORAGE_FOLDER } from "./vtt/map-upload";

/**
 * Regras da galeria de Imagens (modelo B): o que entra na grade, em que ordem
 * e quantas imagens cada filtro tem. A galeria é do **mundo**: mostra as imagens
 * de todas as campanhas que compartilham o mundo da campanha ativa.
 */

export type GalleryFilter = "all" | "table" | "private" | "vtt-maps";
export type GallerySort = "recent" | "oldest" | "name";

export const GALLERY_FILTERS: readonly { id: GalleryFilter; label: string }[] =
	[
		{ id: "all", label: "Todas" },
		{ id: "table", label: "Mesa" },
		{ id: "private", label: "Privadas" },
		{ id: "vtt-maps", label: "Mapas da VTT" },
	];

export const GALLERY_SORTS: readonly { id: GallerySort; label: string }[] = [
	{ id: "recent", label: "Mais recentes" },
	{ id: "oldest", label: "Mais antigas" },
	{ id: "name", label: "Nome (A–Z)" },
];

export interface GalleryScope {
	activeCampaignId: string | null;
	/** Mundo da campanha ativa. Sem mundo, a galeria cai para a campanha. */
	worldId: string | null | undefined;
	campaigns: readonly Pick<Campaign, "id" | "worldId" | "myRole">[];
}

/** Ids das campanhas (que o usuário conhece) no mesmo mundo da ativa. */
export function worldCampaignIds(scope: GalleryScope): Set<string> {
	const ids = new Set<string>();
	if (scope.activeCampaignId) ids.add(scope.activeCampaignId);
	if (!scope.worldId) return ids;
	for (const campaign of scope.campaigns) {
		if (campaign.worldId === scope.worldId) ids.add(campaign.id);
	}
	return ids;
}

/** A imagem pertence ao mundo da campanha ativa? */
export function isInGalleryWorld(
	asset: Pick<ImageAsset, "campaignId" | "worldId">,
	scope: GalleryScope,
	campaignIds: Set<string> = worldCampaignIds(scope),
): boolean {
	if (scope.worldId && asset.worldId) return asset.worldId === scope.worldId;
	return campaignIds.has(asset.campaignId);
}

/** Papel do usuário na campanha dona da imagem (as regras de RLS são por campanha). */
export function roleForAsset(
	asset: Pick<ImageAsset, "campaignId">,
	campaigns: GalleryScope["campaigns"],
): MembershipRole | undefined {
	return campaigns.find((campaign) => campaign.id === asset.campaignId)?.myRole;
}

export function isVttMapAsset(asset: Pick<ImageAsset, "url">): boolean {
	return asset.url.includes(`/${MAP_STORAGE_FOLDER}/`);
}

function matchesFilter(asset: ImageAsset, filter: GalleryFilter): boolean {
	switch (filter) {
		case "table":
			return !asset.isPrivate;
		case "private":
			return asset.isPrivate;
		case "vtt-maps":
			return isVttMapAsset(asset);
		default:
			return true;
	}
}

/**
 * Imagens do mundo que este usuário pode ver, já filtradas pela busca.
 * Privada só aparece para o mestre da campanha dona da imagem (a RLS também barra).
 */
export function visibleWorldAssets(
	assets: readonly ImageAsset[],
	scope: GalleryScope,
	query = "",
): ImageAsset[] {
	const campaignIds = worldCampaignIds(scope);
	const normalizedQuery = query.trim().toLowerCase();
	return assets.filter((asset) => {
		if (!isInGalleryWorld(asset, scope, campaignIds)) return false;
		if (asset.isPrivate && roleForAsset(asset, scope.campaigns) !== "owner") {
			return false;
		}
		if (!normalizedQuery) return true;
		return asset.name.toLowerCase().includes(normalizedQuery);
	});
}

export function countGalleryFilters(
	assets: readonly ImageAsset[],
): Record<GalleryFilter, number> {
	const counts: Record<GalleryFilter, number> = {
		all: 0,
		table: 0,
		private: 0,
		"vtt-maps": 0,
	};
	for (const asset of assets) {
		counts.all += 1;
		if (asset.isPrivate) counts.private += 1;
		else counts.table += 1;
		if (isVttMapAsset(asset)) counts["vtt-maps"] += 1;
	}
	return counts;
}

function assetTime(asset: ImageAsset): number {
	return asset.updatedAt ?? asset.createdAt;
}

export function selectGalleryAssets(
	assets: readonly ImageAsset[],
	filter: GalleryFilter,
	sort: GallerySort,
): ImageAsset[] {
	const filtered = assets.filter((asset) => matchesFilter(asset, filter));
	return filtered.sort((a, b) => {
		if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
		if (sort === "oldest") return assetTime(a) - assetTime(b);
		return assetTime(b) - assetTime(a);
	});
}
