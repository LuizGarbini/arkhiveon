import { ImagePlus, Loader2, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { readableFileName, readImageDimensions } from "@/lib/image-metadata";
import { imageStorage, isImageUrl } from "@/lib/image-storage";
import { useRPGStore } from "@/lib/store";

interface ImageUploaderProps {
	value: string;
	onChange: (url: string) => void;
	folder?: string;
	campaignId?: string;
	libraryName?: string;
	label?: string;
	className?: string;
	/** dimensão de exibição (preview) */
	size?: "sm" | "md" | "lg";
	shape?: "rounded" | "circle";
}

const SIZE_MAP = {
	sm: "h-16 w-16",
	md: "h-24 w-24",
	lg: "h-32 w-32",
};

export function ImageUploader({
	value,
	onChange,
	folder,
	campaignId,
	libraryName,
	label = "Imagem",
	className = "",
	size = "md",
	shape = "rounded",
}: ImageUploaderProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const inputId = useId();
	const { session } = useAuth();
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const addImageAsset = useRPGStore((state) => state.addImageAsset);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const uploadCampaignId = campaignId ?? activeCampaignId ?? undefined;
	const hasImage = isImageUrl(value);
	const sizeClass = SIZE_MAP[size];
	const shapeClass = shape === "circle" ? "rounded-full" : "rounded-md";

	async function handleFile(file: File) {
		setError(null);
		if (!file.type.startsWith("image/")) {
			setError("Arquivo inválido. Use uma imagem.");
			return;
		}
		// limite básico de 8MB no input cru (depois redimensionamos)
		if (file.size > 8 * 1024 * 1024) {
			setError("Imagem muito grande (máx 8MB).");
			return;
		}
		setBusy(true);
		try {
			const dimensions = await readImageDimensions(file);
			const url = await imageStorage.upload(file, {
				folder,
				campaignId: uploadCampaignId,
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
			onChange(url);
		} catch (e) {
			setError(e instanceof Error ? e.message : "Falha no upload.");
		} finally {
			setBusy(false);
		}
	}

	function clear() {
		onChange("");
		setError(null);
		if (inputRef.current) inputRef.current.value = "";
	}

	return (
		<div className={`flex flex-col gap-2 ${className}`}>
			<label
				htmlFor={inputId}
				className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
			>
				{label}
			</label>
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					disabled={busy}
					className={`group relative flex ${sizeClass} ${shapeClass} shrink-0 items-center justify-center overflow-hidden border border-dashed border-border bg-card-elevated/40 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50 disabled:pointer-events-none`}
					aria-label={hasImage ? "Trocar imagem" : "Adicionar imagem"}
				>
					{hasImage ? (
						<>
							<img
								src={value}
								alt={label}
								decoding="async"
								className="h-full w-full object-cover"
							/>
							<div className="absolute inset-0 hidden items-center justify-center bg-black/50 text-white group-hover:flex">
								<ImagePlus className="h-4 w-4" />
							</div>
						</>
					) : busy ? (
						<Loader2 className="h-5 w-5 animate-spin" />
					) : (
						<ImagePlus className="h-5 w-5" />
					)}
				</button>

				<div className="flex flex-1 flex-col gap-1.5 text-[12px] text-muted-foreground">
					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => inputRef.current?.click()}
							className="rounded border border-border bg-card-elevated/60 px-2 py-1 text-[11px] font-medium text-foreground transition-colors hover:border-border-hover"
							disabled={busy}
						>
							{hasImage ? "Trocar" : "Selecionar imagem"}
						</button>
						{hasImage && (
							<button
								type="button"
								onClick={clear}
								className="flex items-center gap-1 rounded border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-rose-500/40 hover:text-rose-300"
							>
								<X className="h-3 w-3" /> Remover
							</button>
						)}
					</div>
					<p className="text-[10px] text-muted-foreground/70">
						JPG, PNG ou WebP — máx 8MB. Redimensionada para 640px.
					</p>
					{error && <p className="text-[11px] text-rose-300">{error}</p>}
				</div>
			</div>

			<input
				ref={inputRef}
				id={inputId}
				type="file"
				accept="image/*"
				className="hidden"
				onChange={(e) => {
					const f = e.target.files?.[0];
					if (f) handleFile(f);
				}}
			/>
		</div>
	);
}
