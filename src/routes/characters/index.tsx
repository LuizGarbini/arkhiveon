import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Plus, User } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CharacterCard } from "@/components/character-card";
import { EmptyState } from "@/components/empty-state";
import { ListLayout } from "@/components/list-layout";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { useRPGStore, useActiveCampaignRole } from "@/lib/store";

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
	const search = useSearch({ strict: false });
	const variant = ((search as any).variant as "A" | "B") || "A";
	const navigate = useNavigate({ from: Route.fullPath });
	const characters = useRPGStore((state) => state.characters);
	const activeCampaignRole = useActiveCampaignRole();
	const isViewer = activeCampaignRole === "viewer";
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
				const activeTag = document.activeElement?.tagName.toLowerCase();
				if (activeTag === "input" || activeTag === "textarea") return;

				e.preventDefault();
				void navigate({
					to: ".",
					search: (prev: any) => ({
						...prev,
						variant: variant === "B" ? "A" : "B",
					}),
				});
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [variant, navigate]);

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
					isViewer ? (
						<div className="group/tooltip relative inline-block">
							<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
								Apenas mestre ou co-mestre podem criar personagens
							</div>
							<Button size="sm" disabled className="gap-2 cursor-not-allowed opacity-50">
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
									<CharacterCard isLoading variant={variant} />
								</div>
							))
						: filteredCharacters.map((character, i) => (
								<div
									key={character.id}
									className="t-stagger-item"
									style={{ "--stagger-index": i } as React.CSSProperties}
								>
									<CharacterCard character={character} variant={variant} />
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

			{/* Prototype Switcher - Ocultado em produção */}
			{process.env.NODE_ENV !== "production" && (
				<div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full border border-white/10 bg-black/85 px-4 py-2.5 text-xs text-white shadow-xl backdrop-blur-md select-none">
					<button
						type="button"
						onClick={() => void navigate({ to: ".", search: (prev: any) => ({ ...prev, variant: variant === "B" ? "A" : "B" }) })}
						className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
						title="Anterior"
					>
						←
					</button>
					<span className="font-semibold px-1">
						Protótipo: {variant === "A" ? "A — Clássico" : "B — Full Bleed Cover (Inspirado no Mockup)"}
					</span>
					<button
						type="button"
						onClick={() => void navigate({ to: ".", search: (prev: any) => ({ ...prev, variant: variant === "B" ? "A" : "B" }) })}
						className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
						title="Próximo"
					>
						→
					</button>
				</div>
			)}
		</div>
	);
}
