import { Eye, LockKeyhole, Map as MapIcon } from "lucide-react";
import { isVttMapAsset } from "@/lib/image-gallery";
import type { ImageAsset } from "@/lib/store";
import { cn } from "@/lib/utils";

const BADGE =
	"inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] backdrop-blur select-none";

/** Selos "Mesa"/"Privada" e "Mapa VTT" usados no card e no lightbox. */
export function ImageAssetBadges({
	asset,
	className,
}: {
	asset: ImageAsset;
	className?: string;
}) {
	return (
		<span className={cn("flex flex-wrap items-center gap-1.5", className)}>
			<span
				className={cn(
					BADGE,
					asset.isPrivate
						? "border-amber-400/35 bg-amber-400/15 text-amber-200"
						: "border-emerald-400/30 bg-emerald-400/12 text-emerald-200",
				)}
			>
				{asset.isPrivate ? (
					<LockKeyhole className="h-3 w-3" />
				) : (
					<Eye className="h-3 w-3" />
				)}
				{asset.isPrivate ? "Privada" : "Mesa"}
			</span>
			{isVttMapAsset(asset) && (
				<span
					className={cn(BADGE, "border-primary/30 bg-primary/15 text-primary")}
				>
					<MapIcon className="h-3 w-3" />
					Mapa VTT
				</span>
			)}
		</span>
	);
}

export function formatBytes(bytes: number): string {
	if (!bytes) return "0 KB";
	const units = ["B", "KB", "MB", "GB"];
	const index = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = bytes / 1024 ** index;
	return `${value.toLocaleString("pt-BR", {
		maximumFractionDigits: index === 0 ? 0 : 1,
	})} ${units[index]}`;
}

/** "1200×1600 · 486 KB" */
export function formatAssetMeta(asset: ImageAsset): string {
	return asset.width && asset.height
		? `${asset.width}×${asset.height} · ${formatBytes(asset.sizeBytes)}`
		: formatBytes(asset.sizeBytes);
}
