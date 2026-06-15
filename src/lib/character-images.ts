import type { Character, MembershipRole } from "./store";
import {
	isEntityImageHidden,
	resolveEntityImageUrl,
	type EntityImageSource,
	type ImageAssetLookup,
} from "./entity-images";

export type { EntityImageSource };

export function resolveCharacterImageUrl(
	character: Character,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
): string {
	return resolveEntityImageUrl(character, imageAssets, role);
}

export function isCharacterImageHidden(
	character: Character,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
): boolean {
	return isEntityImageHidden(character, imageAssets, role);
}

export function resolveItemImageUrl(
	item: EntityImageSource,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
): string {
	return resolveEntityImageUrl(item, imageAssets, role);
}
