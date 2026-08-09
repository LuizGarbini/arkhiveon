import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, User } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { CharacterCard } from "@/components/character-card";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useActiveCampaignRole, useRPGStore } from "@/lib/store";

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
	const activeCampaignRole = useActiveCampaignRole();
	const isViewer = activeCampaignRole === "viewer";

	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilters, setActiveFilters] = useState<Record<string, string>>({
		system: "all",
		level: "all",
	});
	const deferredSearchQuery = useDeferredValue(searchQuery);

	const filterGroups = useMemo(
		() => [
			{
				id: "system",
				label: "Sistema",
				options: [
					{ value: "dnd5e", label: "D&D 5e / 2024", icon: "🐉" },
					{ value: "ordem", label: "Ordem Paranormal", icon: "👁️" },
					{ value: "coc", label: "Call of Cthulhu 7e", icon: "🐙" },
					{ value: "vampire", label: "Vampiro: A Máscara", icon: "🌙" },
					{ value: "tormenta20", label: "Tormenta20", icon: "⚔️" },
					{ value: "pathfinder", label: "Pathfinder 2e", icon: "📜" },
					{ value: "generic", label: "Genérico", icon: "🎲" },
				],
			},
			{
				id: "level",
				label: "Faixa de Nível",
				options: [
					{ value: "low", label: "Nível 1 - 4 (Iniciante)" },
					{ value: "mid", label: "Nível 5 - 10 (Heroico)" },
					{ value: "high", label: "Nível 11 - 16 (Lendário)" },
					{ value: "epic", label: "Nível 17+ (Épico)" },
				],
			},
		],
		[],
	);

	const handleFilterChange = (filterId: string, value: string) => {
		setActiveFilters((prev) => ({ ...prev, [filterId]: value }));
	};

	const handleClearFilters = () => {
		setActiveFilters({ system: "all", level: "all" });
	};

	const filteredCharacters = useMemo(() => {
		const query = deferredSearchQuery.trim().toLowerCase();
		return characters.filter((character) => {
			const matchesQuery =
				!query ||
				[
					character.characterName,
					character.playerName,
					character.race,
					character.class,
					character.subclass,
					character.title,
					character.nickname,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(query);

			const matchesSystem =
				!activeFilters.system ||
				activeFilters.system === "all" ||
				character.system === activeFilters.system;

			const lvl = character.level || 1;
			const matchesLevel =
				!activeFilters.level ||
				activeFilters.level === "all" ||
				(activeFilters.level === "low" && lvl >= 1 && lvl <= 4) ||
				(activeFilters.level === "mid" && lvl >= 5 && lvl <= 10) ||
				(activeFilters.level === "high" && lvl >= 11 && lvl <= 16) ||
				(activeFilters.level === "epic" && lvl >= 17);

			return matchesQuery && matchesSystem && matchesLevel;
		});
	}, [characters, deferredSearchQuery, activeFilters]);

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
					isViewer ? (
						<div className="group/tooltip relative inline-block">
							<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
								Apenas mestre ou co-mestre podem criar personagens
							</div>
							<Button
								size="sm"
								disabled
								className="gap-2 cursor-not-allowed opacity-50"
							>
								<Plus className="h-3.5 w-3.5" />
								Novo Personagem
							</Button>
						</div>
					) : (
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
					)
				}
			/>

			<div className="px-6 pb-10 sm:px-8">
				<div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
					<ListLayout
						onSearch={setSearchQuery}
						searchPlaceholder="Buscar personagem por nome, classe, raça, título..."
						filterGroups={filterGroups}
						activeFilters={activeFilters}
						onFilterChange={handleFilterChange}
						onClearFilters={handleClearFilters}
					/>

					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{isLoading
							? loadingCardKeys.map((key, i) => (
									<div
										key={key}
										className="t-stagger-item"
										style={{ "--stagger-index": i } as React.CSSProperties}
									>
										<CharacterCard isLoading />
									</div>
								))
							: filteredCharacters.map((character, i) => (
									<div
										key={character.id}
										className="t-stagger-item"
										style={{ "--stagger-index": i } as React.CSSProperties}
									>
										<CharacterCard character={character} />
									</div>
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
		</div>
	);
}
