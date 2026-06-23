import {
	ChevronLeft,
	ChevronRight,
	Images,
	LockKeyhole,
	Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ImageAsset } from "@/lib/store";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

type ImageLibraryPickerDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	assets: ImageAsset[];
	selectedAssetId?: string;
	onSelect: (asset: ImageAsset) => void;
};

export function ImageLibraryPickerDialog({
	open,
	onOpenChange,
	assets,
	selectedAssetId,
	onSelect,
}: ImageLibraryPickerDialogProps) {
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(0);

	// Reseta a busca e a página ao fechar a biblioteca de imagens
	useEffect(() => {
		if (!open) {
			setQuery("");
			setPage(0);
		}
	}, [open]);

	// Reseta a página para a primeira ao realizar uma nova busca
	useEffect(() => {
		setPage(0);
	}, [query]);

	const filteredAssets = useMemo(() => {
		const normalized = query.trim().toLowerCase();
		if (!normalized) return assets;
		return assets.filter((asset) =>
			asset.name.toLowerCase().includes(normalized),
		);
	}, [assets, query]);

	const totalPages = Math.max(1, Math.ceil(filteredAssets.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages - 1);
	const pageAssets = filteredAssets.slice(
		safePage * PAGE_SIZE,
		safePage * PAGE_SIZE + PAGE_SIZE,
	);
	const rangeStart = filteredAssets.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
	const rangeEnd = Math.min(filteredAssets.length, (safePage + 1) * PAGE_SIZE);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl! gap-0 overflow-hidden p-0">
				<DialogHeader className="border-b border-border/70 px-6 py-5">
					<DialogTitle className="font-display text-xl">
						Biblioteca de imagens
					</DialogTitle>
					<DialogDescription>
						Busque e escolha uma imagem da campanha. Depois você recorta no
						próximo passo.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 px-6 py-5">
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
						<Input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Buscar por nome..."
							className="h-10 rounded-2xl bg-background/55 pl-9 text-[13px]"
							autoFocus
						/>
					</div>

					{pageAssets.length > 0 ? (
						<div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
							{pageAssets.map((asset) => {
								const isSelected = selectedAssetId === asset.id;
								return (
									<button
										key={asset.id}
										type="button"
										onClick={() => {
											onSelect(asset);
											onOpenChange(false);
										}}
										className={cn(
											"group overflow-hidden rounded-xl border bg-card-elevated text-left shadow-sm transition-[border-color,transform] hover:-translate-y-0.5 hover:border-primary/35",
											isSelected
												? "border-primary/50 ring-2 ring-primary/20"
												: "border-border/70",
										)}
									>
										<div className="relative aspect-square overflow-hidden bg-muted">
											<img
												src={asset.url}
												alt={asset.name}
												loading="lazy"
												decoding="async"
												className="h-full w-full object-cover"
											/>
											{asset.isPrivate ? (
												<span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md border border-amber-400/35 bg-amber-400/15 text-amber-200 backdrop-blur">
													<LockKeyhole className="h-3 w-3" />
												</span>
											) : null}
										</div>
										<p className="truncate px-2 py-2 text-[11px] font-semibold text-foreground">
											{asset.name}
										</p>
									</button>
								);
							})}
						</div>
					) : (
						<div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border/70 bg-background/45 px-4 py-10 text-center">
							<Images className="h-8 w-8 text-muted-foreground/40" />
							<p className="text-[13px] font-medium text-foreground">
								Nenhuma imagem encontrada
							</p>
							<p className="text-[12px] text-muted-foreground">
								{query
									? "Tente outro termo de busca."
									: "Envie imagens na aba Imagens da campanha."}
							</p>
						</div>
					)}

					{filteredAssets.length > PAGE_SIZE ? (
						<div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
							<p className="text-[11px] text-muted-foreground">
								{rangeStart}–{rangeEnd} de {filteredAssets.length}
							</p>
							<div className="flex items-center gap-2">
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									disabled={safePage <= 0}
									onClick={() => setPage((current) => Math.max(0, current - 1))}
									aria-label="Pagina anterior"
								>
									<ChevronLeft className="h-4 w-4" />
								</Button>
								<span className="min-w-[72px] text-center text-[11px] font-semibold tabular-nums text-muted-foreground">
									{safePage + 1} / {totalPages}
								</span>
								<Button
									type="button"
									variant="outline"
									size="icon-sm"
									disabled={safePage >= totalPages - 1}
									onClick={() =>
										setPage((current) => Math.min(totalPages - 1, current + 1))
									}
									aria-label="Proxima pagina"
								>
									<ChevronRight className="h-4 w-4" />
								</Button>
							</div>
						</div>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
