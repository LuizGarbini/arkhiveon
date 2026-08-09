import { createFileRoute } from "@tanstack/react-router";
import { Crown, Sparkles } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { FactionCard } from "@/components/faction-card";
import { FactionForm } from "@/components/faction-form";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { useRPGStore } from "@/lib/store";
import type { FactionKind } from "@/lib/store/types";
import { getFactionsTabConfig } from "@/lib/systems";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/factions/")({
	component: RouteComponent,
});

const CATEGORY_FILTERS: Array<{ id: FactionKind | "all"; label: string; icon: string }> = [
	{ id: "all", label: "Todos", icon: "🌐" },
	{ id: "patron", label: "Patronos de Grupo", icon: "👑" },
	{ id: "noble_house", label: "Famílias Nobres", icon: "🏰" },
	{ id: "guild_order", label: "Ordens & Guildas", icon: "⚔️" },
	{ id: "cult_society", label: "Cultos & Seitas", icon: "👁️" },
	{ id: "faction", label: "Facções Políticas", icon: "🚩" },
];

function RouteComponent() {
	const factions = useRPGStore((s) => s.factions);
	const campaigns = useRPGStore((s) => s.campaigns);
	const activeCampaignId = useRPGStore((s) => s.activeCampaignId);
	const isLoading = useRPGStore((s) => s.isLoadingRemote);

	const activeCampaign = useMemo(
		() => campaigns.find((c) => c.id === activeCampaignId),
		[campaigns, activeCampaignId],
	);

	const tabConfig = useMemo(
		() => getFactionsTabConfig(activeCampaign?.system),
		[activeCampaign?.system],
	);

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<FactionKind | "all">("all");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	// Patrono ativo do grupo (se houver)
	const activeGroupPatron = useMemo(
		() => factions.find((f) => f.kind === "patron"),
		[factions],
	);

	const filtered = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		return factions.filter((f) => {
			const matchesCategory =
				selectedCategory === "all" || (f.kind ?? "faction") === selectedCategory;
			const matchesQuery =
				!query ||
				[f.name, f.leader, f.seat, f.alignment, f.influence, f.patronType, f.perks, f.duties]
					.join(" ")
					.toLowerCase()
					.includes(query);
			return matchesCategory && matchesQuery;
		});
	}, [factions, selectedCategory, deferredSearchQuery]);

	return (
		<div className="w-full">
			<PageHeader
				title={tabConfig.label}
				description={tabConfig.description}
				Icon={tabConfig.Icon}
				iconColor={tabConfig.accentColor}
				eyebrow={tabConfig.eyebrow}
				count={factions.length}
				action={<FactionForm />}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 pb-10 sm:px-8">
				{/* Hero Card para Patrono Ativo do Grupo (D&D 5e / 2024) */}
				{activeGroupPatron && (
					<div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-linear-to-r from-amber-950/40 via-card/90 to-card p-6 shadow-xl shadow-amber-950/20 backdrop-blur-md">
						<div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
						<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<div className="flex items-start gap-4">
								<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30">
									<Crown className="h-6 w-6" />
								</div>
								<div className="space-y-1">
									<div className="flex items-center gap-2">
										<span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
											👑 Patrono do Grupo
										</span>
										{activeGroupPatron.patronType && (
											<span className="text-[10px] font-bold text-amber-200/80">
												({activeGroupPatron.patronType})
											</span>
										)}
									</div>
									<h2 className="text-xl font-bold font-display text-foreground">
										{activeGroupPatron.name}
									</h2>
									<p className="text-xs text-muted-foreground max-w-2xl">
										{activeGroupPatron.description || "Patrono ativo patrocinando os aventureiros da mesa."}
									</p>
								</div>
							</div>

							{(activeGroupPatron.perks || activeGroupPatron.duties) && (
								<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:w-1/2 pt-2 md:pt-0">
									{activeGroupPatron.perks && (
										<div className="p-3 rounded-xl border border-amber-500/20 bg-black/40 space-y-1">
											<span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
												<Sparkles className="h-3 w-3" /> Favores & Recursos
											</span>
											<p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
												{activeGroupPatron.perks}
											</p>
										</div>
									)}
									{activeGroupPatron.duties && (
										<div className="p-3 rounded-xl border border-border/40 bg-black/40 space-y-1">
											<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
												📜 Deveres do Grupo
											</span>
											<p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
												{activeGroupPatron.duties}
											</p>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				)}

				{/* Filtros por Categoria e Busca */}
				<div className="space-y-4">
					<ListLayout onSearch={setSearchQuery} />

					<div className="flex flex-wrap items-center gap-2 pt-1">
						{CATEGORY_FILTERS.map((cat) => (
							<button
								key={cat.id}
								type="button"
								onClick={() => setSelectedCategory(cat.id)}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border",
									selectedCategory === cat.id
										? "border-primary bg-primary/15 text-primary shadow-xs"
										: "border-border/60 bg-card/40 text-muted-foreground hover:bg-card hover:text-foreground",
								)}
							>
								<span>{cat.icon}</span>
								<span>{cat.label}</span>
							</button>
						))}
					</div>
				</div>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{isLoading
						? ["f1", "f2", "f3", "f4"].map((key) => (
								<FactionCard key={key} isLoading />
							))
						: filtered.map((faction) => (
								<FactionCard key={faction.id} faction={faction} />
							))}
				</div>

				{!isLoading && filtered.length === 0 && (
					<EmptyState
						Icon={tabConfig.Icon}
						title={`Nenhum registro em ${tabConfig.label}`}
						description="Crie patronos, famílias nobiliárquicas, guildas e cultos para o seu Mundo."
					/>
				)}
			</div>
		</div>
	);
}
