import { BookOpen, Check, Plus, Search, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Spell } from "@/lib/store/types";
import { getSupabase } from "@/lib/supabase";

interface SpellSearchDialogProps {
	system: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectSpell: (spell: Spell) => void;
	currentSpells: Spell[];
}

export function SpellSearchDialog({
	system,
	open,
	onOpenChange,
	onSelectSpell,
	currentSpells,
}: SpellSearchDialogProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [levelFilter, setLevelFilter] = useState<string>("all");
	const [schoolFilter, setSchoolFilter] = useState<string>("all");
	const [allSpells, setAllSpells] = useState<Spell[]>([]);
	const [loading, setLoading] = useState(false);
	const [showHomebrewForm, setShowHomebrewForm] = useState(false);
	const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);

	// Homebrew form state
	const [hbName, setHbName] = useState("");
	const [hbLevel, setHbLevel] = useState(0);
	const [hbSchool, setHbSchool] = useState("");
	const [hbCastingTime, setHbCastingTime] = useState("");
	const [hbRange, setHbRange] = useState("");
	const [hbComponents, setHbComponents] = useState("");
	const [hbDuration, setHbDuration] = useState("");
	const [hbDescription, setHbDescription] = useState("");
	const [creatingHb, setCreatingHb] = useState(false);
	const [hbError, setHbError] = useState<string | null>(null);

	// Load spells from Supabase once when opening the dialog or changing system
	useEffect(() => {
		if (!open) return;

		const client = getSupabase() as any;
		if (!client) return;

		async function fetchAllSpells() {
			setLoading(true);
			try {
				const getCompatibleSystems = (sys: string): string[] => {
					if (sys === "dnd2024") return ["dnd5e", "dnd2024"];
					return [sys];
				};

				const { data, error } = await client
					.from("spells")
					.select("*")
					.in("system", getCompatibleSystems(system))
					.order("name", { ascending: true });

				if (error) throw error;
				setAllSpells((data as Spell[]) || []);
			} catch (err) {
				console.error("Erro ao carregar magias:", err);
			} finally {
				setLoading(false);
			}
		}

		void fetchAllSpells();
	}, [open, system]);

	// Filter spells in-memory (making search instant and supporting descriptions!)
	const filteredSpells = useMemo(() => {
		return allSpells.filter((spell) => {
			// Level filter
			if (levelFilter !== "all" && spell.level !== Number(levelFilter)) {
				return false;
			}
			// School filter
			if (schoolFilter !== "all" && spell.school !== schoolFilter) {
				return false;
			}
			// Search query filter (matches name or description)
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase().trim();
				const nameMatch = spell.name.toLowerCase().includes(query);
				const descMatch = spell.description?.toLowerCase().includes(query);
				return nameMatch || descMatch;
			}
			return true;
		});
	}, [allSpells, levelFilter, schoolFilter, searchQuery]);

	const resetHbForm = useCallback(() => {
		setHbName("");
		setHbLevel(0);
		setHbSchool("");
		setHbCastingTime("");
		setHbRange("");
		setHbComponents("");
		setHbDuration("");
		setHbDescription("");
		setHbError(null);
	}, []);

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			setSearchQuery("");
			setLevelFilter("all");
			setSchoolFilter("all");
			setShowHomebrewForm(false);
			setSelectedSpell(null);
			resetHbForm();
		}
	}, [open, resetHbForm]);

	async function handleCreateHomebrew(e: React.FormEvent) {
		e.preventDefault();
		if (!hbName.trim() || !hbDescription.trim()) {
			setHbError("Nome e descrição são obrigatórios.");
			return;
		}

		const client = getSupabase() as any;
		if (!client) {
			setHbError("Conexão com o servidor indisponível.");
			return;
		}

		setCreatingHb(true);
		setHbError(null);

		try {
			const {
				data: { user },
			} = await client.auth.getUser();
			if (!user) throw new Error("Usuário não autenticado");

			const newSpell = {
				user_id: user.id,
				system,
				name: hbName.trim(),
				level: hbLevel,
				school: hbSchool.trim(),
				casting_time: hbCastingTime.trim(),
				range: hbRange.trim(),
				components: hbComponents.trim(),
				duration: hbDuration.trim(),
				description: hbDescription.trim(),
				is_homebrew: true,
			};

			const { data, error } = await client
				.from("spells")
				.insert(newSpell)
				.select()
				.single();

			if (error) throw error;

			if (data) {
				const spell = data as Spell;
				// Add to search list and select it
				setAllSpells((prev) => [spell, ...prev]);
				onSelectSpell(spell);
				setShowHomebrewForm(false);
				resetHbForm();
			}
		} catch (err: any) {
			console.error("Erro ao criar magia homebrew:", err);
			setHbError(err.message || "Erro ao criar magia no banco de dados.");
		} finally {
			setCreatingHb(false);
		}
	}

	const schoolOptions =
		system === "tormenta20"
			? [
					"Abjuração",
					"Adivinhação",
					"Convocação",
					"Encantamento",
					"Evocação",
					"Ilusão",
					"Necromancia",
					"Transmutação",
				]
			: [
					"Abjuração",
					"Adivinhação",
					"Conjuração",
					"Encantamento",
					"Evocação",
					"Ilusão",
					"Necromancia",
					"Transmutação",
				];

	const formatLevel = (lvl: number) => {
		if (lvl === 0) return "Truque";
		return `${lvl}º nível`;
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden bg-card-elevated border-border/80 text-foreground">
				<DialogHeader className="p-6 pb-0 border-b border-border/40 shrink-0">
					<DialogTitle className="font-display text-xl flex items-center gap-2">
						<BookOpen className="h-5 w-5 text-primary" />
						Grimório de Magias
					</DialogTitle>
					<DialogDescription>
						Busque magias oficiais ou crie suas próprias magias customizadas
						(Homebrew).
					</DialogDescription>
				</DialogHeader>

				<div className="flex-1 min-h-0 flex flex-col md:flex-row">
					{/* Left column: Search and list */}
					<div className="flex-1 flex flex-col p-6 min-h-0 border-r border-border/40">
						{showHomebrewForm ? (
							<form
								onSubmit={handleCreateHomebrew}
								className="flex-1 flex flex-col min-h-0"
							>
								<div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-none">
									<h3 className="font-bold text-sm text-foreground flex items-center gap-2">
										<Sparkles className="h-4 w-4 text-primary" />
										Nova Magia Homebrew
									</h3>

									{hbError && (
										<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-[12px] text-destructive">
											{hbError}
										</div>
									)}

									<div className="grid grid-cols-2 gap-3">
										<Field label="Nome da Magia" className="col-span-2">
											<Input
												placeholder="Ex: Flecha Corrosiva"
												value={hbName}
												onChange={(e) => setHbName(e.target.value)}
												required
											/>
										</Field>
										<Field label="Nível/Círculo">
											<Select
												value={String(hbLevel)}
												onChange={(e) => setHbLevel(Number(e.target.value))}
											>
												<option value="0">Truque (Nível 0)</option>
												<option value="1">1º nível</option>
												<option value="2">2º nível</option>
												<option value="3">3º nível</option>
												<option value="4">4º nível</option>
												<option value="5">5º nível</option>
												<option value="6">6º nível</option>
												<option value="7">7º nível</option>
												<option value="8">8º nível</option>
												<option value="9">9º nível</option>
											</Select>
										</Field>
										<Field label="Escola / Tipo">
											<Input
												placeholder="Ex: Evocação"
												value={hbSchool}
												onChange={(e) => setHbSchool(e.target.value)}
											/>
										</Field>
										<Field label="Tempo de Conjuração">
											<Input
												placeholder="Ex: 1 ação"
												value={hbCastingTime}
												onChange={(e) => setHbCastingTime(e.target.value)}
											/>
										</Field>
										<Field label="Alcance">
											<Input
												placeholder="Ex: 18 metros"
												value={hbRange}
												onChange={(e) => setHbRange(e.target.value)}
											/>
										</Field>
										<Field label="Componentes">
											<Input
												placeholder="Ex: V, S, M (uma pena)"
												value={hbComponents}
												onChange={(e) => setHbComponents(e.target.value)}
											/>
										</Field>
										<Field label="Duração">
											<Input
												placeholder="Ex: Concentração, até 1 minuto"
												value={hbDuration}
												onChange={(e) => setHbDuration(e.target.value)}
											/>
										</Field>
									</div>

									<Field label="Descrição da Magia">
										<Textarea
											rows={4}
											placeholder="Descreva o efeito mágico detalhadamente..."
											value={hbDescription}
											onChange={(e) => setHbDescription(e.target.value)}
											required
										/>
									</Field>
								</div>

								<div className="mt-4 flex gap-2 shrink-0 border-t border-border/40 pt-4">
									<Button
										type="button"
										variant="ghost"
										className="flex-1"
										onClick={() => setShowHomebrewForm(false)}
										disabled={creatingHb}
									>
										Cancelar
									</Button>
									<Button
										type="submit"
										className="flex-1"
										disabled={creatingHb}
									>
										{creatingHb ? "Criando..." : "Criar e Adicionar"}
									</Button>
								</div>
							</form>
						) : (
							<div className="flex-1 flex flex-col min-h-0">
								{/* Filters */}
								<div className="space-y-3 mb-4 shrink-0">
									<div className="relative">
										<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
										<Input
											placeholder="Buscar magias pelo nome..."
											className="pl-9"
											value={searchQuery}
											onChange={(e) => setSearchQuery(e.target.value)}
										/>
									</div>

									<div className="grid grid-cols-2 gap-2">
										<Select
											value={levelFilter}
											onChange={(e) => setLevelFilter(e.target.value)}
										>
											<option value="all">Todos os Níveis</option>
											<option value="0">Truques</option>
											<option value="1">1º nível</option>
											<option value="2">2º nível</option>
											<option value="3">3º nível</option>
											<option value="4">4º nível</option>
											<option value="5">5º nível</option>
											<option value="6">6º nível</option>
											<option value="7">7º nível</option>
											<option value="8">8º nível</option>
											<option value="9">9º nível</option>
										</Select>

										<Select
											value={schoolFilter}
											onChange={(e) => setSchoolFilter(e.target.value)}
										>
											<option value="all">Todas as Escolas</option>
											{schoolOptions.map((opt) => (
												<option key={opt} value={opt}>
													{opt}
												</option>
											))}
										</Select>
									</div>
								</div>

								{/* Spell List */}
								<div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-none min-h-0">
									{loading ? (
										<div className="text-center py-8 text-[13px] text-muted-foreground">
											Buscando magias...
										</div>
									) : filteredSpells.length === 0 ? (
										<div className="text-center py-8 text-[13px] text-muted-foreground">
											Nenhuma magia encontrada.
										</div>
									) : (
										filteredSpells.map((spell) => {
											const isAdded = currentSpells.some(
												(s) =>
													s.name.toLowerCase() === spell.name.toLowerCase(),
											);
											const isSelected = selectedSpell?.id === spell.id;

											return (
												<button
													key={spell.id}
													type="button"
													className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group ${
														isSelected
															? "bg-primary/10 border-primary"
															: "bg-background/40 border-border/40 hover:bg-background/70 hover:border-border/80"
													}`}
													onClick={() => setSelectedSpell(spell)}
												>
													<div className="min-w-0 pr-2">
														<div className="flex items-center gap-1.5">
															<span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
																{spell.name}
															</span>
															{spell.is_homebrew && (
																<span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ring-1 ring-amber-500/20">
																	Homebrew
																</span>
															)}
														</div>
														<div className="text-[11px] text-muted-foreground mt-0.5">
															{formatLevel(spell.level)} ·{" "}
															{spell.school || "Geral"}
														</div>
													</div>

													{isAdded ? (
														<span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
															<Check className="h-3.5 w-3.5" />
														</span>
													) : (
														<button
															type="button"
															className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/70 hover:bg-primary hover:border-primary hover:text-white transition-colors"
															onClick={(e) => {
																e.stopPropagation();
																onSelectSpell(spell);
															}}
														>
															<Plus className="h-4 w-4" />
														</button>
													)}
												</button>
											);
										})
									)}
								</div>

								{/* Bottom bar for Homebrew */}
								<div className="mt-4 shrink-0 border-t border-border/40 pt-4 flex items-center justify-between gap-4">
									<span className="text-[11px] text-muted-foreground">
										Não achou a magia que queria?
									</span>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="gap-1.5 text-xs h-8"
										onClick={() => setShowHomebrewForm(true)}
									>
										<Plus className="h-3.5 w-3.5" />
										Criar Homebrew
									</Button>
								</div>
							</div>
						)}
					</div>

					{/* Right column: Spell details */}
					<div className="hidden md:flex md:w-[260px] p-6 flex-col min-h-0 bg-background/20 overflow-y-auto scrollbar-none">
						{selectedSpell ? (
							<div className="space-y-4">
								<div>
									<div className="flex items-center gap-1.5 flex-wrap">
										<h4 className="font-display text-base font-bold text-foreground">
											{selectedSpell.name}
										</h4>
										{selectedSpell.is_homebrew && (
											<span className="text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">
												HB
											</span>
										)}
									</div>
									<p className="text-[12px] text-primary font-semibold mt-1">
										{formatLevel(selectedSpell.level)} ·{" "}
										{selectedSpell.school || "Geral"}
									</p>
								</div>

								<div className="space-y-2 border-t border-b border-border/40 py-3 text-[12px] leading-relaxed">
									<div>
										<span className="font-bold text-muted-foreground">
											Tempo:{" "}
										</span>
										<span className="text-foreground">
											{selectedSpell.casting_time || "-"}
										</span>
									</div>
									<div>
										<span className="font-bold text-muted-foreground">
											Alcance:{" "}
										</span>
										<span className="text-foreground">
											{selectedSpell.range || "-"}
										</span>
									</div>
									<div>
										<span className="font-bold text-muted-foreground">
											Componentes:{" "}
										</span>
										<span className="text-foreground">
											{selectedSpell.components || "-"}
										</span>
									</div>
									<div>
										<span className="font-bold text-muted-foreground">
											Duração:{" "}
										</span>
										<span className="text-foreground">
											{selectedSpell.duration || "-"}
										</span>
									</div>
								</div>

								<div>
									<h5 className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5">
										Descrição
									</h5>
									<p className="text-[12px] leading-relaxed text-muted-foreground whitespace-pre-line">
										{selectedSpell.description}
									</p>
								</div>
							</div>
						) : (
							<div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
								<BookOpen className="h-8 w-8 mb-2 opacity-40" />
								<p className="text-xs">
									Selecione uma magia para ver os detalhes completos aqui.
								</p>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
