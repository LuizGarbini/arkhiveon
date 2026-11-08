import { canViewImageAsset } from "./image-visibility";
import type { ImageAsset, MembershipRole } from "./store/types";

export interface EntityImageSource {
	imageUrl: string;
	imageAssetId?: string;
}

type ImageAssetLookup = ImageAsset[] | Map<string, ImageAsset>;

export type { ImageAssetLookup };

function findImageAsset(
	lookup: ImageAssetLookup,
	assetId: string,
): ImageAsset | undefined {
	if (lookup instanceof Map) {
		return lookup.get(assetId);
	}
	return lookup.find((item) => item.id === assetId);
}

export function resolveEntityImageUrl(
	source: EntityImageSource,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
	userId?: string | null,
): string {
	if (source.imageAssetId) {
		const asset = findImageAsset(imageAssets, source.imageAssetId);
		if (!asset) return "";
		if (!canViewImageAsset(asset, { role, userId })) return "";
		return asset.url;
	}

	return source.imageUrl;
}

export function isEntityImageHidden(
	source: EntityImageSource,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
	userId?: string | null,
): boolean {
	if (!source.imageAssetId) return false;
	const asset = findImageAsset(imageAssets, source.imageAssetId);
	return !asset || !canViewImageAsset(asset, { role, userId });
}
