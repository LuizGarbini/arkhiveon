import { LockKeyhole, X } from "lucide-react";
import { useEffect, useMemo } from "react";
import { ImageUploader } from "@/components/image-uploader";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { type Character, useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface CharacterImageDialogProps {
	character: Character;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onChange: (patch: Partial<Character>) => void;
}

export function CharacterImageDialog({
	character,
	open,
	onOpenChange,
	onChange,
}: CharacterImageDialogProps) {
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const imageAssets = useRPGStore((s) => s.imageAssets);
	const loadImageAssets = useRPGStore((s) => s.loadImageAssets);
	const activeCampaignRole = useRPGStore(
		(s) =>
			s.campaigns.find((campaign) => campaign.id === s.activeCampaignId)
				?.myRole,
	);
	const isMaster = activeCampaignRole === "owner";
	const visibleAssets = useMemo(
		() =>
			imageAssets.filter(
				(asset) =>
					asset.campaignId === activeCampaignId &&
					(isMaster || !asset.isPrivate),
			),
		[activeCampaignId, imageAssets, isMaster],
	);

	useEffect(() => {
		if (!open || !activeCampaignId) return;
		void loadImageAssets();
	}, [activeCampaignId, loadImageAssets, open]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-3xl! overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">
						Editar imagem da ficha
					</DialogTitle>
					<DialogDescription>
						Troque ou remova o avatar usado no cabeçalho, nos cards e na
						exportação em PDF.
					</DialogDescription>
				</DialogHeader>

				<ImageUploader
					value={character.imageUrl ?? ""}
					onChange={(imageUrl) => onChange({ imageUrl, imageAssetId: "" })}
					label="Upload direto"
					folder="characters"
					campaignId={activeCampaignId ?? undefined}
					libraryName={character.characterName}
					size="lg"
				/>

				<div className="space-y-3">
					<div>
						<p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
							Biblioteca
						</p>
						<p className="mt-1 text-[12px] text-muted-foreground">
							Escolha uma imagem já enviada para a campanha.
						</p>
					</div>
					<div className="grid max-h-72 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
						{visibleAssets.map((asset) => {
							const isSelected = character.imageAssetId === asset.id;
							return (
								<button
									key={asset.id}
									type="button"
									onClick={() =>
										onChange({ imageUrl: "", imageAssetId: asset.id })
									}
									className={cn(
										"group relative overflow-hidden rounded-2xl border bg-card-elevated text-left shadow-sm shadow-black/5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/35",
										isSelected
											? "border-primary/50 ring-2 ring-primary/20"
											: "border-border/70",
									)}
								>
									<div className="relative aspect-[4/3] overflow-hidden bg-muted">
										<img
											src={asset.url}
											alt={asset.name}
											loading="lazy"
											decoding="async"
											className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
										{asset.isPrivate && (
											<span className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-400/15 text-amber-200 backdrop-blur">
												<LockKeyhole className="h-3.5 w-3.5" />
											</span>
										)}
									</div>
									<div className="p-3">
										<p className="truncate text-[12px] font-bold text-foreground">
											{asset.name}
										</p>
										<p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
											{isSelected ? "Selecionada" : "Usar imagem"}
										</p>
									</div>
								</button>
							);
						})}
						{visibleAssets.length === 0 && (
							<div className="rounded-2xl border border-dashed border-border/70 bg-background/45 p-4 text-[12px] text-muted-foreground sm:col-span-3">
								Nenhuma imagem disponível.
							</div>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={() => onChange({ imageUrl: "", imageAssetId: "" })}
					>
						<X className="h-4 w-4" />
						Remover imagem
					</Button>
					<Button type="button" onClick={() => onOpenChange(false)}>
						Concluir
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
