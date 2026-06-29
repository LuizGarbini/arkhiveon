import { createFileRoute } from "@tanstack/react-router";
import {
	Check,
	Eye,
	ImageIcon,
	Images,
	Loader2,
	LockKeyhole,
	Pencil,
	Search,
	Trash2,
	UnlockKeyhole,
	UploadCloud,
	X,
} from "lucide-react";
import {
	type ChangeEvent,
	type DragEvent,
	type FormEvent,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import { readableFileName, readImageDimensions } from "@/lib/image-metadata";
import { imageStorage } from "@/lib/image-storage";
import type { ImageAsset } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/images")({
	component: ImagesRoute,
});

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const UPLOAD_DELAY_MS = 5200;

function ImagesRoute() {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const toast = useToast();
	const { session } = useAuth();
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const activeCampaign = useRPGStore((state) =>
		state.campaigns.find((campaign) => campaign.id === state.activeCampaignId),
	);
	const imageAssets = useRPGStore((state) => state.imageAssets);
	const loadImageAssets = useRPGStore((state) => state.loadImageAssets);
	const addImageAsset = useRPGStore((state) => state.addImageAsset);
	const updateImageAsset = useRPGStore((state) => state.updateImageAsset);
	const removeImageAsset = useRPGStore((state) => state.removeImageAsset);
	const [query, setQuery] = useState("");
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadingName, setUploadingName] = useState<string | null>(null);

	const isMaster = activeCampaign?.myRole === "owner";
	const canUpload =
		activeCampaign?.myRole === "owner" || activeCampaign?.myRole === "editor";

	useEffect(() => {
		if (!activeCampaignId) return;
		void loadImageAssets();
	}, [activeCampaignId, loadImageAssets]);

	const visibleAssets = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return imageAssets.filter((asset) => {
			if (asset.campaignId !== activeCampaignId) return false;
			if (!isMaster && asset.isPrivate) return false;
			if (!normalizedQuery) return true;
			return asset.name.toLowerCase().includes(normalizedQuery);
		});
	}, [activeCampaignId, imageAssets, isMaster, query]);

	async function uploadFiles(fileList: FileList | File[]) {
		if (!canUpload || !activeCampaignId) {
			toast.error({
				title: "Upload bloqueado",
				description: "Apenas mestre e editores podem adicionar imagens.",
			});
			return;
		}

		const files = Array.from(fileList).filter((file) =>
			file.type.startsWith("image/"),
		);

		if (files.length === 0) {
			toast.error({
				title: "Arquivo inválido",
				description: "Selecione um arquivo de imagem.",
			});
			return;
		}

		setIsUploading(true);
		let uploadedCount = 0;

		try {
			for (const [index, file] of files.entries()) {
				if (file.size > MAX_FILE_SIZE) {
					toast.error({
						title: "Imagem muito grande",
						description: `${file.name} passa de 8MB.`,
					});
					continue;
				}

				setUploadingName(file.name);
				const dimensions = await readImageDimensions(file);
				const url = await imageStorage.upload(file, {
					folder: "library",
					campaignId: activeCampaignId,
					maxDimension: 1600,
					quality: 0.82,
				});

				const created = addImageAsset({
					createdBy: session?.user.id ?? "",
					name: readableFileName(file.name),
					url,
					mimeType: file.type,
					sizeBytes: file.size,
					width: dimensions.width,
					height: dimensions.height,
				});

				if (created) uploadedCount += 1;
				if (index < files.length - 1) await delay(UPLOAD_DELAY_MS);
			}
		} catch (error) {
			toast.error({
				title: "Falha no upload",
				description:
					error instanceof Error
						? error.message
						: "Não foi possível enviar a imagem.",
			});
		} finally {
			setIsUploading(false);
			setUploadingName(null);
			if (inputRef.current) inputRef.current.value = "";
		}

		if (uploadedCount > 0) {
			toast.success({
				title: "Biblioteca atualizada",
				description:
					uploadedCount === 1
						? "Imagem adicionada à campanha."
						: `${uploadedCount} imagens adicionadas à campanha.`,
			});
		}
	}

	function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
		const files = event.currentTarget.files;
		if (files) void uploadFiles(files);
	}

	function handleDragOver(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		if (canUpload) setIsDragging(true);
	}

	function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
		if (!event.currentTarget.contains(event.relatedTarget as Node)) {
			setIsDragging(false);
		}
	}

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		setIsDragging(false);
		void uploadFiles(event.dataTransfer.files);
	}

	return (
		<div className="w-full">
			<PageHeader
				title="Imagens"
				description="Biblioteca visual da campanha para reutilizar retratos, mapas e referências nas fichas."
				Icon={Images}
				iconColor="text-sky-300"
				eyebrow="Arquivos"
				count={visibleAssets.length}
				action={
					<Button
						type="button"
						size="sm"
						className="gap-2"
						loading={isUploading}
						loadingText="Enviando..."
						disabled={!canUpload}
						onClick={() => inputRef.current?.click()}
					>
						<UploadCloud className="h-3.5 w-3.5" />
						Enviar
					</Button>
				}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<label
					htmlFor={canUpload ? inputId : undefined}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					aria-disabled={!canUpload || isUploading}
					className={cn(
						"grid min-h-36 place-items-center rounded-2xl border border-dashed border-border/80 bg-card/80 p-5 text-center shadow-sm shadow-black/5 transition-[border-color,background-color,box-shadow]",
						canUpload && !isUploading && "cursor-pointer",
						isDragging &&
							"border-primary/60 bg-primary/10 shadow-lg shadow-primary/5",
						!canUpload && "opacity-65",
					)}
				>
					<input
						ref={inputRef}
						id={inputId}
						type="file"
						accept="image/*"
						multiple
						className="hidden"
						onChange={handleInputChange}
						disabled={!canUpload || isUploading}
					/>
					<span className="flex w-full max-w-xl flex-col items-center gap-3">
						<span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
							{isUploading ? (
								<Loader2 className="h-5 w-5 animate-spin" />
							) : (
								<UploadCloud className="h-5 w-5" />
							)}
						</span>
						<span className="font-display text-lg font-bold text-foreground">
							{isUploading ? "Enviando imagem" : "Soltar imagens"}
						</span>
						<span className="text-[12px] leading-relaxed text-muted-foreground">
							{canUpload
								? (uploadingName ?? "JPG, PNG ou WebP até 8MB.")
								: "Apenas mestre e editores podem adicionar arquivos."}
						</span>
					</span>
				</label>

				<div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm shadow-black/5">
					<div className="relative flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="search"
							aria-label="Filtrar imagens"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Buscar imagens..."
							className="h-10 rounded-2xl bg-background/55 pl-9 text-[13px]"
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{visibleAssets.map((asset) => (
						<ImageAssetCard
							key={asset.id}
							asset={asset}
							isMaster={isMaster}
							canDelete={
								isMaster ||
								(asset.createdBy === session?.user.id && !asset.isPrivate)
							}
							canRename={
								isMaster ||
								(asset.createdBy === session?.user.id && !asset.isPrivate)
							}
							onTogglePrivate={() =>
								updateImageAsset(asset.id, { isPrivate: !asset.isPrivate })
							}
							onRename={(name) => updateImageAsset(asset.id, { name })}
							onDelete={() => removeImageAsset(asset.id)}
						/>
					))}

					{visibleAssets.length === 0 && (
						<EmptyState
							Icon={ImageIcon}
							title="Nenhuma imagem encontrada"
							description="Envie uma imagem para montar a biblioteca visual da campanha."
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function ImageAssetCard({
	asset,
	isMaster,
	canDelete,
	canRename,
	onTogglePrivate,
	onRename,
	onDelete,
}: {
	asset: ImageAsset;
	isMaster: boolean;
	canDelete: boolean;
	canRename: boolean;
	onTogglePrivate: () => void;
	onRename: (name: string) => void;
	onDelete: () => void;
}) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [draftName, setDraftName] = useState(asset.name);

	useEffect(() => {
		if (!isRenaming) setDraftName(asset.name);
	}, [asset.name, isRenaming]);

	function handleRename(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextName = draftName.trim();
		if (!nextName) return;
		onRename(nextName);
		setIsRenaming(false);
	}

	return (
		<article className="group overflow-hidden rounded-2xl border border-border/70 bg-card-elevated shadow-sm shadow-black/5 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5">
			<div className="relative aspect-[4/3] overflow-hidden bg-muted">
				<img
					src={asset.url}
					alt={asset.name}
					loading="lazy"
					decoding="async"
					className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
				/>
				<div className="absolute left-2 top-2 flex items-center gap-1.5">
					<span
						className={cn(
							"inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] backdrop-blur",
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
				</div>
			</div>

			<div className="space-y-3 p-4">
				{isRenaming ? (
					<form onSubmit={handleRename} className="space-y-2">
						<Input
							value={draftName}
							onChange={(event) => setDraftName(event.target.value)}
							aria-label="Nome da imagem"
							className="h-9 rounded-xl bg-background/70 text-[12px]"
							autoFocus
						/>
						<div className="flex items-center gap-2">
							<Button
								type="submit"
								variant="outline"
								size="icon-sm"
								title="Salvar nome"
								aria-label="Salvar nome da imagem"
							>
								<Check className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								title="Cancelar"
								aria-label="Cancelar renomeação"
								onClick={() => {
									setDraftName(asset.name);
									setIsRenaming(false);
								}}
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</form>
				) : (
					<div className="min-w-0">
						<h2 className="truncate text-[13px] font-bold text-foreground">
							{asset.name}
						</h2>
						<p className="mt-1 text-[11px] text-muted-foreground">
							{asset.width && asset.height
								? `${asset.width}×${asset.height} · ${formatBytes(asset.sizeBytes)}`
								: formatBytes(asset.sizeBytes)}
						</p>
					</div>
				)}

				<div className="flex items-center gap-2">
					{canRename && !isRenaming && (
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							title="Renomear imagem"
							aria-label="Renomear imagem"
							onClick={() => setIsRenaming(true)}
						>
							<Pencil className="h-4 w-4" />
						</Button>
					)}
					{isMaster && (
						<Button
							type="button"
							variant="outline"
							size="icon-sm"
							title={
								asset.isPrivate
									? "Imagem privada. Clique para mostrar para a mesa"
									: "Imagem visível para a mesa. Clique para privar"
							}
							aria-label={
								asset.isPrivate
									? "Imagem privada. Mostrar para a mesa"
									: "Imagem visível para a mesa. Privar imagem"
							}
							onClick={onTogglePrivate}
						>
							{asset.isPrivate ? (
								<LockKeyhole className="h-4 w-4" />
							) : (
								<UnlockKeyhole className="h-4 w-4" />
							)}
						</Button>
					)}
					{canDelete && (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							title="Remover imagem"
							aria-label="Remover imagem"
							onClick={onDelete}
						>
							<Trash2 className="h-4 w-4 text-destructive" />
						</Button>
					)}
				</div>
			</div>
		</article>
	);
}

function formatBytes(bytes: number): string {
	if (!bytes) return "0 KB";
	const units = ["B", "KB", "MB", "GB"];
	const index = Math.min(
		Math.floor(Math.log(bytes) / Math.log(1024)),
		units.length - 1,
	);
	const value = bytes / 1024 ** index;
	return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
