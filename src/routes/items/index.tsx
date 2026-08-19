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

function normalizeRarityKey(value?: string): string {
	if (!value) return "comum";
	const normalized = value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[_-]/g, " ")
		.trim();

	if (normalized === "common" || normalized === "comum") return "comum";
	if (normalized === "uncommon" || normalized === "incomum") return "incomum";
	if (normalized === "rare" || normalized === "raro") return "raro";
	if (normalized === "very rare" || normalized === "muito raro")
		return "muito raro";
	if (
		normalized === "legendary" ||
		normalized === "lendario" ||
		normalized === "lendaria"
	)
		return "lendario";
	if (normalized === "artifact" || normalized === "artefato") return "artefato";
	return normalized;
}

function matchesCategoryFilter(
	itemType: string,
	categoryFilter: string,
): boolean {
	if (!categoryFilter || categoryFilter === "all") return true;
	const normalizedType = (itemType || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();

	const normalizedCat = categoryFilter
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();

	if (!normalizedType)
		return normalizedCat === "outro" || normalizedCat === "misc";

	if (normalizedType.includes(normalizedCat)) return true;

	const categoryMap: Record<string, string[]> = {
		arma: [
			"arma",
			"weapon",
			"espada",
			"machado",
			"arco",
			"adaga",
			"lanca",
			"martelo",
			"maca",
		],
		armadura: [
			"armadura",
			"armor",
			"escudo",
			"shield",
			"traje",
			"veste",
			"elmo",
			"peitoral",
		],
		pocao: [
			"pocao",
			"potion",
			"consumivel",
			"consumable",
			"elixir",
			"oleo",
			"frasco",
			"ingrediente",
		],
		anel: [
			"anel",
			"ring",
			"amuleto",
			"amulet",
			"colar",
			"acessorio",
			"joia",
			"brinco",
			"tiara",
			"bracelete",
		],
		pergaminho: [
			"pergaminho",
			"scroll",
			"tomo",
			"tome",
			"grimoire",
			"livro",
			"grimorio",
			"carta",
			"mapa",
		],
		varinha: ["varinha", "wand", "cajado", "staff", "cetro", "foco", "orbe"],
		outro: [
			"outro",
			"misc",
			"utilitario",
			"ferramenta",
			"item",
			"equipamento",
			"moeda",
			"reliquia",
		],
	};

	const aliases = categoryMap[normalizedCat];
	if (aliases) {
		return aliases.some((alias) => normalizedType.includes(alias));
	}

	return false;
}

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
					{ value: "arma", label: "Arma", icon: "⚔️" },
					{ value: "armadura", label: "Armadura / Escudo", icon: "🛡️" },
					{ value: "pocao", label: "Poção / Consumível", icon: "🧪" },
					{ value: "anel", label: "Anel / Amuleto", icon: "💍" },
					{ value: "pergaminho", label: "Pergaminho / Grimoire", icon: "📜" },
					{ value: "varinha", label: "Varinha / Cajado", icon: "🪄" },
					{ value: "outro", label: "Outro / Utilitário", icon: "📦" },
				],
			},
			{
				id: "rarity",
				label: "Raridade",
				options: [
					{ value: "comum", label: "Comum" },
					{ value: "incomum", label: "Incomum" },
					{ value: "raro", label: "Raro" },
					{ value: "muito raro", label: "Muito Raro" },
					{ value: "lendario", label: "Lendário" },
					{ value: "artefato", label: "Artefato" },
				],
			},
		],
		[],
	);

	const filteredItems = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		const filterRarityNorm =
			activeFilters.rarity && activeFilters.rarity !== "all"
				? normalizeRarityKey(activeFilters.rarity)
				: "all";

		return visibleItems.filter((item) => {
			const matchesQuery =
				!query ||
				[
					item.name,
					item.type,
					item.rarity,
					item.description,
					item.subtype,
					item.source,
					item.stats,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(query);

			const matchesCategory = matchesCategoryFilter(
				item.type || "",
				activeFilters.category,
			);

			const itemRarityNorm = normalizeRarityKey(item.rarity);
			const matchesRarity =
				filterRarityNorm === "all" || itemRarityNorm === filterRarityNorm;

			return matchesQuery && matchesCategory && matchesRarity;
		});
	}, [visibleItems, deferredSearchQuery, activeFilters]);

	const isLoading = useRPGStore((state) => state.isLoadingRemote);
	const hasActiveFilters =
		deferredSearchQuery.trim() !== "" ||
		(activeFilters.category && activeFilters.category !== "all") ||
		(activeFilters.rarity && activeFilters.rarity !== "all");

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

			<div className="px-6 pb-10 sm:px-8">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
					<ListLayout
						onSearch={setSearchQuery}
						searchPlaceholder="Buscar item por nome, categoria, raridade, efeito..."
						filterGroups={filterGroups}
						activeFilters={activeFilters}
						onFilterChange={(id, val) =>
							setActiveFilters((prev) => ({ ...prev, [id]: val }))
						}
						onClearFilters={() => {
							setSearchQuery("");
							setActiveFilters({ category: "all", rarity: "all" });
						}}
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
					</div>

					{!isLoading &&
						filteredItems.length === 0 &&
						(hasActiveFilters ? (
							<EmptyState
								Icon={Package}
								title="Nenhum item corresponde aos filtros"
								description="Tente ajustar os termos de busca ou remover os filtros aplicados."
								actionLabel="Limpar filtros"
								onAction={() => {
									setSearchQuery("");
									setActiveFilters({ category: "all", rarity: "all" });
								}}
							/>
						) : (
							<EmptyState
								Icon={Package}
								title="Nenhum item cadastrado"
								description="Adicione armas, armaduras, poções ou itens mágicos ao catálogo da campanha."
							/>
						))}
				</div>
			</div>
		</div>
	);
}
