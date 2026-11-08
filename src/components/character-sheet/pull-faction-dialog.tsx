import { Link } from "@tanstack/react-router";
import { Check, Crown, Flag, Plus, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { Faction, FactionKind } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CATEGORY_FILTERS: Array<{
	id: FactionKind | "all";
	label: string;
	icon: string;
}> = [
	{ id: "all", label: "Todos", icon: "🌐" },
	{ id: "patron", label: "Patronos de Grupo", icon: "👑" },
	{ id: "legendary_family", label: "Famílias Lendárias", icon: "⚜️" },
	{ id: "noble_house", label: "Famílias Nobres", icon: "🏰" },
	{ id: "guild_order", label: "Ordens & Guildas", icon: "⚔️" },
	{ id: "cult_society", label: "Cultos & Seitas", icon: "👁️" },
	{ id: "faction", label: "Facções Políticas", icon: "🚩" },
];

export interface PullFactionDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	characterName?: string;
	connectedFactionIds?: Set<string>;
	onSelectFaction: (faction: Faction, note?: string) => void;
}

export function PullFactionDialog({
	open,
	onOpenChange,
	characterName = "personagem",
	connectedFactionIds: initialConnectedIds,
	onSelectFaction,
}: PullFactionDialogProps) {
	const factions = useRPGStore((s) => s.factions);
	const toast = useToast();

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState<FactionKind | "all">(
		"all",
	);
	const [selectedFactionId, setSelectedFactionId] = useState<string | null>(
		null,
	);
	const [relationNote, setRelationNote] = useState("");

	const deferredSearch = useDeferredValue(searchQuery);

	const connectedFactionIds = useMemo(() => {
		return initialConnectedIds ?? new Set<string>();
	}, [initialConnectedIds]);

	const filteredFactions = useMemo(() => {
		const query = deferredSearch.trim().toLowerCase();
		return factions.filter((f) => {
			const matchesCategory =
				selectedCategory === "all" ||
				(f.kind ?? "faction") === selectedCategory;
			const matchesQuery =
				!query ||
				[
					f.name,
					f.leader,
					f.seat,
					f.alignment,
					f.influence,
					f.patronType,
					f.perks,
					f.duties,
					f.description,
				]
					.filter(Boolean)
					.join(" ")
					.toLowerCase()
					.includes(query);
			return matchesCategory && matchesQuery;
		});
	}, [factions, selectedCategory, deferredSearch]);

	const selectedFaction = useMemo(
		() => factions.find((f) => f.id === selectedFactionId) ?? null,
		[factions, selectedFactionId],
	);

	const isSelectedPatron = selectedFaction?.kind === "patron";

	const quickNotePills = isSelectedPatron
		? [
				"👑 Patrono do Grupo",
				"🛡️ Protegido",
				"📜 Contratado",
				"🗝️ Agente / Informante",
				"⚖️ Devedor de Favor",
			]
		: [
				"Aliado",
				"Membro Juramentado",
				"Simpatizante",
				"Inimigo Declarado",
				"Contato Secreto",
			];

	function handleSelectFaction(faction: Faction) {
		setSelectedFactionId(faction.id);
		if (!relationNote) {
			setRelationNote(
				faction.kind === "patron" ? "Patrono do Grupo" : "Aliado",
			);
		}
	}

	function handleLinkToSheet() {
		if (!selectedFaction) return;

		const note =
			relationNote.trim() ||
			(selectedFaction.kind === "patron" ? "Patrono do Grupo" : "Aliado");

		onSelectFaction(selectedFaction, note);

		toast.success({
			title: isSelectedPatron ? "Patrono conectado!" : "Facção conectada!",
			description: `${selectedFaction.name} foi vinculado(a) à ficha de ${characterName}.`,
		});

		onOpenChange(false);
		setSelectedFactionId(null);
		setRelationNote("");
		setSearchQuery("");
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden bg-card border-border/70">
				<DialogHeader className="p-6 pb-4 border-b border-border/40">
					<div className="flex items-center gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
							<Crown className="h-5 w-5" />
						</div>
						<div className="space-y-0.5 text-left">
							<DialogTitle className="font-display text-lg font-bold text-foreground">
								Puxar Patrono ou Facção
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground">
								Conecte patronos de grupo, ordens ou famílias cadastrados na
								plataforma à ficha de{" "}
								<span className="font-semibold text-foreground">
									{characterName}
								</span>
								.
							</DialogDescription>
						</div>
					</div>

					{/* Barra de Busca & Filtros Rápidos */}
					<div className="mt-4 space-y-3">
						<div className="relative">
							<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								placeholder="Buscar por nome, patrono, líder, sede ou benefícios..."
								className="pl-9 pr-9 min-h-[44px] bg-background/50 border-border/70"
							/>
							{searchQuery && (
								<button
									type="button"
									onClick={() => setSearchQuery("")}
									className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								>
									<X className="h-3.5 w-3.5" />
								</button>
							)}
						</div>

						{/* Chips de Categorias */}
						<div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 text-xs">
							{CATEGORY_FILTERS.map((cat) => (
								<button
									key={cat.id}
									type="button"
									onClick={() => setSelectedCategory(cat.id)}
									className={cn(
										"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition-all duration-150 select-none active:scale-[0.98] min-h-[32px]",
										selectedCategory === cat.id
											? "border border-primary/40 bg-primary/20 text-primary font-semibold shadow-xs"
											: "border border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground",
									)}
								>
									<span>{cat.icon}</span>
									<span>{cat.label}</span>
								</button>
							))}
						</div>
					</div>
				</DialogHeader>

				{/* Lista de Patronos / Facções */}
				<div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-3">
					{factions.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
							<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-muted-foreground">
								<Flag className="h-6 w-6" />
							</div>
							<div className="space-y-1">
								<h3 className="font-display font-bold text-foreground text-sm">
									Nenhum patrono ou organização cadastrado
								</h3>
								<p className="text-xs text-muted-foreground max-w-sm">
									Cadastre patronos de grupo, guildas ou famílias nobres na aba
									de Facções para vinculá-los às fichas.
								</p>
							</div>
							<Link to="/factions">
								<Button
									variant="outline"
									size="sm"
									className="min-h-[44px] gap-2 mt-2"
								>
									<Plus className="h-4 w-4" />
									Criar Novo Patrono / Facção
								</Button>
							</Link>
						</div>
					) : filteredFactions.length === 0 ? (
						<div className="p-8 text-center text-sm text-muted-foreground">
							Nenhum patrono ou organização encontrado para a busca &ldquo;
							{searchQuery}&rdquo;.
						</div>
					) : (
						<div className="grid gap-2.5">
							{filteredFactions.map((f) => {
								const isLinked = connectedFactionIds.has(f.id);
								const isSelected = selectedFactionId === f.id;
								const isPatron = f.kind === "patron";

								return (
									<button
										key={f.id}
										type="button"
										onClick={() => handleSelectFaction(f)}
										className={cn(
											"group relative flex w-full flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-150 cursor-pointer select-none active:scale-[0.99]",
											isSelected
												? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/40"
												: isLinked
													? "border-border/50 bg-card/40 opacity-75 hover:opacity-100"
													: "border-border/70 bg-background/40 hover:border-primary/40 hover:bg-background/80",
										)}
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex items-center gap-2.5 min-w-0">
												<div
													className={cn(
														"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
														isPatron
															? "border-amber-500/40 bg-amber-500/15 text-amber-300"
															: "border-primary/30 bg-primary/10 text-primary",
													)}
												>
													{isPatron ? (
														<Crown className="h-4 w-4" />
													) : (
														<Flag className="h-4 w-4" />
													)}
												</div>
												<div className="min-w-0">
													<div className="flex items-center gap-2">
														<span className="font-display font-bold text-foreground truncate text-sm">
															{f.name}
														</span>
														<span
															className={cn(
																"text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
																isPatron
																	? "bg-amber-500/15 border-amber-500/30 text-amber-300"
																	: "bg-muted/40 border-border/70 text-muted-foreground",
															)}
														>
															{isPatron
																? `👑 Patrono (${f.patronType || "Grupo"})`
																: f.kind === "noble_house"
																	? "🏰 Família Nobre"
																	: f.kind === "guild_order"
																		? "⚔️ Guilda / Ordem"
																		: f.kind === "cult_society"
																			? "👁️ Culto / Seita"
																			: "🚩 Organização"}
														</span>
													</div>
													{(f.leader || f.seat) && (
														<p className="text-[11px] text-muted-foreground truncate mt-0.5">
															{f.leader ? `Líder: ${f.leader}` : ""}
															{f.leader && f.seat ? " · " : ""}
															{f.seat ? `Sede: ${f.seat}` : ""}
														</p>
													)}
												</div>
											</div>

											<div className="shrink-0 flex items-center gap-1.5">
												{isLinked && (
													<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
														<Check className="h-3 w-3" />
														Conectado
													</span>
												)}
												<div
													className={cn(
														"h-5 w-5 rounded-full border flex items-center justify-center transition-all",
														isSelected
															? "border-primary bg-primary text-primary-foreground"
															: "border-border/70 bg-transparent text-transparent group-hover:border-primary/50",
													)}
												>
													<Check className="h-3 w-3 stroke-[3]" />
												</div>
											</div>
										</div>

										{/* Benefícios ou Descrição */}
										{f.perks ? (
											<div className="mt-1 rounded-lg border border-primary/20 bg-primary/5 p-2 text-[11px] text-foreground/90">
												<span className="font-semibold text-primary">
													🎁 Benefício:{" "}
												</span>
												<span className="line-clamp-2">{f.perks}</span>
											</div>
										) : f.description ? (
											<p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
												{f.description}
											</p>
										) : null}
									</button>
								);
							})}
						</div>
					)}
				</div>

				{/* Rodapé de Confirmação com Definição do Papel/Vínculo */}
				{selectedFaction && (
					<div className="border-t border-border/50 bg-card-elevated/80 p-5 space-y-3">
						<div className="space-y-1.5">
							<div className="flex items-center justify-between text-xs">
								<span className="font-medium text-foreground">
									Tipo de Vínculo com{" "}
									<span className="font-bold text-primary">
										{selectedFaction.name}
									</span>
									:
								</span>
								<span className="text-[11px] text-muted-foreground">
									Opcional
								</span>
							</div>
							<Input
								value={relationNote}
								onChange={(e) => setRelationNote(e.target.value)}
								placeholder="Ex: Patrono do Grupo, Aliado fiel, Agente infiltrado..."
								className="min-h-[44px] bg-background text-xs"
							/>
							<div className="flex flex-wrap gap-1.5 pt-1">
								{quickNotePills.map((pill) => (
									<button
										key={pill}
										type="button"
										onClick={() => setRelationNote(pill)}
										className={cn(
											"text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors cursor-pointer",
											relationNote === pill
												? "border-primary/40 bg-primary/20 text-primary"
												: "border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:bg-muted/30",
										)}
									>
										{pill}
									</button>
								))}
							</div>
						</div>

						<div className="flex items-center justify-end gap-2 pt-1">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setSelectedFactionId(null)}
								className="min-h-[44px] cursor-pointer"
							>
								Cancelar
							</Button>
							<Button
								type="button"
								variant="default"
								size="sm"
								onClick={handleLinkToSheet}
								className="min-h-[44px] gap-2 cursor-pointer font-bold"
							>
								{isSelectedPatron ? (
									<Crown className="h-4 w-4" />
								) : (
									<Plus className="h-4 w-4" />
								)}
								Vincular à Ficha
							</Button>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
