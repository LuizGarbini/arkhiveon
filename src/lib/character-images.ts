import {
	type EntityImageSource,
	type ImageAssetLookup,
	isEntityImageHidden,
	resolveEntityImageUrl,
} from "./entity-images";
import type { MembershipRole } from "./store";

export type { EntityImageSource };

export function resolveCharacterImageUrl(
	character: EntityImageSource,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
	userId?: string | null,
): string {
	return resolveEntityImageUrl(character, imageAssets, role, userId);
}

export function isCharacterImageHidden(
	character: EntityImageSource,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
	userId?: string | null,
): boolean {
	return isEntityImageHidden(character, imageAssets, role, userId);
}

export function resolveItemImageUrl(
	item: EntityImageSource,
	imageAssets: ImageAssetLookup,
	role?: MembershipRole,
): string {
	return resolveEntityImageUrl(item, imageAssets, role);
}
