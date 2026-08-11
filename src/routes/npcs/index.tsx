import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { NpcCard } from "@/components/npc-card";
import { NpcForm } from "@/components/npc-form";
import { PageHeader } from "@/components/page-header";
import { RosterStatusFilter } from "@/components/roster-status";
import {
	getNpcLifeStatus,
	matchesRosterLifeFilter,
	type RosterLifeFilter,
} from "@/lib/roster-status";
import { useRPGStore } from "@/lib/store";
import { useVisibleWorldEntities } from "@/lib/worldbuilding/hooks";

export const Route = createFileRoute("/npcs/")({
	component: RouteComponent,
});

const loadingCardKeys = ["npc-1", "npc-2", "npc-3", "npc-4"];

function RouteComponent() {
	const npcs = useRPGStore((state) => state.npcs);
	const characters = useRPGStore((state) => state.characters);
	const visibleNpcs = useVisibleWorldEntities(npcs);
	const [searchQuery, setSearchQuery] = useState("");
	const [lifeFilter, setLifeFilter] = useState<RosterLifeFilter>("all");
	const deferredSearchQuery = useDeferredValue(searchQuery);
	const characterById = useMemo(
		() => new Map(characters.map((character) => [character.id, character])),
		[characters],
	);

	const filteredNpcs = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		return visibleNpcs.filter((npc) => {
			const linkedCharacter = npc.linkedCharacterId
				? characterById.get(npc.linkedCharacterId)
				: undefined;
			const matchesQuery = query
				? [
						npc.name,
						npc.race,
						npc.role,
						npc.kind === "monster" ? "monstro monster criatura ameaça" : "npc",
					]
						.join(" ")
						.toLowerCase()
						.includes(query)
				: true;

			return (
				matchesQuery &&
				matchesRosterLifeFilter(
					getNpcLifeStatus(npc, linkedCharacter),
					lifeFilter,
				)
			);
		});
	}, [visibleNpcs, deferredSearchQuery, characterById, lifeFilter]);

	const lifeCounts = useMemo(() => {
		const counts: Record<RosterLifeFilter, number> = {
			all: visibleNpcs.length,
			alive: 0,
			wounded: 0,
			down: 0,
			dead: 0,
		};
		for (const npc of visibleNpcs) {
			const linkedCharacter = npc.linkedCharacterId
				? characterById.get(npc.linkedCharacterId)
				: undefined;
			counts[getNpcLifeStatus(npc, linkedCharacter)] += 1;
		}
		return counts;
	}, [visibleNpcs, characterById]);

	const isLoading = useRPGStore((state) => state.isLoadingRemote);

	return (
		<div className="w-full">
			<PageHeader
				title="NPCs & Monstros"
				description="Aliados, mercadores, vilões, criaturas e ameaças do enredo"
				Icon={Users}
				iconColor="text-fuchsia-300"
				eyebrow="Personagens do mestre"
				count={visibleNpcs.length}
				action={<NpcForm />}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<ListLayout onSearch={setSearchQuery} />
				<RosterStatusFilter
					value={lifeFilter}
					onChange={setLifeFilter}
					counts={lifeCounts}
				/>

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
	);
}
