import type { StateCreator } from "zustand";
import {
	canWriteImageLibrary,
	describeImageAssetSyncError,
	resolveImageAssetPrivacy,
} from "../image-asset-privacy";
import { imageStorage } from "../image-storage";
import {
	createRemoteImageAsset,
	deleteRemoteImageAsset,
	loadRemoteImageAssets,
	updateRemoteImageAsset,
} from "../remote-store";
import { remoteErrorMessage } from "./helpers";
import type { ImageAsset, ImageAssetSyncOptions, RPGState } from "./types";

export interface ImageLibrarySlice {
	imageAssets: ImageAsset[];
	loadImageAssets: () => Promise<void>;
	addImageAsset: (
		asset: Partial<Omit<ImageAsset, "id" | "createdAt" | "campaignId">>,
		options?: ImageAssetSyncOptions,
	) => ImageAsset | null;
	updateImageAsset: (
		id: string,
		asset: Partial<Pick<ImageAsset, "name" | "isPrivate">>,
		options?: ImageAssetSyncOptions,
	) => void;
	removeImageAsset: (id: string, options?: ImageAssetSyncOptions) => void;
}

export const createImageLibrarySlice: StateCreator<
	RPGState,
	[],
	[],
	ImageLibrarySlice
> = (set, get) => ({
	imageAssets: [],

	loadImageAssets: async () => {
		const campaignId = get().activeCampaignId;
		if (!campaignId) return;

		try {
			const imageAssets = await loadRemoteImageAssets(campaignId);
			set({ imageAssets, syncError: null });
		} catch (error) {
			set({ syncError: remoteErrorMessage(error) });
		}
	},

	addImageAsset: (asset, options) => {
		const campaignId = get().activeCampaignId;
		if (!campaignId || !asset.url) return null;
		const role = get().campaigns.find((c) => c.id === campaignId)?.myRole;
		// Jogador não grava na Biblioteca (RLS); a imagem continua no lugar onde foi usada.
		if (!canWriteImageLibrary(role)) return null;

		const created: ImageAsset = {
			id: crypto.randomUUID(),
			campaignId,
			createdBy: asset.createdBy ?? "",
			name: asset.name?.trim() || "Imagem sem nome",
			url: asset.url,
			storageKey: asset.storageKey,
			mimeType: asset.mimeType ?? "image/webp",
			sizeBytes: asset.sizeBytes ?? 0,
			width: asset.width,
			height: asset.height,
			isPrivate: resolveImageAssetPrivacy(role, asset.isPrivate),
			createdAt: Date.now(),
		};

		set((state) => ({
			imageAssets: [created, ...state.imageAssets],
			syncError: null,
		}));

		void createRemoteImageAsset(created, campaignId).catch((error) => {
			set((state) => ({
				imageAssets: state.imageAssets.filter((item) => item.id !== created.id),
				syncError: remoteErrorMessage(error),
			}));
			options?.onSyncError?.(describeImageAssetSyncError(error, "create"));
		});

		return created;
	},

	updateImageAsset: (id, asset, options) => {
		const previous = get().imageAssets.find((item) => item.id === id);
		const patch: Partial<Pick<ImageAsset, "name" | "isPrivate">> = {};
		if (typeof asset.name === "string") patch.name = asset.name.trim();
		if (typeof asset.isPrivate === "boolean") patch.isPrivate = asset.isPrivate;
		if (Object.keys(patch).length === 0) return;

		set((state) => ({
			imageAssets: state.imageAssets.map((item) =>
				item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item,
			),
			syncError: null,
		}));

		void updateRemoteImageAsset(id, patch).catch((error) => {
			set((state) => ({
				imageAssets: previous
					? state.imageAssets.map((item) => (item.id === id ? previous : item))
					: state.imageAssets,
				syncError: remoteErrorMessage(error),
			}));
			options?.onSyncError?.(describeImageAssetSyncError(error, "update"));
		});
	},

	removeImageAsset: (id, options) => {
		const asset = get().imageAssets.find((item) => item.id === id);
		if (!asset) return;

		set((state) => ({
			imageAssets: state.imageAssets.filter((item) => item.id !== id),
			syncError: null,
		}));

		void Promise.all([
			deleteRemoteImageAsset(id),
			imageStorage.delete(asset.url).catch(() => undefined),
		]).catch((error) => {
			set((state) => ({
				imageAssets: [asset, ...state.imageAssets],
				syncError: remoteErrorMessage(error),
			}));
			options?.onSyncError?.(describeImageAssetSyncError(error, "delete"));
		});
	},
});
