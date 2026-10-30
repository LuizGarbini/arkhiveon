import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowDownWideNarrow,
	ImageIcon,
	Images,
	Search,
	UploadCloud,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ImageAssetCard } from "@/components/images/image-asset-card";
import { ImageLightbox } from "@/components/images/image-lightbox";
import { ImageUploadDialog } from "@/components/images/image-upload-dialog";
import type { ImageVisibilityChange } from "@/components/images/image-visibility-menu";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import {
	countGalleryFilters,
	GALLERY_FILTERS,
	GALLERY_SORTS,
	type GalleryFilter,
	type GalleryScope,
	type GallerySort,
	roleForAsset,
	selectGalleryAssets,
	visibleWorldAssets,
} from "@/lib/image-gallery";
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

function hasDraggedFiles(event: DragEvent): boolean {
	return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function ImagesRoute() {
	const toast = useToast();
	const { session } = useAuth();
	const userId = session?.user.id;
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const campaigns = useRPGStore((state) => state.campaigns);
	const worlds = useRPGStore((state) => state.worlds);
	const imageAssets = useRPGStore((state) => state.imageAssets);
	const loadImageAssets = useRPGStore((state) => state.loadImageAssets);
	const addImageAsset = useRPGStore((state) => state.addImageAsset);
	const updateImageAsset = useRPGStore((state) => state.updateImageAsset);
	const removeImageAsset = useRPGStore((state) => state.removeImageAsset);

	const [query, setQuery] = useState("");
	const deferredQuery = useDeferredValue(query);
	const [filter, setFilter] = useState<GalleryFilter>("all");
	const [sort, setSort] = useState<GallerySort>("recent");
	const [isUploadOpen, setIsUploadOpen] = useState(false);
	const [pendingFiles, setPendingFiles] = useState<File[]>([]);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadingName, setUploadingName] = useState<string | null>(null);
	const [lightboxId, setLightboxId] = useState<string | null>(null);

	const activeCampaign = useMemo(
		() => campaigns.find((campaign) => campaign.id === activeCampaignId),
		[campaigns, activeCampaignId],
	);
	const worldId = activeCampaign?.worldId;
	const worldName = useMemo(
		() => worlds.find((world) => world.id === worldId)?.name,
		[worlds, worldId],
	);
	const isMaster = activeCampaign?.myRole === "owner";
	const canUpload =
		activeCampaign?.myRole === "owner" || activeCampaign?.myRole === "editor";

	const scope = useMemo<GalleryScope>(
		() => ({ activeCampaignId, worldId, campaigns }),
		[activeCampaignId, worldId, campaigns],
	);

	useEffect(() => {
		if (!activeCampaignId) return;
		void loadImageAssets();
	}, [activeCampaignId, loadImageAssets]);

	// Arrastar um arquivo sobre a página abre o modal de envio (sem faixa de
	// dropzone na página). Soltar fora do modal também entra na seleção, em vez
	// de o navegador abrir o arquivo.
	useEffect(() => {
		if (!canUpload) return;
		function handleDragEnter(event: DragEvent) {
			if (!hasDraggedFiles(event)) return;
			setIsUploadOpen(true);
		}
		function handleDragOver(event: DragEvent) {
			if (hasDraggedFiles(event)) event.preventDefault();
		}
		function handleDrop(event: DragEvent) {
			if (!hasDraggedFiles(event)) return;
			event.preventDefault();
			const dropped = Array.from(event.dataTransfer?.files ?? []);
			if (dropped.length === 0) return;
			setPendingFiles((current) => mergeFiles(current, dropped));
			setIsUploadOpen(true);
		}
		window.addEventListener("dragenter", handleDragEnter);
		window.addEventListener("dragover", handleDragOver);
		window.addEventListener("drop", handleDrop);
		return () => {
			window.removeEventListener("dragenter", handleDragEnter);
			window.removeEventListener("dragover", handleDragOver);
			window.removeEventListener("drop", handleDrop);
		};
	}, [canUpload]);

	const worldAssets = useMemo(
		() => visibleWorldAssets(imageAssets, scope, deferredQuery),
		[imageAssets, scope, deferredQuery],
	);
	const counts = useMemo(() => countGalleryFilters(worldAssets), [worldAssets]);
	const shownAssets = useMemo(
		() => selectGalleryAssets(worldAssets, filter, sort),
		[worldAssets, filter, sort],
	);
	const totalInWorld = useMemo(
		() => visibleWorldAssets(imageAssets, scope).length,
		[imageAssets, scope],
	);

	const lightboxIndex = useMemo(() => {
		if (!lightboxId) return null;
		const index = shownAssets.findIndex((asset) => asset.id === lightboxId);
		return index === -1 ? null : index;
	}, [lightboxId, shownAssets]);

	const imageSyncNotice = { onSyncError: toast.error };

	function permissionsFor(asset: ImageAsset) {
		const role = roleForAsset(asset, campaigns);
		const isOwner = role === "owner";
		// 0054: quem subiu gerencia a própria imagem; o mestre gerencia todas.
		const isOwn = role !== undefined && asset.createdBy === userId;
		return {
			canRename: isOwner || isOwn,
			canDelete: isOwner || isOwn,
			canSetVisibility: isOwner || isOwn,
		};
	}

	function handlersFor(asset: ImageAsset) {
		return {
			onSetVisibility: ({ isPrivate, audience }: ImageVisibilityChange) =>
				updateImageAsset(asset.id, { isPrivate, audience }, imageSyncNotice),
			onRename: (name: string) =>
				updateImageAsset(asset.id, { name }, imageSyncNotice),
			onDelete: () => removeImageAsset(asset.id, imageSyncNotice),
		};
	}

	function originLabelFor(asset: ImageAsset): string | null {
		if (asset.campaignId === activeCampaignId) return null;
		return (
			campaigns.find((campaign) => campaign.id === asset.campaignId)?.name ??
			"outra campanha do mundo"
		);
	}

	function openUpload() {
		if (!canUpload) return;
		setIsUploadOpen(true);
	}

	function handleUploadOpenChange(open: boolean) {
		setIsUploadOpen(open);
		if (!open) setPendingFiles([]);
	}

	async function uploadFiles(fileList: File[]) {
		if (!canUpload || !activeCampaignId) {
			toast.error({
				title: "Upload bloqueado",
				description: "Apenas mestre e editores podem adicionar imagens.",
			});
			return;
		}

		const files = fileList.filter((file) => file.type.startsWith("image/"));

		if (files.length === 0) {
			toast.error({
				title: "Arquivo inválido",
				description: "Selecione um arquivo de imagem.",
			});
			return;
		}

		setIsUploading(true);
		// Só conta como enviada quando a linha entrou em `image_assets`.
		const saved: Promise<boolean>[] = [];

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

				saved.push(
					new Promise<boolean>((resolve) => {
						const created = addImageAsset(
							{
								createdBy: userId ?? "",
								name: readableFileName(file.name),
								url,
								mimeType: file.type,
								sizeBytes: file.size,
								width: dimensions.width,
								height: dimensions.height,
							},
							{
								onSynced: () => resolve(true),
								onSyncError: (notice) => {
									toast.error(notice);
									resolve(false);
								},
							},
						);
						if (!created) resolve(false);
					}),
				);
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
			setPendingFiles([]);
			setIsUploadOpen(false);
		}

		const uploadedCount = (await Promise.all(saved)).filter(Boolean).length;
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

	const visibleFilters = GALLERY_FILTERS.filter(
		(item) => item.id !== "private" || isMaster,
	);
	const isFiltered = deferredQuery.trim() !== "" || filter !== "all";

	return (
		<div className="w-full">
			<PageHeader
				title="Imagens"
				description={
					worldName
						? `Biblioteca visual de ${worldName}: retratos, mapas e referências de todas as campanhas deste mundo.`
						: "Biblioteca visual da campanha para reutilizar retratos, mapas e referências nas fichas."
				}
				Icon={Images}
				iconColor="text-sky-300"
				eyebrow="Arquivos"
				count={totalInWorld}
				action={
					<Button
						type="button"
						className="h-[44px] gap-2 px-4 sm:h-9"
						loading={isUploading}
						loadingText="Enviando..."
						disabled={!canUpload}
						title={
							canUpload
								? undefined
								: "Apenas mestre e editores podem adicionar imagens."
						}
						onClick={openUpload}
					>
						<UploadCloud className="h-4 w-4" />
						Enviar imagens
					</Button>
				}
			/>

			<div className="px-4 pb-10 sm:px-8">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
					<div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm shadow-black/5 backdrop-blur-md lg:flex-row lg:items-center">
						<div className="relative lg:w-64">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
							<Input
								type="search"
								aria-label="Filtrar imagens"
								value={query}
								onChange={(event) => setQuery(event.target.value)}
								placeholder="Buscar imagens..."
								className="h-[44px] rounded-xl bg-background/55 pl-9 text-[16px] sm:h-9 sm:text-[13px]"
							/>
						</div>
						<fieldset className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto border-0 px-1 [scrollbar-width:none]">
							<legend className="sr-only">Filtrar por tipo</legend>
							{visibleFilters.map((item) => {
								const isOn = filter === item.id;
								return (
									<button
										key={item.id}
										type="button"
										aria-pressed={isOn}
										onClick={() => setFilter(item.id)}
										className={cn(
											"inline-flex h-[44px] shrink-0 select-none items-center gap-1.5 rounded-full border px-3.5 text-[12px] font-bold transition-[background-color,border-color,color] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-8",
											isOn
												? "border-primary/35 bg-primary/12 text-primary"
												: "border-transparent bg-background/55 text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
										)}
									>
										{item.label}
										<span className="tabular-nums opacity-80">
											{counts[item.id]}
										</span>
									</button>
								);
							})}
						</fieldset>
						<div className="hidden items-center gap-2 sm:flex lg:ml-auto">
							<ArrowDownWideNarrow className="h-4 w-4 shrink-0 text-muted-foreground" />
							<Select
								aria-label="Ordenar imagens"
								value={sort}
								onChange={(event) => setSort(event.target.value as GallerySort)}
								className="h-9 w-44 rounded-xl"
							>
								{GALLERY_SORTS.map((item) => (
									<option key={item.id} value={item.id}>
										{item.label}
									</option>
								))}
							</Select>
						</div>
					</div>

					<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
						{shownAssets.map((asset) => (
							<ImageAssetCard
								key={asset.id}
								asset={asset}
								permissions={permissionsFor(asset)}
								handlers={handlersFor(asset)}
								onOpen={() => setLightboxId(asset.id)}
							/>
						))}

						{shownAssets.length === 0 &&
							(isFiltered ? (
								<EmptyState
									Icon={Search}
									title="Nenhuma imagem encontrada"
									description="Nada bate com a busca ou o filtro escolhido."
									actionLabel="Limpar filtros"
									onAction={() => {
										setQuery("");
										setFilter("all");
									}}
								/>
							) : (
								<EmptyState
									Icon={ImageIcon}
									title="Nenhuma imagem ainda"
									description={
										canUpload
											? "Tudo o que você enviar — retratos, mapas da VTT, referências — aparece aqui para reutilizar nas fichas e na mesa. Você também pode arrastar arquivos para esta página."
											: "Quando o mestre ou um editor enviar imagens para este mundo, elas aparecem aqui."
									}
									actionLabel={canUpload ? "Enviar primeira imagem" : undefined}
									onAction={canUpload ? openUpload : undefined}
								/>
							))}
					</div>
				</div>
			</div>

			<ImageUploadDialog
				open={isUploadOpen}
				onOpenChange={handleUploadOpenChange}
				files={pendingFiles}
				onAddFiles={(files) =>
					setPendingFiles((current) => mergeFiles(current, files))
				}
				onRemoveFile={(index) =>
					setPendingFiles((current) => current.filter((_, i) => i !== index))
				}
				onSubmit={() => void uploadFiles(pendingFiles)}
				isUploading={isUploading}
				uploadingName={uploadingName}
				targetName={activeCampaign?.name ?? "sua campanha"}
			/>

			<ImageLightbox
				assets={shownAssets}
				index={lightboxIndex}
				onIndexChange={(index) => setLightboxId(shownAssets[index]?.id ?? null)}
				onClose={() => setLightboxId(null)}
				permissionsFor={permissionsFor}
				handlersFor={handlersFor}
				originLabelFor={originLabelFor}
			/>
		</div>
	);
}

/** Junta seleções sem repetir o mesmo arquivo; ignora o que não é imagem. */
function mergeFiles(current: File[], incoming: File[]): File[] {
	const key = (file: File) => `${file.name}-${file.size}-${file.lastModified}`;
	const seen = new Set(current.map(key));
	const next = [...current];
	for (const file of incoming) {
		if (!file.type.startsWith("image/") || seen.has(key(file))) continue;
		seen.add(key(file));
		next.push(file);
	}
	return next;
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, ms));
}
