import { ImagePlus } from "lucide-react";
import { useId, useState } from "react";
import { ImageCropDialog } from "@/components/image-crop-dialog";
import {
	defaultTablePhotoConfig,
	readRemoteAvatarUrl,
	resolveTablePhoto,
	TABLE_PHOTO_REJECTED_URL,
	type TablePhoto,
	type TablePhotoConfig,
	type TablePhotoMode,
	tablePhotoInitials,
} from "@/lib/account/table-photo";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 8 * 1024 * 1024;

interface TablePhotoCardProps {
	name: string;
	metadata: unknown;
	color: string;
	config?: TablePhotoConfig;
	onSave: (mode: TablePhotoMode, url: string | null) => Promise<string | null>;
	onUpload: (file: File) => Promise<string>;
}

const choiceClass = (selected: boolean) =>
	cn(
		"inline-flex h-11 shrink-0 cursor-pointer select-none items-center rounded-full border px-3.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.98] focus-within:ring-2 focus-within:ring-primary",
		selected
			? "border-primary/40 bg-primary/15 text-foreground"
			: "border-border/70 bg-card-elevated text-muted-foreground [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
	);

export function TablePhotoCard({
	name,
	metadata,
	color,
	config,
	onSave,
	onUpload,
}: TablePhotoCardProps) {
	const photoConfig = config ?? defaultTablePhotoConfig();
	const resolved = resolveTablePhoto(metadata, photoConfig);
	const [pending, setPending] = useState<TablePhoto | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [cropSrc, setCropSrc] = useState<string | null>(null);
	const headingId = useId();
	const inputId = useId();
	const errorId = useId();

	if (
		pending &&
		pending.mode === resolved.mode &&
		pending.url === resolved.url
	) {
		setPending(null);
	}
	const shown = pending ?? resolved;
	const initials = tablePhotoInitials(name);

	async function choose(mode: TablePhotoMode, url: string | null) {
		if (uploading || (shown.mode === mode && shown.url === url)) return;
		setError(null);
		setPending({ ...resolved, mode, url });
		const message = await onSave(mode, url);
		if (message) {
			setPending(null);
			setError(message);
		}
	}

	function closeCrop() {
		if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
		setCropSrc(null);
	}

	function pickFile(file: File) {
		if (!file.type.startsWith("image/")) {
			setError("Escolha um arquivo de imagem.");
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			setError("Essa imagem passa de 8 MB.");
			return;
		}
		setError(null);
		if (cropSrc?.startsWith("blob:")) URL.revokeObjectURL(cropSrc);
		setCropSrc(URL.createObjectURL(file));
	}

	async function send(file: File) {
		if (!file.type.startsWith("image/")) {
			setError("Escolha um arquivo de imagem.");
			return;
		}
		if (file.size > MAX_FILE_BYTES) {
			setError("Essa imagem passa de 8 MB.");
			return;
		}
		setError(null);
		setUploading(true);
		try {
			const uploaded = await onUpload(file);
			const allowed = readRemoteAvatarUrl(uploaded, photoConfig);
			if (!allowed) {
				setError(TABLE_PHOTO_REJECTED_URL);
				return;
			}
			setPending({
				...resolved,
				mode: "custom",
				url: allowed,
				customUrl: allowed,
			});
			const message = await onSave("custom", allowed);
			if (message) {
				setPending(null);
				setError(message);
			}
		} catch (caught) {
			setError(
				caught instanceof Error
					? caught.message
					: "Não foi possível enviar a imagem.",
			);
		} finally {
			setUploading(false);
		}
	}

	return (
		<section
			aria-labelledby={headingId}
			aria-busy={uploading}
			className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5"
		>
			<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
				Na mesa
			</p>
			<h2
				id={headingId}
				className="font-display mt-1 text-xl font-bold text-foreground"
			>
				Foto na mesa
			</h2>
			<p className="mt-1 text-[13px] text-muted-foreground">
				O que os outros veem no canto da mesa.
			</p>

			<div className="mt-4 flex items-center gap-4">
				<div
					style={{
						borderColor: color,
						backgroundColor: shown.url ? undefined : `${color}33`,
						color,
					}}
					className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-card-elevated"
				>
					{shown.url ? (
						<img
							src={shown.url}
							alt="Prévia da foto na mesa"
							referrerPolicy="no-referrer"
							className="h-full w-full object-cover"
						/>
					) : (
						<span className="text-base font-semibold">{initials}</span>
					)}
				</div>

				<form
					className="flex min-w-0 flex-1 flex-col gap-3"
					onSubmit={(event) => event.preventDefault()}
				>
					<fieldset className="flex flex-wrap gap-2">
						<legend className="sr-only">Foto na mesa</legend>
						{resolved.googleUrl ? (
							<label
								className={cn(
									choiceClass(shown.mode === "google"),
									uploading && "pointer-events-none opacity-50",
								)}
							>
								<input
									type="radio"
									name={headingId}
									checked={shown.mode === "google"}
									disabled={uploading}
									onChange={() => void choose("google", null)}
									className="sr-only text-base"
								/>
								Foto do Google
							</label>
						) : null}
						{resolved.customUrl ? (
							<label
								className={cn(
									choiceClass(shown.mode === "custom"),
									uploading && "pointer-events-none opacity-50",
								)}
							>
								<input
									type="radio"
									name={headingId}
									checked={shown.mode === "custom"}
									disabled={uploading}
									onChange={() => void choose("custom", resolved.customUrl)}
									className="sr-only text-base"
								/>
								Foto enviada
							</label>
						) : null}
						<label
							className={cn(
								choiceClass(shown.mode === "initials"),
								uploading && "pointer-events-none opacity-50",
							)}
						>
							<input
								type="radio"
								name={headingId}
								checked={shown.mode === "initials"}
								disabled={uploading}
								onChange={() => void choose("initials", null)}
								className="sr-only text-base"
							/>
							Só iniciais
						</label>
					</fieldset>

					<div className="flex flex-wrap items-center gap-2">
						<label
							htmlFor={inputId}
							aria-disabled={uploading}
							className={cn(
								"inline-flex h-11 cursor-pointer select-none items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[background-color,transform] duration-150 ease-out active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-primary/90",
								uploading && "pointer-events-none opacity-50",
							)}
						>
							<ImagePlus aria-hidden className="size-4" />
							{uploading ? "Enviando…" : "Enviar e recortar"}
						</label>
						<input
							id={inputId}
							type="file"
							accept="image/*"
							disabled={uploading}
							spellCheck={false}
							autoComplete="off"
							aria-describedby={error ? errorId : undefined}
							onChange={(event) => {
								const file = event.target.files?.[0];
								event.target.value = "";
								if (file) pickFile(file);
							}}
							className="sr-only text-base"
						/>
						{error ? (
							<p
								id={errorId}
								role="alert"
								className="text-sm font-semibold text-destructive"
							>
								{error}
							</p>
						) : null}
					</div>
				</form>
			</div>
			<ImageCropDialog
				open={cropSrc !== null}
				onOpenChange={(open) => {
					if (!open) closeCrop();
				}}
				imageSrc={cropSrc}
				title="Recortar foto da mesa"
				description="Arraste e use o zoom. O círculo é o que os outros vão ver."
				aspect={1}
				cropShape="round"
				busy={uploading}
				onApply={async (blob) => {
					const file = new File([blob], "foto-mesa.webp", {
						type: blob.type || "image/webp",
					});
					await send(file);
				}}
			/>
		</section>
	);
}
