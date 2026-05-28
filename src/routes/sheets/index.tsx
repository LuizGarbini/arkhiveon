import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { CharacterCard } from "@/components/character-card";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/sheets/")({
	component: RouteComponent,
});

function RouteComponent() {
	const characters = useRPGStore((state) => state.characters);
	const [searchQuery, setSearchQuery] = useState("");

	const filteredCharacters = characters.filter((c) =>
		c.characterName.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	return (
		<div className="w-full">
			<PageHeader
				title="Fichas"
				description="A área mecânica para criar, editar e consultar fichas jogáveis"
				Icon={FileText}
				iconColor="text-emerald-300"
				eyebrow="Mecânicas"
				count={characters.length}
				action={
					<Link
						to="/sheets/new"
						aria-keyshortcuts="Alt+N"
						data-shortcut-action="new"
					>
						<Button size="sm" className="gap-2">
							<Plus className="h-3.5 w-3.5" />
							Nova Ficha
						</Button>
					</Link>
				}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<ListLayout onSearch={setSearchQuery} />

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filteredCharacters.map((character) => (
						<CharacterCard key={character.id} character={character} />
					))}
					{filteredCharacters.length === 0 && (
						<EmptyState
							Icon={FileText}
							title="Nenhuma ficha encontrada"
							description="Crie sua primeira ficha para começar a organizar os dados de jogo."
						/>
					)}
				</div>
			</div>
		</div>
	);
}
