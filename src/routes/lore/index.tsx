import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { LoreCard } from "@/components/lore-card";
import { LoreForm } from "@/components/lore-form";
import { PageHeader } from "@/components/page-header";
import { useRPGStore } from "@/lib/store";
import { useVisibleWorldEntities } from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/lore/")({
	component: RouteComponent,
});

const loadingCardKeys = ["lore-1", "lore-2", "lore-3", "lore-4"];

function RouteComponent() {
	const lores = useRPGStore((state) => state.lores);
	const visibleLores = useVisibleWorldEntities(lores);
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filteredLores = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		if (!query) return visibleLores;
		return visibleLores.filter((lore) =>
			lore.title.toLowerCase().includes(query),
		);
	}, [visibleLores, deferredSearchQuery]);

	const isLoading = useRPGStore((state) => state.isLoadingRemote);

	return (
		<div className="w-full">
			<PageHeader
				title="Lore & Notas"
				description="Arquivo de histórias, mitos e conhecimentos ocultos"
				Icon={BookOpen}
				iconColor="text-indigo-300"
				eyebrow="Arkhiveon"
				count={visibleLores.length}
				action={<LoreForm />}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<ListLayout onSearch={setSearchQuery} />

				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{isLoading
						? loadingCardKeys.map((key, i) => (
								<div
									key={key}
									className="t-stagger-item"
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									<LoreCard isLoading />
								</div>
							))
						: filteredLores.map((lore, i) => (
								<div
									key={lore.id}
									className="t-stagger-item"
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									<LoreCard lore={lore} />
								</div>
							))}
					{!isLoading && filteredLores.length === 0 && (
						<EmptyState
							Icon={BookOpen}
							title="Nenhum registro de lore"
							description="Comece a escrever a história e a mitologia do seu mundo."
						/>
					)}
				</div>
			</div>
		</div>
	);
}
