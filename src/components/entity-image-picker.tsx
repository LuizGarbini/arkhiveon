import { Crop, ImagePlus, Images, Loader2, Trash2 } from "lucide-react";
import {
	lazy,
	Suspense,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { FramedImage } from "@/components/framed-image";
import { ImageLibraryPickerDialog } from "@/components/image-library-picker-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
	cropAspectFromPreview,
	cropShapeFromPreview,
} from "@/lib/crop-preview";
import { resolveEntityImageUrl } from "@/lib/entity-images";
import type { ImageFraming } from "@/lib/image-framing";
import { readableFileName, readImageDimensions } from "@/lib/image-metadata";
import { imageStorage } from "@/lib/image-storage";
import {
	useActiveCampaignId,
	useActiveCampaignRole,
	useImageAssetLookup,
	useIsCampaignMaster,
	useRPGStore,
} from "@/lib/store";
import { cn } from "@/lib/utils";

const LazyImageCropDialog = lazy(() =>
	import("./image-crop-dialog").then((module) => ({
		default: module.ImageCropDialog,
	})),
);

export interface EntityImageValue extends ImageFraming {
	imageUrl: string;
	imageAssetId?: string;
}

interface EntityImagePickerProps {
	value: EntityImageValue;
	onChange: (patch: Partial<EntityImageValue>) => void;
	folder: string;
	libraryName?: string;
	campaignId?: string;
	uploadLabel?: string;
	previewShape?: "rounded" | "circle";
}

export function EntityImagePicker({
	value,
	onChange,
	folder,
	libraryName,
	campaignId,
	uploadLabel = "Imagem",
	previewShape = "rounded",
}: EntityImagePickerProps) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const { session } = useAuth();
	const activeCampaignId = useActiveCampaignId();
	const imageAssetLookup = useImageAssetLookup();
	const loadImageAssets = useRPGStore((s) => s.loadImageAssets);
	const addImageAsset = useRPGStore((s) => s.addImageAsset);
	const activeCampaignRole = useActiveCampaignRole();
	const isMaster = useIsCampaignMaster();
	const resolvedCampaignId = campaignId ?? activeCampaignId ?? undefined;

	const [cropOpen, setCropOpen] = useState(false);
	const [libraryOpen, setLibraryOpen] = useState(false);
	const [cropSource, setCropSource] = useState<string | null>(null);
	const [pendingFileName, setPendingFileName] = useState<string | null>(null);
	const [isUploading, setIsUploading] = useState(false);

	useEffect(() => {
		if (!resolvedCampaignId) return;
		void loadImageAssets();
	}, [loadImageAssets, resolvedCampaignId]);

	const visibleAssets = useMemo(
		() =>
			Array.from(imageAssetLookup.values()).filter(
				(asset) =>
					asset.campaignId === resolvedCampaignId &&
					(isMaster || !asset.isPrivate),
			),
		[imageAssetLookup, isMaster, resolvedCampaignId],
	);

	const previewUrl = resolveEntityImageUrl(
		value,
		imageAssetLookup,
		activeCampaignRole,
	);
	const hasPreview = Boolean(previewUrl);
	const shapeClass = previewShape === "circle" ? "rounded-full" : "rounded-2xl";

	function openCropper(src: string, fileName?: string) {
		setCropSource(src);
		setPendingFileName(fileName ?? null);
		setCropOpen(true);
	}

	function clearCropSource() {
		if (cropSource?.startsWith("blob:")) {
			URL.revokeObjectURL(cropSource);
		}
		setCropSource(null);
		setPendingFileName(null);
	}

	function handleCropClose(open: boolean) {
		setCropOpen(open);
		if (!open) clearCropSource();
	}

	async function handleFile(file: File) {
		if (!file.type.startsWith("image/")) return;
		if (file.size > 8 * 1024 * 1024) return;
		const objectUrl = URL.createObjectURL(file);
		openCropper(objectUrl, file.name);
	}

	async function applyCroppedBlob(blob: Blob) {
		if (!resolvedCampaignId) return;
		setIsUploading(true);
		try {
			const file = new File([blob], pendingFileName ?? "cropped.webp", {
				type: blob.type || "image/webp",
			});
			const dimensions = await readImageDimensions(file);
			const url = await imageStorage.upload(file, {
				folder,
				campaignId: resolvedCampaignId,
			});
			addImageAsset({
				createdBy: session?.user.id ?? "",
				name: libraryName?.trim() || readableFileName(file.name),
				url,
				mimeType: file.type || "image/webp",
				sizeBytes: file.size,
				width: dimensions.width,
				height: dimensions.height,
			});
			onChange({
				imageUrl: url,
				imageAssetId: "",
				imageFocusX: 50,
				imageFocusY: 50,
				imageZoom: 1,
			});
		} finally {
			setIsUploading(false);
			clearCropSource();
		}
	}

	function handleRecropCurrent() {
		if (!previewUrl) return;
		openCropper(previewUrl);
	}

	function handleRemove() {
		onChange({
			imageUrl: "",
			imageAssetId: "",
			imageFocusX: 50,
			imageFocusY: 50,
			imageZoom: 1,
		});
	}

	return (
		<div className="space-y-4">
			<p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
				{uploadLabel}
			</p>

			<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
				<div
					className={cn(
						"relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden border border-border/70 bg-card-elevated/40",
						shapeClass,
					)}
				>
					{hasPreview ? (
						<FramedImage src={previewUrl} alt={uploadLabel} framing={value} />
					) : (
						<ImagePlus className="h-8 w-8 text-muted-foreground/50" />
					)}
					{isUploading ? (
						<div className="absolute inset-0 flex items-center justify-center bg-black/45">
							<Loader2 className="h-6 w-6 animate-spin text-white" />
						</div>
					) : null}
				</div>

				<div className="flex flex-1 flex-wrap gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="gap-2"
						loading={isUploading}
						loadingText="Enviando..."
						onClick={() => inputRef.current?.click()}
					>
						<ImagePlus className="h-4 w-4" />
						Enviar imagem
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="gap-2"
						disabled={isUploading}
						onClick={() => setLibraryOpen(true)}
					>
						<Images className="h-4 w-4" />
						Biblioteca
					</Button>
					{hasPreview ? (
						<>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="gap-2"
								disabled={isUploading}
								onClick={handleRecropCurrent}
							>
								<Crop className="h-4 w-4" />
								Recortar
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="gap-2 text-muted-foreground hover:text-rose-300"
								disabled={isUploading}
								onClick={handleRemove}
							>
								<Trash2 className="h-4 w-4" />
								Remover
							</Button>
						</>
					) : null}
				</div>
			</div>

			<p className="text-[10px] leading-relaxed text-muted-foreground/80">
				Após enviar ou escolher da biblioteca, ajuste o recorte e o zoom no
				editor. JPG, PNG ou WebP — máx 8MB.
			</p>

			<input
				ref={inputRef}
				id={inputId}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if (file) void handleFile(file);
					event.target.value = "";
				}}
			/>

			{libraryOpen ? (
				<ImageLibraryPickerDialog
					open={libraryOpen}
					onOpenChange={setLibraryOpen}
					assets={visibleAssets}
					selectedAssetId={value.imageAssetId}
					onSelect={(asset) => openCropper(asset.url, asset.name)}
				/>
			) : null}

			{cropOpen ? (
				<Suspense fallback={null}>
					<LazyImageCropDialog
						open={cropOpen}
						onOpenChange={handleCropClose}
						imageSrc={cropSource}
						aspect={cropAspectFromPreview(previewShape)}
						cropShape={cropShapeFromPreview(previewShape)}
						busy={isUploading}
						onApply={applyCroppedBlob}
					/>
				</Suspense>
			) : null}
		</div>
	);
}
