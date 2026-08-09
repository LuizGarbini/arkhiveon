import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Compass, MapPin, Plus, Scroll, ShieldAlert, Sparkles, User, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { ListLayout } from "@/components/list-layout";
import { QuestForm } from "@/components/quest-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { useRPGStore } from "@/lib/store";
import type { Quest } from "@/lib/store/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quests/")({
	component: QuestsPage,
});

function QuestsPage() {
	const quests = useRPGStore((state) => state.quests || []);
	const updateQuest = useRPGStore((state) => state.updateQuest);
	const removeQuest = useRPGStore((state) => state.removeQuest);

	const [searchQuery, setSearchQuery] = useState("");
	const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [editingQuest, setEditingQuest] = useState<Quest | null>(null);

	const filterGroups = [
		{
			id: "status",
			title: "Status da Missão",
			options: [
				{ label: "Em Andamento", value: "active" },
				{ label: "Concluídas", value: "completed" },
				{ label: "Falhadas", value: "failed" },
			],
		},
		{
			id: "category",
			title: "Tipo de Quest",
			options: [
				{ label: "Principais", value: "main" },
				{ label: "Secundárias", value: "side" },
			],
		},
	];

	const filteredQuests = useMemo(() => {
		return quests.filter((q) => {
			if (
				searchQuery &&
				!q.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
				!q.description?.toLowerCase().includes(searchQuery.toLowerCase()) &&
				!q.giverNpcName?.toLowerCase().includes(searchQuery.toLowerCase()) &&
				!q.locationName?.toLowerCase().includes(searchQuery.toLowerCase())
			) {
				return false;
			}

			if (
				activeFilters.status?.length &&
				!activeFilters.status.includes(q.status)
			) {
				return false;
			}

			if (
				activeFilters.category?.length &&
				!activeFilters.category.includes(q.category)
			) {
				return false;
			}

			return true;
		});
	}, [quests, searchQuery, activeFilters]);

	const activeCount = quests.filter((q) => q.status === "active").length;
	const completedCount = quests.filter((q) => q.status === "completed").length;

	return (
		<ListLayout
			title="Diário de Missões & Objetivos"
			subtitle="Acompanhe missões principais, tarefas de facção, recompensas e pistas investigativas do grupo."
			icon={Scroll}
			searchQuery={searchQuery}
			onSearchChange={setSearchQuery}
			filterGroups={filterGroups}
			activeFilters={activeFilters}
			onFilterChange={(groupId, value) => {
				setActiveFilters((prev) => {
					const current = prev[groupId] || [];
					const next = current.includes(value)
						? current.filter((v) => v !== value)
						: [...current, value];
					return { ...prev, [groupId]: next };
				});
			}}
			actionButton={
				<Button onClick={() => setIsCreateOpen(true)} className="gap-2">
					<Plus className="h-4 w-4" /> Nova Missão
				</Button>
			}
		>
			{/* Resumo de Progresso */}
			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
				<div className="rounded-xl border border-border/70 bg-card/60 p-3 flex items-center gap-3">
					<div className="h-9 w-9 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
						<Compass className="h-5 w-5" />
					</div>
					<div>
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
							Em Andamento
						</span>
						<span className="text-lg font-bold font-display text-foreground">
							{activeCount} Missões
						</span>
					</div>
				</div>

				<div className="rounded-xl border border-border/70 bg-card/60 p-3 flex items-center gap-3">
					<div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
						<CheckCircle2 className="h-5 w-5" />
					</div>
					<div>
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
							Concluídas
						</span>
						<span className="text-lg font-bold font-display text-foreground">
							{completedCount} Cumpridas
						</span>
					</div>
				</div>

				<div className="col-span-2 sm:col-span-1 rounded-xl border border-border/70 bg-card/60 p-3 flex items-center gap-3">
					<div className="h-9 w-9 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
						<Scroll className="h-5 w-5" />
					</div>
					<div>
						<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
							Total de Quests
						</span>
						<span className="text-lg font-bold font-display text-foreground">
							{quests.length} Registradas
						</span>
					</div>
				</div>
			</div>

			{filteredQuests.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-border/70 p-12 text-center space-y-3">
					<Scroll className="h-10 w-10 text-muted-foreground/50 mx-auto" />
					<h3 className="font-display font-bold text-foreground">
						Nenhuma missão encontrada
					</h3>
					<p className="text-xs text-muted-foreground max-w-sm mx-auto">
						Clique no botão "Nova Missão" acima para registrar seus objetivos e contratos de aventura.
					</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{filteredQuests.map((quest) => {
						const isCompleted = quest.status === "completed";
						const isFailed = quest.status === "failed";

						return (
							<div
								key={quest.id}
								className={cn(
									"rounded-2xl border bg-card/70 p-5 shadow-sm space-y-3.5 transition-all flex flex-col justify-between",
									isCompleted
										? "border-emerald-500/30 bg-emerald-950/10"
										: isFailed
											? "border-rose-500/30 bg-rose-950/10"
											: "border-border/70 hover:border-primary/40",
								)}
							>
								<div className="space-y-2.5">
									<div className="flex items-start justify-between gap-3">
										<div className="space-y-1">
											<div className="flex items-center gap-2">
												<span
													className={cn(
														"px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
														quest.category === "main"
															? "bg-amber-500/10 text-amber-300 border-amber-500/30"
															: "bg-muted text-muted-foreground border-border/60",
													)}
												>
													{quest.category === "main"
														? "Quest Principal"
														: "Secundária"}
												</span>

												<span
													className={cn(
														"px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1",
														isCompleted
															? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
															: isFailed
																? "bg-rose-500/15 text-rose-300 border-rose-500/30"
																: "bg-blue-500/15 text-blue-300 border-blue-500/30",
													)}
												>
													{isCompleted ? (
														<>
															<CheckCircle2 className="h-3 w-3" /> Concluída
														</>
													) : isFailed ? (
														<>
															<XCircle className="h-3 w-3" /> Falhada
														</>
													) : (
														<>
															<Compass className="h-3 w-3 animate-spin" /> Em Andamento
														</>
													)}
												</span>
											</div>

											<h3 className="font-display font-bold text-base text-foreground leading-snug">
												{quest.title}
											</h3>
										</div>
									</div>

									{quest.description && (
										<p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
											{quest.description}
										</p>
									)}

									{/* Metadados: Contratante, Local, Recompensa */}
									<div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-muted-foreground pt-1 border-t border-border/40">
										{quest.giverNpcName && (
											<span className="flex items-center gap-1">
												<User className="h-3.5 w-3.5 text-primary" />
												<strong className="text-foreground">Solicitante:</strong>{" "}
												{quest.giverNpcName}
											</span>
										)}

										{quest.locationName && (
											<span className="flex items-center gap-1">
												<MapPin className="h-3.5 w-3.5 text-amber-400" />
												<strong className="text-foreground">Local:</strong>{" "}
												{quest.locationName}
											</span>
										)}

										{quest.reward && (
											<span className="flex items-center gap-1 text-amber-300">
												<Sparkles className="h-3.5 w-3.5 text-amber-400" />
												<strong className="text-foreground">Recompensa:</strong>{" "}
												{quest.reward}
											</span>
										)}
									</div>

									{quest.notes && (
										<div className="rounded-xl bg-background/50 p-2.5 border border-border/50 text-xs text-muted-foreground/90 italic">
											"{quest.notes}"
										</div>
									)}
								</div>

								{/* Ações e Alternador de Status */}
								<div className="flex items-center justify-between pt-3 border-t border-border/50">
									<div className="flex items-center gap-1">
										<button
											type="button"
											onClick={() =>
												updateQuest(quest.id, {
													status: isCompleted ? "active" : "completed",
												})
											}
											className={cn(
												"px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 border",
												isCompleted
													? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
													: "bg-muted/60 text-muted-foreground border-border hover:bg-emerald-500/20 hover:text-emerald-300",
											)}
										>
											<CheckCircle2 className="h-3.5 w-3.5" />
											{isCompleted ? "Concluída" : "Marcar Concluída"}
										</button>
									</div>

									<div className="flex items-center gap-2">
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setEditingQuest(quest)}
											className="h-8 text-xs"
										>
											Editar
										</Button>
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => removeQuest(quest.id)}
											className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
										>
											Excluir
										</Button>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Modal de Criação */}
			<Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle className="font-display flex items-center gap-2">
							<Scroll className="h-5 w-5 text-primary" />
							Registrar Nova Missão
						</DialogTitle>
						<DialogDescription>
							Adicione uma tarefa, contrato ou objetivo principal para o diário de bordo do grupo.
						</DialogDescription>
					</DialogHeader>
					<QuestForm onClose={() => setIsCreateOpen(false)} />
				</DialogContent>
			</Dialog>

			{/* Modal de Edição */}
			<Dialog
				open={!!editingQuest}
				onOpenChange={(open) => !open && setEditingQuest(null)}
			>
				<DialogContent className="max-w-xl">
					<DialogHeader>
						<DialogTitle className="font-display flex items-center gap-2">
							<Scroll className="h-5 w-5 text-primary" />
							Editar Missão
						</DialogTitle>
						<DialogDescription>
							Atualize os detalhes, localização ou status desta quest.
						</DialogDescription>
					</DialogHeader>
					{editingQuest && (
						<QuestForm
							initialQuest={editingQuest}
							onClose={() => setEditingQuest(null)}
						/>
					)}
				</DialogContent>
			</Dialog>
		</ListLayout>
	);
}
