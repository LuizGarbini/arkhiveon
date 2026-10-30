import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
	type ImageVisibility,
	visibilityFromRow,
} from "@/lib/image-visibility";
import type { ImageAsset } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatAssetMeta, ImageAssetBadges } from "./image-asset-badges";
import { ImageVisibilityMenuItems } from "./image-visibility-menu";

export interface ImageAssetPermissions {
	canRename: boolean;
	canDelete: boolean;
	/** Mestre (qualquer imagem) ou quem subiu (a própria). */
	canSetVisibility: boolean;
}

export interface ImageAssetHandlers {
	onSetVisibility: (visibility: ImageVisibility) => void;
	onRename: (name: string) => void;
	onDelete: () => void;
}

/** Botão de ícone com alvo de 44px no toque e 32px com mouse. */
export const ICON_TOUCH = "size-[44px] sm:size-8";

export function ImageAssetCard({
	asset,
	permissions,
	handlers,
	onOpen,
}: {
	asset: ImageAsset;
	permissions: ImageAssetPermissions;
	handlers: ImageAssetHandlers;
	onOpen: () => void;
}) {
	const [isRenaming, setIsRenaming] = useState(false);
	const [draftName, setDraftName] = useState(asset.name);
	const hasMenu = permissions.canSetVisibility || permissions.canDelete;

	function startRename() {
		setDraftName(asset.name);
		setIsRenaming(true);
	}

	function handleRename(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const nextName = draftName.trim();
		if (!nextName) return;
		if (nextName !== asset.name) handlers.onRename(nextName);
		setIsRenaming(false);
	}

	return (
		<article className="group overflow-hidden rounded-2xl border border-border/70 bg-card-elevated shadow-sm shadow-black/5 transition-[border-color,box-shadow] duration-150 [@media(hover:hover)]:hover:border-primary/35 [@media(hover:hover)]:hover:shadow-lg [@media(hover:hover)]:hover:shadow-black/5">
			<button
				type="button"
				onClick={onOpen}
				aria-label={`Abrir ${asset.name}`}
				className="relative block aspect-[4/3] w-full overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset"
			>
				<img
					src={asset.url}
					alt={asset.name}
					loading="lazy"
					decoding="async"
					className="h-full w-full object-cover transition-transform duration-200 [@media(hover:hover)]:group-hover:scale-[1.03]"
				/>
				<ImageAssetBadges
					asset={asset}
					className="pointer-events-none absolute left-2 top-2"
				/>
			</button>

			{isRenaming ? (
				<form onSubmit={handleRename} className="flex items-center gap-1.5 p-3">
					<Input
						value={draftName}
						onChange={(event) => setDraftName(event.target.value)}
						aria-label="Nome da imagem"
						className="h-[44px] min-w-0 flex-1 rounded-xl bg-background/70 text-[16px] sm:h-8 sm:text-[12px]"
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
						onClick={() => setIsRenaming(false)}
					>
						<X className="h-4 w-4" />
					</Button>
				</form>
			) : (
				<div className="flex items-center gap-1 p-3 pl-3.5">
					<div className="min-w-0 flex-1">
						<h2 className="truncate text-[13px] font-bold text-foreground">
							{asset.name}
						</h2>
						<p className="mt-0.5 truncate text-[11px] tabular-nums text-muted-foreground">
							{formatAssetMeta(asset)}
						</p>
					</div>
					{permissions.canRename && (
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							className={cn(ICON_TOUCH, "hidden shrink-0 sm:inline-flex")}
							title="Renomear imagem"
							aria-label="Renomear imagem"
							onClick={startRename}
						>
							<Pencil className="h-4 w-4" />
						</Button>
					)}
					{(hasMenu || permissions.canRename) && (
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										type="button"
										variant="ghost"
										size="icon-sm"
										className={cn(ICON_TOUCH, "shrink-0")}
										aria-label="Mais ações"
									/>
								}
							>
								<MoreHorizontal className="h-4 w-4" />
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-52">
								{permissions.canRename && (
									<DropdownMenuItem onClick={startRename}>
										<Pencil />
										Renomear
									</DropdownMenuItem>
								)}
								{permissions.canSetVisibility && (
									<>
										<DropdownMenuSeparator />
										<ImageVisibilityMenuItems
											value={visibilityFromRow(
												asset.visibility,
												asset.isPrivate,
											)}
											onChange={handlers.onSetVisibility}
										/>
										<DropdownMenuSeparator />
									</>
								)}
								{permissions.canDelete && (
									<DropdownMenuItem
										variant="destructive"
										onClick={handlers.onDelete}
									>
										<Trash2 />
										Remover
									</DropdownMenuItem>
								)}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
				</div>
			)}
		</article>
	);
}
