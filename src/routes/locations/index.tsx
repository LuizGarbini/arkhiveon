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
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filteredLocations = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		if (!query) return visibleLocations;
		return visibleLocations.filter((location) =>
			location.name.toLowerCase().includes(query),
		);
	}, [visibleLocations, deferredSearchQuery]);

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
				<ListLayout onSearch={setSearchQuery} />

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
