import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Gift, MapPin, Plus, Scroll, User } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import type { Quest } from "@/lib/store/types";
import { DashboardSectionUnavailable } from "./dashboard-load-error";

function QuestsTitle() {
	return (
		<div className="flex items-center gap-2.5">
			<div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
				<Scroll className="h-4 w-4" />
			</div>
			<div>
				<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
					Missões em Andamento
				</h2>
			</div>
		</div>
	);
}

interface DashboardActiveQuestsProps {
	quests: Quest[];
	isViewer: boolean;
	/** Falha global da carga: estado neutro, sem vazio, CTA ou contagem. */
	isUnavailable?: boolean;
}

export function DashboardActiveQuests({
	quests,
	isViewer,
	isUnavailable,
}: DashboardActiveQuestsProps) {
	const activeQuests = useMemo(
		() => quests.filter((q) => q.status === "active"),
		[quests],
	);

	const completedCount = useMemo(
		() => quests.filter((q) => q.status === "completed").length,
		[quests],
	);

	if (isUnavailable) {
		return (
			<DashboardSectionUnavailable
				title="Missões em Andamento"
				icon={<Scroll className="h-4 w-4" />}
			/>
		);
	}

	return (
		<div
			data-dash-section="active-quests"
			className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:border-border"
		>
			{/* Section Header */}
			<div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/50 pb-4">
				<QuestsTitle />

				<div className="flex flex-wrap items-center gap-2">
					<span className="shrink-0 whitespace-nowrap rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-amber-400">
						{activeQuests.length} Ativa{activeQuests.length === 1 ? "" : "s"}
					</span>
					<Link
						to="/quests"
						className="inline-flex min-h-[44px] shrink-0 select-none items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-muted-foreground transition-colors duration-150 ease-out sm:min-h-8 [@media(hover:hover)]:hover:text-primary"
					>
						Ver todas ({quests.length})
						<ArrowUpRight className="h-3 w-3" />
					</Link>
					{!isViewer && (
						<Button
							nativeButton={false}
							size="sm"
							variant="outline"
							className="min-h-[44px] gap-1.5 px-3 text-xs sm:min-h-8"
							render={
								<Link to="/quests" role="link">
									<Plus className="h-3.5 w-3.5" />
									Nova Missão
								</Link>
							}
						/>
					)}
				</div>
			</div>

			{/* Quests List */}
			{activeQuests.length > 0 ? (
				<div className="mt-4 space-y-3">
					{activeQuests.slice(0, 3).map((quest) => (
						<div
							key={quest.id}
							className="group t-hover-lift rounded-xl border border-border/60 bg-background/40 p-4 hover:border-primary/40 hover:bg-background/60"
						>
							<div className="flex items-start justify-between gap-2">
								<div className="flex flex-wrap items-center gap-2">
									<span
										className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider select-none ${
											quest.category === "main"
												? "border border-amber-500/40 bg-amber-500/15 text-amber-300"
												: "border border-border/80 bg-muted/60 text-muted-foreground"
										}`}
									>
										{quest.category === "main" ? "Principal" : "Secundária"}
									</span>
									<Link
										to="/quests"
										className="font-bold text-sm text-foreground hover:text-primary transition-colors"
									>
										{quest.title}
									</Link>
								</div>
								<Link
									to="/quests"
									className="text-muted-foreground hover:text-primary transition-colors"
								>
									<ArrowUpRight className="t-arrow-reveal h-4 w-4" />
								</Link>
							</div>

							{quest.description && (
								<p className="mt-2 text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
									{quest.description}
								</p>
							)}

							{/* Quest Meta Details */}
							<div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
								{quest.giverNpcName && (
									<span className="inline-flex items-center gap-1">
										<User className="h-3 w-3 text-primary" />
										<span>Contratante: {quest.giverNpcName}</span>
									</span>
								)}
								{quest.locationName && (
									<span className="inline-flex items-center gap-1">
										<MapPin className="h-3 w-3 text-rose-400" />
										<span>{quest.locationName}</span>
									</span>
								)}
								{quest.reward && (
									<span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
										<Gift className="h-3 w-3" />
										<span>{quest.reward}</span>
									</span>
								)}
							</div>
						</div>
					))}

					{activeQuests.length > 3 && (
						<div className="pt-1 text-center">
							<Link
								to="/quests"
								className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
							>
								+ {activeQuests.length - 3} outra
								{activeQuests.length - 3 === 1 ? "" : "s"} missão
								{activeQuests.length - 3 === 1 ? "" : "ões"} ativa
								{activeQuests.length - 3 === 1 ? "" : "s"} no diário
							</Link>
						</div>
					)}
				</div>
			) : (
				<div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center bg-background/30">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400 mb-2">
						<Scroll className="h-5 w-5" />
					</div>
					<p className="text-sm font-bold text-foreground">
						Nenhuma missão ativa
					</p>
					<p className="mt-1 max-w-xs text-xs text-muted-foreground">
						{completedCount > 0
							? `Todas as ${completedCount} missões anteriores foram concluídas!`
							: "Adicione objetivos e ganchos de quests para guiar a aventura dos jogadores."}
					</p>
				</div>
			)}
		</div>
	);
}
