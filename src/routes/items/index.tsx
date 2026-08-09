import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ItemCard } from "@/components/item-card";
import { ItemForm } from "@/components/item-form";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { useRPGStore } from "@/lib/store";
import { useVisibleWorldEntities } from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/items/")({
	component: RouteComponent,
});

const loadingCardKeys = ["item-1", "item-2", "item-3", "item-4"];

function RouteComponent() {
	const items = useRPGStore((state) => state.items);
	const visibleItems = useVisibleWorldEntities(items);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
		category: "all",
		rarity: "all",
	});
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filterGroups = useMemo(
		() => [
			{
				id: "category",
				label: "Categoria do Item",
				options: [
					{ value: "weapon", label: "Arma", icon: "⚔️" },
					{ value: "armor", label: "Armadura / Escudo", icon: "🛡️" },
					{ value: "potion", label: "Poção / Consumível", icon: "🧪" },
					{ value: "ring", label: "Anel / Amuleto", icon: "💍" },
					{ value: "scroll", label: "Pergaminho / Grimoire", icon: "📜" },
					{ value: "wand", label: "Varinha / Cajado", icon: "🪄" },
					{ value: "misc", label: "Outro / Utilitário", icon: "📦" },
				],
			},
			{
				id: "rarity",
				label: "Raridade",
				options: [
					{ value: "common", label: "Comum" },
					{ value: "uncommon", label: "Incomum" },
					{ value: "rare", label: "Raro" },
					{ value: "very_rare", label: "Muito Raro" },
					{ value: "legendary", label: "Lendário" },
					{ value: "artifact", label: "Artefato" },
				],
			},
		],
		[],
	);

	const filteredItems = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		return visibleItems.filter((item) => {
			const matchesQuery =
				!query ||
				[item.name, item.category, item.rarity, item.description]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(query);

			const matchesCategory =
				!activeFilters.category ||
				activeFilters.category === "all" ||
				item.category === activeFilters.category;

			const matchesRarity =
				!activeFilters.rarity ||
				activeFilters.rarity === "all" ||
				item.rarity === activeFilters.rarity;

			return matchesQuery && matchesCategory && matchesRarity;
		});
	}, [visibleItems, deferredSearchQuery, activeFilters]);

	const isLoading = useRPGStore((state) => state.isLoadingRemote);

	return (
		<div className="w-full">
			<PageHeader
				title="Itens & Inventário"
				description="Tesouros, armas, poções e relíquias da sua campanha"
				Icon={Package}
				iconColor="text-emerald-300"
				eyebrow="Tesouro"
				count={visibleItems.length}
				action={<ItemForm />}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<ListLayout
					onSearch={setSearchQuery}
					searchPlaceholder="Buscar item por nome, categoria, raridade..."
					filterGroups={filterGroups}
					activeFilters={activeFilters}
					onFilterChange={(id, val) => setActiveFilters((prev) => ({ ...prev, [id]: val }))}
					onClearFilters={() => setActiveFilters({ category: "all", rarity: "all" })}
				/>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{isLoading
						? loadingCardKeys.map((key, i) => (
								<div
									key={key}
									className="t-stagger-item"
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									<ItemCard isLoading />
								</div>
							))
						: filteredItems.map((item, i) => (
								<div
									key={item.id}
									className="t-stagger-item"
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									<ItemCard item={item} />
								</div>
							))}
					{!isLoading && filteredItems.length === 0 && (
						<EmptyState
							Icon={Package}
							title="Nenhum item encontrado"
							description="Adicione armas, armaduras ou itens mágicos ao seu inventário."
						/>
					)}
				</div>
			</div>
		</div>
	);
}
