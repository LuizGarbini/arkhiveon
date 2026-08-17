import { createFileRoute } from "@tanstack/react-router";
import { Map as MapIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { LocationCard } from "@/components/location-card";
import { LocationForm } from "@/components/location-form";
import { PageHeader } from "@/components/page-header";
import { useRPGStore } from "@/lib/store";
import { useVisibleWorldEntities } from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/locations/")({
	component: RouteComponent,
});

const loadingCardKeys = [
	"location-1",
	"location-2",
	"location-3",
	"location-4",
];

function RouteComponent() {
	const locations = useRPGStore((state) => state.locations);
	const visibleLocations = useVisibleWorldEntities(locations);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
		type: "all",
	});
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filterGroups = useMemo(
		() => [
			{
				id: "type",
				label: "Tipo de Local",
				options: [
					{ value: "city", label: "Cidade / Vila / Capital", icon: "🏰" },
					{ value: "dungeon", label: "Masmorra / Ruínas", icon: "⚔️" },
					{ value: "region", label: "Região / Continente", icon: "🗺️" },
					{ value: "tavern", label: "Taverna / Estalagem", icon: "🍺" },
					{ value: "nature", label: "Floresta / Montanha / Mar", icon: "🌲" },
				],
			},
		],
		[],
	);

	const filteredLocations = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		return visibleLocations.filter((location) => {
			const matchesQuery =
				!query ||
				[location.name, location.type, location.region, location.description]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(query);

			const matchesType =
				!activeFilters.type ||
				activeFilters.type === "all" ||
				location.type === activeFilters.type;

			return matchesQuery && matchesType;
		});
	}, [visibleLocations, deferredSearchQuery, activeFilters]);

	const isLoading = useRPGStore((state) => state.isLoadingRemote);

	return (
		<div className="w-full">
			<PageHeader
				title="Locais e Mapas"
				description="Cidades, dungeons e fronteiras já exploradas"
				Icon={MapIcon}
				iconColor="text-rose-300"
				eyebrow="Cartografia"
				count={visibleLocations.length}
				action={<LocationForm />}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<ListLayout
					onSearch={setSearchQuery}
					searchPlaceholder="Buscar local por nome, tipo, região..."
					filterGroups={filterGroups}
					activeFilters={activeFilters}
					onFilterChange={(id, val) => setActiveFilters((prev) => ({ ...prev, [id]: val }))}
					onClearFilters={() => setActiveFilters({ type: "all" })}
				/>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{isLoading
						? loadingCardKeys.map((key, i) => (
								<div
									key={key}
									className="t-stagger-item"
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									<LocationCard isLoading />
								</div>
							))
						: filteredLocations.map((location, i) => (
								<div
									key={location.id}
									className="t-stagger-item"
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									<LocationCard location={location} />
								</div>
							))}
					{!isLoading && filteredLocations.length === 0 && (
						<EmptyState
							Icon={MapIcon}
							title="Nenhum local encontrado"
							description="Registre os reinos e cenários que o grupo descobre."
						/>
					)}
				</div>
			</div>
		</div>
	);
}
