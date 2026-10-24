import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Package, Plus } from "lucide-react";
import { useMemo } from "react";
import {
	CARD_IGNORES_AVATAR_HOVER,
	EntityImageViewer,
} from "@/components/images/entity-image-viewer";
import { PartyLootDialog } from "@/components/party-loot-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveItemImageUrl } from "@/lib/character-images";
import { useActiveCampaignRole, useImageAssetLookup } from "@/lib/store";
import type { Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { DashboardSectionUnavailable } from "./dashboard-load-error";
import {
	DashboardSectionHeaderSkeleton,
	DashboardSkeletonGroup,
} from "./dashboard-skeleton";

const SKELETON_CARDS_2 = ["a", "b"] as const;

interface DashboardQuickVaultProps {
	items: Item[];
	isViewer: boolean;
	isLoading?: boolean;
	/** Falha global da carga: estado neutro, sem vazio, CTA ou contagem. */
	isUnavailable?: boolean;
}

const RARITY_STYLES: Record<string, string> = {
	common: "border-border/60 bg-muted/40 text-muted-foreground",
	uncommon: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
	rare: "border-sky-500/30 bg-sky-500/10 text-sky-400",
	very_rare: "border-purple-500/30 bg-purple-500/10 text-purple-400",
	legendary: "border-amber-500/40 bg-amber-500/15 text-amber-300",
	artifact: "border-rose-500/40 bg-rose-500/15 text-rose-300",
};

export function DashboardQuickVault({
	items,
	isViewer,
	isLoading,
	isUnavailable,
}: DashboardQuickVaultProps) {
	const imageAssetLookup = useImageAssetLookup();
	const activeCampaignRole = useActiveCampaignRole();
	const highlightedItems = useMemo(() => {
		// Prioritize attuned, equipped, or rare items
		const attunedOrEquipped = items.filter(
			(i) =>
				i.requiresAttunement ||
				i.equipped ||
				i.rarity === "legendary" ||
				i.rarity === "artifact",
		);
		return (attunedOrEquipped.length > 0 ? attunedOrEquipped : items).slice(
			0,
			4,
		);
	}, [items]);

	if (isUnavailable) {
		return (
			<DashboardSectionUnavailable
				title="Itens & Tesouros Relevantes"
				icon={<Package className="h-4 w-4" />}
			/>
		);
	}

	if (isLoading) {
		return (
			<div
				data-dash-section="quick-vault"
				className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
			>
				<DashboardSectionHeaderSkeleton
					icon={<Package className="h-4 w-4" />}
					iconClassName="border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
					actionClassName="w-[167px]"
					title="Itens & Tesouros Relevantes"
				/>
				<DashboardSkeletonGroup className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
					{SKELETON_CARDS_2.map((key) => (
						<Skeleton key={key} className="h-[90px] w-full rounded-xl" />
					))}
				</DashboardSkeletonGroup>
			</div>
		);
	}

	return (
		<div
			data-dash-section="quick-vault"
			className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:border-border"
		>
			{/* Section Header */}
			<div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
				<div className="flex items-center gap-2.5">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
						<Package className="h-4 w-4" />
					</div>
					<div>
						<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
							Itens & Tesouros Relevantes
						</h2>
					</div>
				</div>

				<div className="flex items-center gap-2 select-none">
					<PartyLootDialog
						trigger={
							<Button
								variant="outline"
								size="xs"
								className="h-7 gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-[11px] font-semibold"
							>
								<Package className="h-3 w-3" />
								<span>Mochila</span>
							</Button>
						}
					/>
					<Link
						to="/items"
						className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
					>
						Ver todos ({items.length})
						<ArrowUpRight className="h-3 w-3" />
					</Link>
				</div>
			</div>

			{/* Items Content */}
			{highlightedItems.length > 0 ? (
				<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
					{highlightedItems.map((item) => {
						const rarityClass =
							RARITY_STYLES[item.rarity?.toLowerCase()] || RARITY_STYLES.common;

						return (
							<div
								key={item.id}
								className={cn(
									"group t-hover-lift rounded-xl border border-border/60 bg-background/40 p-3.5 hover:border-emerald-500/30 hover:bg-background/60",
									CARD_IGNORES_AVATAR_HOVER,
								)}
							>
								<div className="flex items-start gap-3">
									<div className="relative shrink-0">
										<div className="h-9 w-9 overflow-hidden rounded-lg border border-border/70 bg-card">
											{item.imageUrl ? (
												<img
													src={item.imageUrl}
													alt={item.name}
													className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center font-bold text-emerald-400 text-xs group-hover:scale-110 transition-transform">
													<Package className="h-4 w-4" />
												</div>
											)}
										</div>
										<EntityImageViewer
											variant="avatar"
											src={resolveItemImageUrl(
												item,
												imageAssetLookup,
												activeCampaignRole,
											)}
											name={item.name ?? ""}
											className="rounded-lg"
										/>
									</div>

									<div className="min-w-0 flex-1">
										<div className="flex items-center justify-between gap-1">
											<Link
												to="/items"
												className="font-bold text-sm text-foreground truncate hover:text-primary transition-colors"
											>
												{item.name}
											</Link>
											{item.equipped && (
												<span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
													Equipado
												</span>
											)}
										</div>

										<p className="text-[11px] text-muted-foreground truncate">
											{item.type || "Item"}{" "}
											{item.owner ? `• Portador: ${item.owner}` : ""}
										</p>

										<div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
											{item.rarity && (
												<span
													className={`rounded-md border px-1.5 py-0.5 font-bold uppercase tracking-wider ${rarityClass}`}
												>
													{item.rarity}
												</span>
											)}
											{item.requiresAttunement && (
												<span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-1.5 py-0.5 text-purple-300 font-semibold">
													{item.attunedTo
														? `Sintonizado: ${item.attunedTo}`
														: "Requer Sincronização"}
												</span>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			) : (
				<div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center bg-background/30">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-2">
						<Package className="h-5 w-5" />
					</div>
					<p className="text-sm font-bold text-foreground">
						Nenhum item cadastrado
					</p>
					<p className="mt-1 max-w-xs text-xs text-muted-foreground">
						Organize tesouros, armas mágicas e artefatos conquistados pelo
						grupo.
					</p>
					{!isViewer && (
						<Link to="/items" className="mt-3">
							<Button size="sm" variant="outline" className="gap-1.5 text-xs">
								<Plus className="h-3.5 w-3.5" />
								Adicionar Item
							</Button>
						</Link>
					)}
				</div>
			)}
		</div>
	);
}
