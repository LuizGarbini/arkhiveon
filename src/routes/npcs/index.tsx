import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { NpcCard } from "@/components/npc-card";
import { NpcForm } from "@/components/npc-form";
import { PageHeader } from "@/components/page-header";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/npcs/")({
	component: RouteComponent,
});

const loadingCardKeys = ["npc-1", "npc-2", "npc-3", "npc-4"];

function RouteComponent() {
	const npcs = useRPGStore((state) => state.npcs);
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filteredNpcs = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		if (!query) return npcs;
		return npcs.filter((npc) =>
			[
				npc.name,
				npc.race,
				npc.role,
				npc.kind === "monster" ? "monstro monster criatura ameaça" : "npc",
			]
				.join(" ")
				.toLowerCase()
				.includes(query),
		);
	}, [npcs, deferredSearchQuery]);

	const isLoading = useRPGStore((state) => state.isLoadingRemote);

	return (
		<div className="w-full">
			<PageHeader
				title="NPCs & Monstros"
				description="Aliados, mercadores, vilões, criaturas e ameaças do enredo"
				Icon={Users}
				iconColor="text-fuchsia-300"
				eyebrow="Personagens do mestre"
				count={npcs.length}
				action={<NpcForm />}
			/>

			<div className="px-6 pb-10 sm:px-8">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
					<ListLayout onSearch={setSearchQuery} />

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{isLoading
							? loadingCardKeys.map((key, i) => (
									<div
										key={key}
										className="t-stagger-item"
										style={{ "--stagger-index": i } as React.CSSProperties}
									>
										<NpcCard isLoading />
									</div>
								))
							: filteredNpcs.map((npc, i) => (
									<div
										key={npc.id}
										className="t-stagger-item"
										style={{ "--stagger-index": i } as React.CSSProperties}
									>
										<NpcCard npc={npc} />
									</div>
								))}
						{!isLoading && filteredNpcs.length === 0 && (
							<EmptyState
								Icon={Users}
								title="Nenhum NPC ou monstro encontrado"
								description="Crie aliados, coadjuvantes ou criaturas para enriquecer o seu mundo."
							/>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
