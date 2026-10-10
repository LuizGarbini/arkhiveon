import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import {
	Check,
	ChevronLeft,
	ChevronRight,
	LockKeyhole,
	Pencil,
	Trash2,
	UnlockKeyhole,
	X,
} from "lucide-react";
import { type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ImageAsset } from "@/lib/store";
import { cn, formatRelativeTime } from "@/lib/utils";
import { formatAssetMeta, ImageAssetBadges } from "./image-asset-badges";
import {
	ICON_TOUCH,
	type ImageAssetHandlers,
	type ImageAssetPermissions,
} from "./image-asset-card";

const SWIPE_MIN_PX = 48;

/**
 * Visualizador em tela cheia: abre ao clicar numa imagem da grade.
 * Desktop: setas na tela e no teclado, Esc fecha. Mobile: deslizar para o lado.
 */
export function ImageLightbox({
	assets,
	index,
	onIndexChange,
	onClose,
	permissionsFor,
	handlersFor,
	originLabelFor,
}: {
	assets: ImageAsset[];
	index: number | null;
	onIndexChange: (index: number) => void;
	onClose: () => void;
	permissionsFor: (asset: ImageAsset) => ImageAssetPermissions;
	handlersFor: (asset: ImageAsset) => ImageAssetHandlers;
	/** Nome da campanha de origem quando a imagem é de outra campanha do mundo. */
	originLabelFor: (asset: ImageAsset) => string | null;
}) {
	const asset = index === null ? undefined : assets[index];
	const total = assets.length;
	const touchStartX = useRef<number | null>(null);
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [draftName, setDraftName] = useState("");

	const isRenaming = asset !== undefined && renamingId === asset.id;
	const permissions = asset ? permissionsFor(asset) : null;
	const handlers = asset ? handlersFor(asset) : null;
	const origin = asset ? originLabelFor(asset) : null;

	function go(step: number) {
		if (index === null || total < 2) return;
		setRenamingId(null);
		onIndexChange((index + step + total) % total);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (isRenaming) return;
		if (event.key === "ArrowLeft") {
			event.preventDefault();
			go(-1);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			go(1);
		}
	}

	function handleRename(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextName = draftName.trim();
		if (!asset || !handlers || !nextName) return;
		if (nextName !== asset.name) handlers.onRename(nextName);
		setRenamingId(null);
	}

	return (
		<Dialog
			open={asset !== undefined}
			onOpenChange={(open) => {
				if (!open) {
					setRenamingId(null);
					onClose();
				}
			}}
		>
			<DialogPortal>
				<DialogOverlay className="bg-black/85" />
				<DialogPrimitive.Popup
					data-slot="image-lightbox"
					onKeyDown={handleKeyDown}
					className="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 flex flex-col gap-3 p-3 duration-150 outline-none sm:p-6"
				>
					{asset && permissions && handlers && (
						<>
							<div className="flex items-center justify-between">
								<span className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-[11px] font-bold tabular-nums text-muted-foreground backdrop-blur-md">
									{(index ?? 0) + 1} / {total}
								</span>
								<DialogPrimitive.Close
									render={
										<Button
											variant="ghost"
											size="icon"
											className="size-[44px] rounded-full border border-border/70 bg-card/80 backdrop-blur-md"
											aria-label="Fechar"
										/>
									}
								>
									<X className="h-5 w-5" />
								</DialogPrimitive.Close>
							</div>

							<div
								className="relative flex min-h-0 flex-1 items-center justify-center"
								onTouchStart={(event) => {
									touchStartX.current = event.touches[0]?.clientX ?? null;
								}}
								onTouchEnd={(event) => {
									const start = touchStartX.current;
									touchStartX.current = null;
									const end = event.changedTouches[0]?.clientX;
									if (start === null || end === undefined) return;
									const delta = end - start;
									if (Math.abs(delta) >= SWIPE_MIN_PX) go(delta < 0 ? 1 : -1);
								}}
							>
								<img
									key={asset.id}
									src={asset.url}
									alt={asset.name}
									decoding="async"
									className="max-h-full max-w-full select-none rounded-2xl border border-border/70 object-contain shadow-2xl shadow-black/40"
								/>
								{total > 1 && (
									<>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="absolute left-0 top-1/2 hidden size-[44px] -translate-y-1/2 rounded-full border border-border/70 bg-card/80 backdrop-blur-md sm:inline-flex lg:left-4"
											aria-label="Imagem anterior"
											onClick={() => go(-1)}
										>
											<ChevronLeft className="h-5 w-5" />
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="absolute right-0 top-1/2 hidden size-[44px] -translate-y-1/2 rounded-full border border-border/70 bg-card/80 backdrop-blur-md sm:inline-flex lg:right-4"
											aria-label="Próxima imagem"
											onClick={() => go(1)}
										>
											<ChevronRight className="h-5 w-5" />
										</Button>
									</>
								)}
							</div>

							<div className="mx-auto w-full max-w-4xl rounded-2xl border border-border/70 bg-card-elevated/95 p-4 shadow-xl backdrop-blur-md">
								<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
									<div className="min-w-0 flex-1">
										{isRenaming ? (
											<form
												onSubmit={handleRename}
												className="flex items-center gap-1.5"
											>
												<Input
													value={draftName}
													onChange={(event) => setDraftName(event.target.value)}
													aria-label="Nome da imagem"
													className="h-[44px] min-w-0 flex-1 rounded-xl bg-background/70 text-[16px] sm:h-9 sm:text-[13px]"
													autoFocus
												/>
												<Button
													type="submit"
													variant="outline"
													size="icon-sm"
													className={ICON_TOUCH}
													aria-label="Salvar nome da imagem"
												>
													<Check className="h-4 w-4" />
												</Button>
												<Button
													type="button"
													variant="ghost"
													size="icon-sm"
													className={ICON_TOUCH}
													aria-label="Cancelar renomeação"
													onClick={() => setRenamingId(null)}
												>
													<X className="h-4 w-4" />
												</Button>
											</form>
										) : (
											<div className="flex flex-wrap items-center gap-2">
												<DialogTitle className="truncate font-display text-[16px] font-bold text-foreground">
													{asset.name}
												</DialogTitle>
												<ImageAssetBadges asset={asset} />
											</div>
										)}
										<p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
											{formatAssetMeta(asset)} · enviada{" "}
											{formatSentAt(asset.createdAt)}
											{origin ? ` · de ${origin}` : ""}
										</p>
									</div>

									{!isRenaming && (
										<div className="flex items-center gap-2">
											<span className="mr-1 hidden items-center gap-1.5 text-[10px] text-muted-foreground lg:flex">
												<Kbd>←</Kbd>
												<Kbd>→</Kbd> navegar · <Kbd>Esc</Kbd> fechar
											</span>
											{permissions.canRename && (
												<Button
													type="button"
													variant="outline"
													className="h-[44px] flex-1 gap-2 sm:h-9 sm:flex-none"
													onClick={() => {
														setDraftName(asset.name);
														setRenamingId(asset.id);
													}}
												>
													<Pencil className="h-3.5 w-3.5" />
													Renomear
												</Button>
											)}
											{permissions.canTogglePrivate && (
												<Button
													type="button"
													variant="outline"
													className="h-[44px] flex-1 gap-2 sm:h-9 sm:flex-none"
													onClick={handlers.onTogglePrivate}
												>
													{asset.isPrivate ? (
														<UnlockKeyhole className="h-3.5 w-3.5" />
													) : (
														<LockKeyhole className="h-3.5 w-3.5" />
													)}
													{asset.isPrivate
														? "Mostrar para a mesa"
														: "Tornar privada"}
												</Button>
											)}
											{permissions.canDelete && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="size-[44px] shrink-0 sm:size-9"
													aria-label="Remover imagem"
													title="Remover imagem"
													onClick={handlers.onDelete}
												>
													<Trash2 className="h-4 w-4 text-destructive" />
												</Button>
											)}
										</div>
									)}
								</div>
								{total > 1 && (
									<p className="mt-2 text-center text-[11px] text-muted-foreground sm:hidden">
										Deslize para o lado para ver a próxima
									</p>
								)}
							</div>
						</>
					)}
				</DialogPrimitive.Popup>
			</DialogPortal>
		</Dialog>
	);
}

function Kbd({ children }: { children: string }) {
	return (
		<kbd
			className={cn(
				"rounded-md border border-border/70 bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground",
			)}
		>
			{children}
		</kbd>
	);
}

function formatSentAt(timestamp: number): string {
	const relative = formatRelativeTime(timestamp);
	if (relative === "agora" || relative === "ontem") return relative;
	if (/^\d+(s|min|h|d)$/.test(relative)) return `há ${relative}`;
	return `em ${relative}`;
}
