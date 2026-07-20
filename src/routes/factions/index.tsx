import { createFileRoute } from "@tanstack/react-router";
import { Flag } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { FactionCard } from "@/components/faction-card";
import { FactionForm } from "@/components/faction-form";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/factions/")({
	component: RouteComponent,
});

function RouteComponent() {
	const factions = useRPGStore((s) => s.factions);
	const isLoading = useRPGStore((s) => s.isLoadingRemote);
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filtered = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		if (!query) return factions;
		return factions.filter((f) =>
			[f.name, f.leader, f.seat, f.alignment, f.influence]
				.join(" ")
				.toLowerCase()
				.includes(query),
		);
	}, [factions, deferredSearchQuery]);

	return (
		<div className="w-full">
			<PageHeader
				title="Facções"
				description="Organizações do Mundo e reputação por campanha"
				Icon={Flag}
				iconColor="text-emerald-300"
				eyebrow="Worldbuilding"
				count={factions.length}
				action={<FactionForm />}
			/>
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<ListLayout onSearch={setSearchQuery} />
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
						Icon={Flag}
						title="Nenhuma facção"
						description="Crie organizações para o Mundo e acompanhe a reputação em cada mesa."
					/>
				)}
			</div>
		</div>
	);
}
