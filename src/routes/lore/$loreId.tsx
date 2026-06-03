import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	BookOpen,
	EyeOff,
	Lock,
	Pencil,
	ScrollText,
	Sparkles,
	Tags,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	DetailInfo,
	DetailQuickStat,
	DetailSection,
	DetailSkeleton,
	DetailText,
} from "@/components/entity-detail";
import { EntityLinkChips } from "@/components/entity-links";
import { LoreEditButton } from "@/components/lore-form";
import { Button } from "@/components/ui/button";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/lore/$loreId")({
	validateSearch: (search: Record<string, unknown>) => ({
		edit: search.edit === true || search.edit === "true",
	}),
	component: LoreDetailPage,
});

const importanceLabels: Record<string, string> = {
	minor: "Curiosidade",
	supporting: "Relevante",
	major: "Importante",
	core: "Central",
};

function LoreDetailPage() {
	const { loreId } = Route.useParams();
	const { edit } = Route.useSearch();
	const navigate = useNavigate();
	const lore = useRPGStore((state) =>
		state.lores.find((entry) => entry.id === loreId),
	);
	const isLoading = useRPGStore((state) => state.isLoadingRemote);
	const [editOpen, setEditOpen] = useState(edit);

	useEffect(() => {
		if (edit) setEditOpen(true);
	}, [edit]);

	const tags = useMemo(
		() =>
			(lore?.tags ?? "")
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean),
		[lore?.tags],
	);

	if (isLoading) return <DetailSkeleton />;

	if (!lore) {
		return (
			<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<BookOpen className="h-16 w-16 text-muted-foreground/30" />
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Lore nao encontrado
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Esse registro pode ter sido removido ou ainda nao sincronizou.
					</p>
				</div>
				<Link to="/lore">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para lore
					</Button>
				</Link>
			</div>
		);
	}

	const currentLore = lore;
	const subtitle = [currentLore.category, currentLore.era]
		.filter(Boolean)
		.join(" · ");
	const importance =
		importanceLabels[currentLore.importance] ?? currentLore.importance;

	function handleEditOpenChange(open: boolean) {
		setEditOpen(open);
		if (!open && edit) {
			void navigate({
				to: "/lore/$loreId",
				params: { loreId: currentLore.id },
				search: { edit: false },
				replace: true,
			});
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="min-w-0">
						<Link
							to="/lore"
							className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Voltar para lore
						</Link>
						<div className="mt-4 flex items-start gap-4">
							<div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/20">
								{currentLore.imageUrl ? (
									<img
										src={currentLore.imageUrl}
										alt={currentLore.title}
										className="h-full w-full object-cover"
									/>
								) : (
									<BookOpen className="h-7 w-7" strokeWidth={1.5} />
								)}
								{currentLore.isSecret && (
									<Lock className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-card p-0.5 text-rose-400 ring-1 ring-border" />
								)}
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<BookOpen className="h-3.5 w-3.5" />
									Lore
								</div>
								<h1 className="font-display mt-3 truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
									{currentLore.title || "Lore sem titulo"}
								</h1>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{subtitle || "Arquivo do mundo"}
								</p>
							</div>
						</div>
					</div>

					<Button
						type="button"
						onClick={() => setEditOpen(true)}
						className="gap-2"
					>
						<Pencil className="h-4 w-4" />
						Editar
					</Button>
				</div>

				<div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<DetailQuickStat
						Icon={Sparkles}
						label="Importancia"
						value={importance}
						color="text-amber-300"
					/>
					<DetailQuickStat
						Icon={ScrollText}
						label="Categoria"
						value={currentLore.category || "-"}
						color="text-primary"
					/>
					<DetailQuickStat
						Icon={Tags}
						label="Tags"
						value={String(tags.length)}
						color="text-indigo-300"
					/>
					<DetailQuickStat
						Icon={currentLore.isSecret ? Lock : EyeOff}
						label="Segredo"
						value={currentLore.isSecret ? "Sim" : "Nao"}
						color={
							currentLore.isSecret ? "text-rose-300" : "text-muted-foreground"
						}
					/>
				</div>
			</header>

			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<main className="grid content-start gap-5">
					<DetailSection eyebrow="Conteudo" title="Registro principal">
						<DetailText value={currentLore.content} />
					</DetailSection>

					<DetailSection eyebrow="Contexto" title="Referencia">
						<div className="grid gap-3 sm:grid-cols-2">
							<DetailInfo label="Era / periodo" value={currentLore.era} />
							<DetailInfo label="Fonte" value={currentLore.source} />
							<DetailInfo label="Conhecido por" value={currentLore.knownBy} />
							<DetailInfo
								label="Entidades relacionadas"
								value={currentLore.relatedEntities}
							/>
						</div>
					</DetailSection>

					<DetailSection eyebrow="Tags" title="Marcadores">
						{tags.length > 0 ? (
							<div className="flex flex-wrap gap-2">
								{tags.map((tag) => (
									<span
										key={tag}
										className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-bold text-primary"
									>
										#{tag}
									</span>
								))}
							</div>
						) : (
							<p className="text-[12px] text-muted-foreground">
								Nenhuma tag registrada.
							</p>
						)}
					</DetailSection>
				</main>

				<aside className="grid content-start gap-5">
					<DetailSection eyebrow="Conexoes" title="Vinculos">
						<EntityLinkChips
							links={currentLore.entityLinks}
							emptyText="Nenhuma conexao registrada."
						/>
					</DetailSection>
					<DetailSection eyebrow="Mestre" title="Notas privadas">
						<DetailText value={currentLore.notes} />
					</DetailSection>
				</aside>
			</div>

			<LoreEditButton
				lore={currentLore}
				open={editOpen}
				onOpenChange={handleEditOpenChange}
				trigger={null}
			/>
		</div>
	);
}
