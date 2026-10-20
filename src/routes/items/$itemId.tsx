import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Camera,
	Coins,
	Gem,
	Link2,
	Package,
	Pencil,
	ShieldCheck,
	Sparkles,
	Weight,
} from "lucide-react";
import { useState } from "react";
import {
	DetailInfo,
	DetailQuickStat,
	DetailSection,
	DetailSkeleton,
	DetailText,
} from "@/components/entity-detail";
import { EntityImageDialog } from "@/components/entity-image-dialog";
import { EntityLinkChips } from "@/components/entity-links";
import { FramedImage } from "@/components/framed-image";
import { EntityImageViewer } from "@/components/images/entity-image-viewer";
import { ItemEditButton } from "@/components/item-form";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { resolveItemImageUrl } from "@/lib/character-images";
import {
	useActiveCampaignId,
	useActiveCampaignRole,
	useImageAssetLookup,
	useIsWorldStaff,
	useRPGStore,
} from "@/lib/store";
import { useActiveCampaignContext } from "@/lib/worldbuilding/hooks";
import { canManageOwnItem } from "@/lib/worldbuilding/item-ownership";
import { canViewScopedContent } from "@/lib/worldbuilding/visibility";

export const Route = createFileRoute("/items/$itemId")({
	validateSearch: (search: Record<string, unknown>) => ({
		edit: search.edit === true || search.edit === "true",
	}),
	component: ItemDetailPage,
});

function ItemDetailPage() {
	const { itemId } = Route.useParams();
	const { edit } = Route.useSearch();
	const navigate = useNavigate();
	const item = useRPGStore((state) =>
		state.items.find((entry) => entry.id === itemId),
	);
	const isLoading = useRPGStore((state) => state.isLoadingRemote);
	const imageAssetLookup = useImageAssetLookup();
	const activeCampaignRole = useActiveCampaignRole();
	const activeCampaignId = useActiveCampaignId();
	const activeCampaign = useActiveCampaignContext();
	const campaigns = useRPGStore((state) => state.campaigns);
	const updateItem = useRPGStore((state) => state.updateItem);
	const isStaff = useIsWorldStaff();
	const { user } = useAuth();
	const [isEditing, setIsEditing] = useState(edit || false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

	const canView =
		!!item &&
		canViewScopedContent(item, activeCampaign, activeCampaignRole, campaigns);
	const canManage = item ? canManageOwnItem(item, user?.id, isStaff) : false;

	if (isLoading) return <DetailSkeleton />;

	if (!item || !canView) {
		return (
			<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<Package className="h-16 w-16 text-muted-foreground/30" />
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Item não encontrado
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Esse registro pode ter sido removido ou ainda não sincronizou.
					</p>
				</div>
				<Link to="/items">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para itens
					</Button>
				</Link>
			</div>
		);
	}

	const currentItem = item;
	const itemImageUrl = resolveItemImageUrl(
		currentItem,
		imageAssetLookup,
		activeCampaignRole,
	);
	const subtitle = [
		currentItem.rarity || "comum",
		currentItem.type,
		currentItem.subtype,
	]
		.filter(Boolean)
		.join(" · ");

	function handleDialogOpenChange(open: boolean) {
		setDialogOpen(open);
		if (!open && edit) {
			void navigate({
				to: "/items/$itemId",
				params: { itemId: currentItem.id },
				search: { edit: false },
				replace: true,
			});
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0">
						<Link
							to="/items"
							className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Voltar para itens
						</Link>
						<div className="mt-4 flex items-start gap-4">
							<div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20">
								{itemImageUrl ? (
									<FramedImage
										src={itemImageUrl}
										alt={currentItem.name}
										framing={currentItem}
									/>
								) : (
									<Gem className="h-7 w-7" strokeWidth={1.5} />
								)}
								{itemImageUrl ? (
									<EntityImageViewer
										src={itemImageUrl}
										name={currentItem.name}
										canEdit={canManage}
										onEdit={() => setIsImageDialogOpen(true)}
									/>
								) : (
									canManage && (
										<button
											type="button"
											onClick={() => setIsImageDialogOpen(true)}
											className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition hover:bg-black/50 hover:opacity-100 focus:bg-black/50 focus:opacity-100 focus:outline-none"
											aria-label="Editar imagem do item"
										>
											<Camera className="h-5 w-5" />
										</button>
									)
								)}
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<Package className="h-3.5 w-3.5" />
									Item
								</div>
								<h1 className="font-display mt-3 truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
									{currentItem.name || "Item sem nome"}
								</h1>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{subtitle || "Tesouro da campanha"}
								</p>
							</div>
						</div>
					</div>

					{canManage && (
						<div className="flex shrink-0 flex-wrap items-center gap-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setIsImageDialogOpen(true)}
								className="gap-2"
							>
								<Camera className="h-4 w-4" />
								Imagem
							</Button>
							<Button
								type="button"
								onClick={() => setIsEditing((current) => !current)}
								className="gap-2"
							>
								<Pencil className="h-4 w-4" />
								{isEditing ? "Concluir edição" : "Editar"}
							</Button>
						</div>
					)}
				</div>

				<div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<DetailQuickStat
						Icon={Sparkles}
						label="Raridade"
						value={currentItem.rarity || "comum"}
						color="text-emerald-300"
					/>
					<DetailQuickStat
						Icon={Weight}
						label="Peso"
						value={currentItem.weight || "-"}
						color="text-muted-foreground"
					/>
					<DetailQuickStat
						Icon={Coins}
						label="Valor"
						value={currentItem.value || "-"}
						color="text-amber-300"
					/>
					<DetailQuickStat
						Icon={Gem}
						label="Cargas"
						value={currentItem.charges || "-"}
						color="text-fuchsia-300"
					/>
				</div>
			</header>

			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<main className="grid content-start gap-5">
					<DetailSection
						eyebrow="Resumo"
						title="Identificação"
						onEdit={isEditing ? () => setDialogOpen(true) : undefined}
					>
						<div className="grid gap-3 sm:grid-cols-2">
							<DetailInfo label="Tipo" value={currentItem.type} />
							<DetailInfo label="Subtipo" value={currentItem.subtype} />
							<DetailInfo label="Fonte" value={currentItem.source} />
							<DetailInfo
								Icon={ShieldCheck}
								label="Equipado"
								value={currentItem.equipped}
							/>
						</div>
					</DetailSection>

					<DetailSection
						eyebrow="Mecânica"
						title="Efeitos"
						onEdit={isEditing ? () => setDialogOpen(true) : undefined}
					>
						<div className="grid gap-3">
							<DetailText
								title="Atributos / efeitos"
								value={currentItem.stats}
								mono
							/>
							<DetailInfo label="Propriedades" value={currentItem.properties} />
						</div>
					</DetailSection>

					<DetailSection
						eyebrow="Descrição"
						title="Lore"
						onEdit={isEditing ? () => setDialogOpen(true) : undefined}
					>
						<DetailText value={currentItem.description} />
					</DetailSection>
				</main>

				<aside className="grid content-start gap-5">
					<DetailSection
						eyebrow="Posse"
						title="Dono & sintonia"
						onEdit={isEditing ? () => setDialogOpen(true) : undefined}
					>
						<div className="grid gap-3">
							<DetailInfo label="Pertence a" value={currentItem.owner} />
							<DetailInfo
								label="Sintonizado com"
								value={currentItem.attunedTo}
							/>
							<DetailInfo
								Icon={Link2}
								label="Requer sintonia"
								value={currentItem.requiresAttunement}
							/>
						</div>
					</DetailSection>

					<DetailSection eyebrow="Conexões" title="Vínculos">
						<EntityLinkChips
							links={currentItem.entityLinks}
							emptyText="Nenhuma conexão registrada."
						/>
					</DetailSection>
				</aside>
			</div>

			{canManage && (
				<>
					<ItemEditButton
						item={currentItem}
						open={dialogOpen}
						onOpenChange={handleDialogOpenChange}
						trigger={null}
					/>
					<EntityImageDialog
						open={isImageDialogOpen}
						onOpenChange={setIsImageDialogOpen}
						title="Editar imagem do item"
						description="Escolha da biblioteca, envie uma nova imagem ou ajuste o recorte."
						value={{
							imageUrl: currentItem.imageUrl ?? "",
							imageAssetId: currentItem.imageAssetId,
							imageFocusX: currentItem.imageFocusX,
							imageFocusY: currentItem.imageFocusY,
							imageZoom: currentItem.imageZoom,
						}}
						onChange={(patch) => updateItem(currentItem.id, patch, user?.id)}
						folder="items"
						campaignId={activeCampaignId ?? undefined}
						libraryName={currentItem.name}
					/>
				</>
			)}
		</div>
	);
}
