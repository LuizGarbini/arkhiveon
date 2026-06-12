import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	Calendar,
	Clock,
	FileText,
	MapPin,
	Pencil,
	ScrollText,
	Sparkles,
} from "lucide-react";
import { useState } from "react";
import {
	DetailInfo,
	DetailQuickStat,
	DetailSection,
	DetailSkeleton,
	DetailText,
} from "@/components/entity-detail";
import { EntityLinkChips } from "@/components/entity-links";
import { SessionEditButton } from "@/components/session-form";
import { Button } from "@/components/ui/button";
import { useRPGStore } from "@/lib/store";

export const Route = createFileRoute("/sessions/$sessionId")({
	validateSearch: (search: Record<string, unknown>) => ({
		edit: search.edit === true || search.edit === "true",
	}),
	component: SessionDetailPage,
});

function SessionDetailPage() {
	const { sessionId } = Route.useParams();
	const { edit } = Route.useSearch();
	const navigate = useNavigate();
	const session = useRPGStore((state) =>
		state.sessions.find((item) => item.id === sessionId),
	);
	const isLoading = useRPGStore((state) => state.isLoadingRemote);
	const [isEditing, setIsEditing] = useState(edit || false);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

	if (isLoading) return <DetailSkeleton />;

	if (!session) {
		return (
			<div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
				<ScrollText className="h-16 w-16 text-muted-foreground/30" />
				<div>
					<h2 className="font-display text-lg font-bold text-foreground">
						Sessao nao encontrada
					</h2>
					<p className="mt-1 text-[13px] text-muted-foreground">
						Esse registro pode ter sido removido ou ainda nao sincronizou.
					</p>
				</div>
				<Link to="/sessions">
					<Button variant="outline" size="sm">
						<ArrowLeft className="h-3.5 w-3.5" />
						Voltar para sessoes
					</Button>
				</Link>
			</div>
		);
	}

	const currentSession = session;
	const title =
		currentSession.title || `Sessao #${currentSession.number || "?"}`;
	const subtitle = [
		currentSession.date,
		currentSession.inGameDate,
		currentSession.mood,
	]
		.filter(Boolean)
		.join(" · ");

	function handleDialogOpenChange(open: boolean) {
		setDialogOpen(open);
		if (!open && edit) {
			void navigate({
				to: "/sessions/$sessionId",
				params: { sessionId: currentSession.id },
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
							to="/sessions"
							className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							Voltar para sessoes
						</Link>
						<div className="mt-4 flex items-start gap-4">
							<div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
								<span className="text-[9px] font-bold uppercase tracking-wider opacity-70">
									Sessao
								</span>
								<span className="font-mono text-[18px] font-bold leading-none">
									#{currentSession.number || "?"}
								</span>
							</div>
							<div className="min-w-0">
								<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
									<ScrollText className="h-3.5 w-3.5" />
									Cronica
								</div>
								<h1 className="font-display mt-3 truncate text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
									{title}
								</h1>
								<p className="mt-2 text-[13px] text-muted-foreground">
									{subtitle || "Registro da aventura"}
								</p>
							</div>
						</div>
					</div>

					<Button
						type="button"
						onClick={() => setIsEditing((current) => !current)}
						className="gap-2"
					>
						<Pencil className="h-4 w-4" />
						{isEditing ? "Concluir edição" : "Editar"}
					</Button>
				</div>

				<div className="relative mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					<DetailQuickStat
						Icon={FileText}
						label="Sessao"
						value={`#${currentSession.number || "?"}`}
						color="text-amber-300"
					/>
					<DetailQuickStat
						Icon={Calendar}
						label="Data real"
						value={currentSession.date || "-"}
						color="text-primary"
					/>
					<DetailQuickStat
						Icon={Sparkles}
						label="Data in-game"
						value={currentSession.inGameDate || "-"}
						color="text-violet-300"
					/>
					<DetailQuickStat
						Icon={Clock}
						label="Duracao"
						value={currentSession.duration || "-"}
						color="text-emerald-300"
					/>
				</div>
			</header>

			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				<main className="grid content-start gap-5">
					<DetailSection
						eyebrow="Resumo"
						title="Visao geral"
						onEdit={isEditing ? () => { setActiveTab("basic"); setDialogOpen(true); } : undefined}
					>
						<div className="grid gap-3">
							<DetailText value={currentSession.summary} />
							<div className="grid gap-3 sm:grid-cols-2">
								<DetailInfo
									Icon={MapPin}
									label="Local inicial"
									value={currentSession.location}
								/>
								<DetailInfo label="Tom" value={currentSession.mood} />
							</div>
						</div>
					</DetailSection>

					<DetailSection
						eyebrow="Mesa"
						title="Quem & onde"
						onEdit={isEditing ? () => { setActiveTab("people"); setDialogOpen(true); } : undefined}
					>
						<div className="grid gap-3">
							<DetailText
								title="Jogadores presentes"
								value={currentSession.attendees}
							/>
							<DetailText
								title="NPCs envolvidos"
								value={currentSession.npcsPresent}
							/>
							<DetailText
								title="Locais visitados"
								value={currentSession.locationsVisited}
							/>
						</div>
					</DetailSection>

					<DetailSection
						eyebrow="Eventos"
						title="Acontecimentos"
						onEdit={isEditing ? () => { setActiveTab("events"); setDialogOpen(true); } : undefined}
					>
						<div className="grid gap-3">
							<DetailText
								title="Eventos chave"
								value={currentSession.keyEvents}
							/>
							<DetailText title="Combates" value={currentSession.combatLog} />
							<DetailText
								title="Cliffhanger"
								value={currentSession.cliffhanger}
							/>
						</div>
					</DetailSection>

					<DetailSection
						eyebrow="Recompensas"
						title="Loot & XP"
						onEdit={isEditing ? () => { setActiveTab("rewards"); setDialogOpen(true); } : undefined}
					>
						<div className="grid gap-3">
							<DetailText title="Loot" value={currentSession.loot} />
							<DetailInfo
								label="XP concedido"
								value={currentSession.xpAwarded}
							/>
						</div>
					</DetailSection>
				</main>

				<aside className="grid content-start gap-5">
					<DetailSection eyebrow="Conexoes" title="Vinculos">
						<EntityLinkChips
							links={currentSession.entityLinks}
							emptyText="Nenhuma conexao registrada."
						/>
					</DetailSection>
					<DetailSection
						eyebrow="Mestre"
						title="Notas privadas"
						onEdit={isEditing ? () => { setActiveTab("dm"); setDialogOpen(true); } : undefined}
					>
						<DetailText value={currentSession.dmNotes} />
					</DetailSection>
				</aside>
			</div>

			<SessionEditButton
				session={currentSession}
				open={dialogOpen}
				onOpenChange={handleDialogOpenChange}
				defaultTab={activeTab}
				trigger={null}
			/>
		</div>
	);
}
