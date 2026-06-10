import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
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
import { EntityLinkChips } from "@/components/entity-links";
import { ItemEditButton } from "@/components/item-form";
import { Button } from "@/components/ui/button";
import { useRPGStore } from "@/lib/store";

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
	const [isEditing, setIsEditing] = useState(edit || false);
	const [dialogOpen, setDialogOpen] = useState(false);

	if (isLoading) return <DetailSkeleton />;

	if (!item) {
		return (
			<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<Package className="h-16 w-16 text-muted-foreground/30" />
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Item nao encontrado
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Esse registro pode ter sido removido ou ainda nao sincronizou.
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
								{currentItem.imageUrl ? (
									<img
										src={currentItem.imageUrl}
										alt={currentItem.name}
										className="h-full w-full object-cover"
									/>
								) : (
									<Gem className="h-7 w-7" strokeWidth={1.5} />
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

					<Button
						type="button"
						onClick={() => setIsEditing((current) => !current)}
						className="gap-2"
					>
						<Pencil className="h-4 w-4" />
						{isEditing ? "Concluir edição" : "Editar"}
					</Button>
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
						title="Identificacao"
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
						eyebrow="Mecanica"
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
						eyebrow="Descricao"
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

					<DetailSection eyebrow="Conexoes" title="Vinculos">
						<EntityLinkChips
							links={currentItem.entityLinks}
							emptyText="Nenhuma conexao registrada."
						/>
					</DetailSection>
				</aside>
			</div>

			<ItemEditButton
				item={currentItem}
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				trigger={null}
			/>
		</div>
	);
}
