import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, User } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { CharacterCard } from "@/components/character-card";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/characters/")({
	component: RouteComponent,
});

const loadingCardKeys = [
	"character-1",
	"character-2",
	"character-3",
	"character-4",
];

function RouteComponent() {
	const characters = useRPGStore((state) => state.characters);
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filteredCharacters = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		if (!query) return characters;
		return characters.filter((character) =>
			character.characterName.toLowerCase().includes(query),
		);
	}, [characters, deferredSearchQuery]);

	const isLoading = useRPGStore((state) => state.isLoadingRemote);

	return (
		<div className="w-full">
			<PageHeader
				title="Personagens"
				description="Crie, edite e consulte as fichas de todos os personagens da campanha"
				Icon={User}
				iconColor="text-violet-300"
				eyebrow="Personagens da campanha"
				count={characters.length}
				action={
					<Link
						to="/sheets/new"
						aria-keyshortcuts="Alt+N"
						data-shortcut-action="new"
					>
						<Button size="sm" className="gap-2">
							<Plus className="h-3.5 w-3.5" />
							Novo Personagem
						</Button>
					</Link>
				}
			/>

			<div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-6 pb-10 sm:px-8">
				<ListLayout onSearch={setSearchQuery} />

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{isLoading
						? loadingCardKeys.map((key) => (
								<CharacterCard key={key} isLoading />
							))
						: filteredCharacters.map((character) => (
								<CharacterCard key={character.id} character={character} />
							))}
					{!isLoading && filteredCharacters.length === 0 && (
						<EmptyState
							Icon={User}
							title="Nenhum personagem encontrado"
							description="Crie seu primeiro personagem para começar a organizar os dados de jogo."
						/>
					)}
				</div>
			</div>
		</div>
	);
}
