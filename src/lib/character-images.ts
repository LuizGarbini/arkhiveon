import type { Character, ImageAsset, MembershipRole } from "./store";

export function resolveCharacterImageUrl(
	character: Character,
	imageAssets: ImageAsset[],
	role?: MembershipRole,
): string {
	if (character.imageAssetId) {
		const asset = imageAssets.find(
			(item) => item.id === character.imageAssetId,
		);
		if (!asset) return "";
		if (asset.isPrivate && role !== "owner") return "";
		return asset.url;
	}

	return character.imageUrl;
}

export function isCharacterImageHidden(
	character: Character,
	imageAssets: ImageAsset[],
	role?: MembershipRole,
): boolean {
	if (!character.imageAssetId) return false;
	const asset = imageAssets.find((item) => item.id === character.imageAssetId);
	return !asset || (asset.isPrivate && role !== "owner");
}
