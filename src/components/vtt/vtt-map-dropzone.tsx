import {
	Images,
	Loader2,
	Map as MapIcon,
	Maximize2,
	UploadCloud,
	X,
} from "lucide-react";
import {
	type DragEvent,
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { ImageLibraryPickerDialog } from "@/components/image-library-picker-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth";
import { readImageDimensions } from "@/lib/image-metadata";
import { imageStorage } from "@/lib/image-storage";
import { type ImageAsset, useImageAssetLookup, useRPGStore } from "@/lib/store";
import { isUploadAbort } from "@/lib/upload-error";
import { cn } from "@/lib/utils";
import {
	dragHasFiles,
	firstFile,
	MAP_ACCEPT_ATTRIBUTE,
	MAP_MAX_DIMENSION,
	MAP_QUALITY,
	MAP_STORAGE_FOLDER,
	mapSceneSize,
	sceneNameFromFile,
	validateMapFile,
} from "@/lib/vtt/map-upload";

/** A map ready to be used by a scene: stored URL plus its drawn size. */
export interface VTTMapImage {
	url: string;
	width: number;
	height: number;
	name: string;
}

type UploadState =
	| { status: "idle" }
	| { status: "uploading"; fileName: string }
	| { status: "error"; message: string };

function readUrlDimensions(
	url: string,
): Promise<{ width?: number; height?: number }> {
	return new Promise((resolve) => {
		const image = new Image();
		image.onload = () =>
			resolve({ width: image.naturalWidth, height: image.naturalHeight });
		image.onerror = () => resolve({});
		image.src = url;
	});
}

/**
 * Upload of one map file to the campaign storage (the same Edge Function and
 * image library as the rest of Arkhiveon). `cancel()` aborts the request and
 * nothing reaches the library or the scene.
 */
export function useMapUpload(
	campaignId: string,
	onReady: (map: VTTMapImage) => void | Promise<void>,
) {
	const { session } = useAuth();
	const toast = useToast();
	const addImageAsset = useRPGStore((s) => s.addImageAsset);
	const [state, setState] = useState<UploadState>({ status: "idle" });
	const controllerRef = useRef<AbortController | null>(null);

	const cancel = useCallback(() => {
		controllerRef.current?.abort();
		controllerRef.current = null;
		setState({ status: "idle" });
	}, []);

	// Leaving the dialog or the drawer mid-upload cancels it.
	useEffect(() => () => controllerRef.current?.abort(), []);

	async function upload(file: File | null) {
		if (controllerRef.current) return;
		const check = validateMapFile(file);
		if (!check.ok || !file) {
			setState({
				status: "error",
				message: check.ok ? "Nenhum arquivo recebido." : check.message,
			});
			return;
		}
		const controller = new AbortController();
		controllerRef.current = controller;
		setState({ status: "uploading", fileName: file.name });
		try {
			const dimensions = await readImageDimensions(file);
			if (!dimensions.width || !dimensions.height) {
				throw new Error(
					`Não foi possível ler “${file.name}”. O arquivo pode estar corrompido.`,
				);
			}
			if (controller.signal.aborted) return;
			const url = await imageStorage.upload(file, {
				folder: MAP_STORAGE_FOLDER,
				campaignId,
				maxDimension: MAP_MAX_DIMENSION,
				quality: MAP_QUALITY,
				signal: controller.signal,
			});
			if (controller.signal.aborted) return;
			const size = mapSceneSize(dimensions.width, dimensions.height);
			const name = sceneNameFromFile(file.name) || "Mapa";
			addImageAsset(
				{
					createdBy: session?.user.id ?? "",
					name,
					url,
					mimeType: "image/webp",
					sizeBytes: file.size,
					width: size.width,
					height: size.height,
				},
				{ onSyncError: toast.error },
			);
			await onReady({ url, ...size, name });
			if (controller.signal.aborted) return;
			setState({ status: "idle" });
		} catch (error) {
			if (controller.signal.aborted || isUploadAbort(error)) return;
			setState({
				status: "error",
				message:
					error instanceof Error
						? error.message
						: "Não foi possível enviar o mapa. Tente de novo.",
			});
		} finally {
			if (controllerRef.current === controller) controllerRef.current = null;
		}
	}

	async function chooseLibraryAsset(asset: ImageAsset) {
		setState({ status: "uploading", fileName: asset.name });
		try {
			const dimensions =
				asset.width && asset.height
					? { width: asset.width, height: asset.height }
					: await readUrlDimensions(asset.url);
			await onReady({
				url: asset.url,
				...mapSceneSize(dimensions.width, dimensions.height),
				name: asset.name,
			});
			setState({ status: "idle" });
		} catch (error) {
			setState({
				status: "error",
				message:
					error instanceof Error
						? error.message
						: "Não foi possível usar esta imagem.",
			});
		}
	}

	return {
		state,
		isUploading: state.status === "uploading",
		upload,
		chooseLibraryAsset,
		cancel,
		clearError: () => setState({ status: "idle" }),
	};
}

type MapUpload = ReturnType<typeof useMapUpload>;

interface VTTMapDropzoneProps {
	campaignId: string;
	upload: MapUpload;
	/** Map already chosen (shown as preview with Trocar/Remover). */
	value?: VTTMapImage | null;
	onRemove?: () => void;
	/** Accessible name of the drop area. */
	label?: string;
	/**
	 * Abre o mapa atual em tela cheia (só o mestre, na aba Mapa). Sem esta
	 * prop a miniatura continua só imagem.
	 */
	onViewFullscreen?: (opener: HTMLElement) => void;
	/** Nome usado no aria-label do gatilho de tela cheia. */
	viewName?: string;
}

export function VTTMapDropzone({
	campaignId,
	upload,
	value,
	onRemove,
	label = "Enviar mapa",
	onViewFullscreen,
	viewName,
}: VTTMapDropzoneProps) {
	const inputId = useId();
	const hintId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [libraryOpen, setLibraryOpen] = useState(false);
	const loadImageAssets = useRPGStore((s) => s.loadImageAssets);
	const imageAssetLookup = useImageAssetLookup();
	const libraryAssets = useMemo(
		() =>
			Array.from(imageAssetLookup.values()).filter(
				(asset) => asset.campaignId === campaignId,
			),
		[imageAssetLookup, campaignId],
	);
	const { state, isUploading } = upload;

	function pickFile() {
		if (!isUploading) inputRef.current?.click();
	}

	function handleDragOver(event: DragEvent<HTMLElement>) {
		if (!dragHasFiles(event.dataTransfer.types)) return;
		event.preventDefault();
		event.dataTransfer.dropEffect = isUploading ? "none" : "copy";
		if (!isUploading) setIsDragging(true);
	}

	function handleDragLeave(event: DragEvent<HTMLElement>) {
		if (!event.currentTarget.contains(event.relatedTarget as Node)) {
			setIsDragging(false);
		}
	}

	function handleDrop(event: DragEvent<HTMLElement>) {
		if (!dragHasFiles(event.dataTransfer.types)) return;
		event.preventDefault();
		setIsDragging(false);
		if (!isUploading) void upload.upload(firstFile(event.dataTransfer.files));
	}

	return (
		<div className="space-y-2">
			{value && !isUploading ? (
				<div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card-elevated p-2">
					{onViewFullscreen ? (
						<Tooltip>
							<TooltipTrigger
								render={
									<button
										type="button"
										onClick={(event) => onViewFullscreen(event.currentTarget)}
										aria-label={`Ver mapa de ${viewName ?? value.name} em tela cheia`}
										aria-haspopup="dialog"
										className="group relative size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
									/>
								}
							>
								<img
									src={value.url}
									alt=""
									decoding="async"
									className="h-full w-full object-cover"
								/>
								<span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition duration-150 group-hover:bg-black/50 group-hover:opacity-100 group-focus-visible:bg-black/50 group-focus-visible:opacity-100">
									<Maximize2 className="h-4 w-4 drop-shadow" aria-hidden />
								</span>
							</TooltipTrigger>
							<TooltipContent>Ver em tela cheia</TooltipContent>
						</Tooltip>
					) : (
						<img
							src={value.url}
							alt={`Mapa ${value.name}`}
							decoding="async"
							className="size-14 shrink-0 rounded-lg border border-border/70 object-cover"
						/>
					)}
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold">{value.name}</p>
						<p className="text-xs tabular-nums text-muted-foreground">
							{value.width} × {value.height} px
						</p>
					</div>
					{onRemove && (
						<Button
							type="button"
							variant="ghost"
							aria-label="Remover mapa"
							className="size-11 shrink-0 px-0"
							onClick={onRemove}
						>
							<X className="size-4" />
						</Button>
					)}
				</div>
			) : null}

			<section
				aria-label={label}
				aria-describedby={hintId}
				aria-busy={isUploading}
				data-dragging={isDragging || undefined}
				onDragOver={handleDragOver}
				onDragEnter={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={cn(
					"flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/80 bg-card/80 p-4 text-center transition-[border-color,background-color] duration-150",
					isDragging && "border-primary/60 bg-primary/10",
				)}
			>
				<span className="flex size-11 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
					{isUploading ? (
						<Loader2 className="size-5 animate-spin" />
					) : isDragging ? (
						<MapIcon className="size-5" />
					) : (
						<UploadCloud className="size-5" />
					)}
				</span>
				<span className="space-y-1">
					<span className="block font-display text-sm font-bold text-foreground">
						{isUploading ? (
							"Enviando mapa…"
						) : isDragging ? (
							"Solte para usar como mapa"
						) : value ? (
							"Trocar o mapa"
						) : (
							<>
								<span className="hidden sm:inline">Arraste o mapa aqui</span>
								<span className="sm:hidden">Escolha o mapa</span>
							</>
						)}
					</span>
					<span
						id={hintId}
						className="block text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]"
					>
						{state.status === "uploading"
							? state.fileName
							: "PNG, JPG ou WebP até 20 MB. Fica salvo na Biblioteca de imagens da campanha."}
					</span>
				</span>
				<div className="flex w-full flex-wrap justify-center gap-2">
					{isUploading ? (
						<Button
							type="button"
							variant="outline"
							className="h-11 px-4"
							onClick={upload.cancel}
						>
							<X className="size-4" />
							Cancelar envio
						</Button>
					) : (
						<>
							<Button
								type="button"
								variant="outline"
								className="h-11 min-w-36 flex-1 px-4"
								onClick={pickFile}
							>
								<UploadCloud className="size-4" />
								Escolher arquivo
							</Button>
							<Button
								type="button"
								variant="outline"
								className="h-11 min-w-36 flex-1 px-4"
								onClick={() => {
									void loadImageAssets();
									setLibraryOpen(true);
								}}
							>
								<Images className="size-4" />
								Da biblioteca
							</Button>
						</>
					)}
				</div>
				<input
					ref={inputRef}
					id={inputId}
					type="file"
					accept={MAP_ACCEPT_ATTRIBUTE}
					className="hidden"
					aria-label="Arquivo do mapa"
					onChange={(event) => {
						const file = firstFile(event.currentTarget.files);
						event.currentTarget.value = "";
						void upload.upload(file);
					}}
				/>
			</section>

			{state.status === "error" && (
				<p role="alert" className="text-sm text-destructive">
					{state.message}
				</p>
			)}

			{libraryOpen ? (
				<ImageLibraryPickerDialog
					open={libraryOpen}
					onOpenChange={setLibraryOpen}
					assets={libraryAssets}
					onSelect={(asset) => {
						setLibraryOpen(false);
						void upload.chooseLibraryAsset(asset);
					}}
				/>
			) : null}
		</div>
	);
}
