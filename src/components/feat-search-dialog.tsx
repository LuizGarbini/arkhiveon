import {
	ArrowLeft,
	BookOpen,
	Check,
	Plus,
	Search,
	Sparkles,
	Target,
	TrendingUp,
	X,
} from "lucide-react";
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
import type { Feat } from "@/lib/store/types";
import { getSupabase } from "@/lib/supabase";
import { getFeatsLabel } from "@/lib/systems";
import { cn } from "@/lib/utils";

interface FeatSearchDialogProps {
	system: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectFeat: (feat: Feat) => void;
	currentFeats: Feat[];
}

function getFeatBook(feat: Feat): "phb" | "xge" | "tce" | "homebrew" {
	if (feat.is_homebrew) return "homebrew";
	const src = (feat.source || "").toUpperCase().trim();
	if (src.includes("XGE") || src.includes("XANATHAR")) return "xge";
	if (src.includes("TCE") || src.includes("TASHA")) return "tce";
	if (src.includes("HOMEBREW")) return "homebrew";
	return "phb";
}

function getFeatBookLabel(feat: Feat): string {
	const book = getFeatBook(feat);
	switch (book) {
		case "xge":
			return "Guia do Xanathar (XGE)";
		case "tce":
			return "Caldeirão de Tasha (TCE)";
		case "homebrew":
			return "Homebrew";
		default:
			return "Livro do Jogador (PHB)";
	}
}

export function FeatSearchDialog({
	system,
	open,
	onOpenChange,
	onSelectFeat,
	currentFeats,
}: FeatSearchDialogProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");
	const [bookFilter, setBookFilter] = useState<string>("all");
	const [onlyUnlearned, setOnlyUnlearned] = useState(false);
	const [allFeats, setAllFeats] = useState<Feat[]>([]);
	const [loading, setLoading] = useState(false);
	const [showHomebrewForm, setShowHomebrewForm] = useState(false);
	const [selectedFeat, setSelectedFeat] = useState<Feat | null>(null);
	const [mobileView, setMobileView] = useState<"list" | "detail">("list");

	// Homebrew form state
	const [hbName, setHbName] = useState("");
	const [hbCategory, setHbCategory] = useState("Geral");
	const [hbPrerequisites, setHbPrerequisites] = useState("");
	const [hbDescription, setHbDescription] = useState("");
	const [hbAbilityIncrease, setHbAbilityIncrease] = useState("");
	const [hbSource, setHbSource] = useState("");
	const [creatingHb, setCreatingHb] = useState(false);
	const [hbError, setHbError] = useState<string | null>(null);

	const featsLabel = getFeatsLabel(system);

	// Load feats from Supabase once when opening the dialog or changing system
	useEffect(() => {
		if (!open) return;

		// biome-ignore lint/suspicious/noExplicitAny: feats table not present in static database.types.ts yet
		const client = getSupabase() as any;
		if (!client) return;

		async function fetchAllFeats() {
			setLoading(true);
			try {
				const getCompatibleSystems = (sys: string): string[] => {
					if (sys === "dnd2024") return ["dnd5e", "dnd2024"];
					return [sys];
				};

				const { data } = await client
					.from("feats")
					.select("*")
					.in("system", getCompatibleSystems(system))
					.order("name", { ascending: true });

				let fetched = (data as Feat[]) || [];
				if (system === "ordem" || fetched.length === 0) {
					const { ORDEM_FEATS_SEED } = await import("@/lib/ordem/presets");
					if (system === "ordem") {
						fetched = [...ORDEM_FEATS_SEED, ...fetched];
					}
				}
				setAllFeats(fetched);

				if (fetched.length > 0) {
					setSelectedFeat(fetched[0]);
				}
			} catch (err) {
				console.error("Erro ao carregar talentos/poderes:", err);
				if (system === "ordem") {
					const { ORDEM_FEATS_SEED } = await import("@/lib/ordem/presets");
					setAllFeats(ORDEM_FEATS_SEED);
				}
			} finally {
				setLoading(false);
			}
		}

		void fetchAllFeats();
	}, [open, system]);

	// Extract unique categories dynamically from loaded feats
	const categoryOptions = useMemo(() => {
		const uniqueCats = Array.from(
			new Set(allFeats.map((f) => f.category || "Geral")),
		);
		return uniqueCats.sort((a, b) => a.localeCompare(b, "pt-BR"));
	}, [allFeats]);

	// Filter feats in-memory
	const filteredFeats = useMemo(() => {
		const filtered = allFeats.filter((feat) => {
			// Category filter
			if (
				categoryFilter !== "all" &&
				(feat.category || "Geral").toLowerCase() !==
					categoryFilter.toLowerCase()
			) {
				return false;
			}
			// Book filter
			if (bookFilter !== "all") {
				const b = getFeatBook(feat);
				if (b !== bookFilter) return false;
			}
			// Unlearned filter
			if (onlyUnlearned) {
				const isAdded = currentFeats.some(
					(f) => f.name.toLowerCase() === feat.name.toLowerCase(),
				);
				if (isAdded) return false;
			}
			// Search query filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase().trim();
				const nameMatch = feat.name.toLowerCase().includes(query);
				const descMatch = feat.description?.toLowerCase().includes(query);
				const prereqMatch = feat.prerequisites?.toLowerCase().includes(query);
				const catMatch = feat.category?.toLowerCase().includes(query);
				return nameMatch || descMatch || prereqMatch || catMatch;
			}
			return true;
		});

		// Sort alphabetical by Name
		return filtered.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
	}, [
		allFeats,
		categoryFilter,
		bookFilter,
		onlyUnlearned,
		searchQuery,
		currentFeats,
	]);

	const resetHbForm = useCallback(() => {
		setHbName("");
		setHbCategory("Geral");
		setHbPrerequisites("");
		setHbDescription("");
		setHbAbilityIncrease("");
		setHbSource("");
		setHbError(null);
	}, []);

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			setSearchQuery("");
			setCategoryFilter("all");
			setBookFilter("all");
			setOnlyUnlearned(false);
			setShowHomebrewForm(false);
			setSelectedFeat(null);
			setMobileView("list");
			resetHbForm();
		}
	}, [open, resetHbForm]);

	async function handleCreateHomebrew(e: React.FormEvent) {
		e.preventDefault();
		if (!hbName.trim() || !hbDescription.trim()) {
			setHbError("Nome e descrição são obrigatórios.");
			return;
		}

		// biome-ignore lint/suspicious/noExplicitAny: feats table not present in static database.types.ts yet
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

			const newFeat = {
				user_id: user.id,
				system,
				name: hbName.trim(),
				category: hbCategory.trim(),
				prerequisites: hbPrerequisites.trim(),
				description: hbDescription.trim(),
				ability_increase: hbAbilityIncrease.trim(),
				source: hbSource.trim() || "Homebrew",
				is_homebrew: true,
			};

			const { data, error } = await client
				.from("feats")
				.insert(newFeat)
				.select()
				.single();

			if (error) throw error;

			if (data) {
				const feat = data as Feat;
				setAllFeats((prev) => [feat, ...prev]);
				setSelectedFeat(feat);
				onSelectFeat(feat);
				setShowHomebrewForm(false);
				resetHbForm();
			}
		} catch (err: unknown) {
			console.error("Erro ao criar talento homebrew:", err);
			const message =
				err instanceof Error
					? err.message
					: "Erro ao salvar no banco de dados.";
			setHbError(message);
		} finally {
			setCreatingHb(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-4xl lg:max-w-5xl w-[96vw] h-[88vh] max-h-[840px] flex flex-col p-0 overflow-hidden bg-card-elevated border border-border/80 text-foreground shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
				{/* Top Arcane Header */}
				<DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 shrink-0 bg-background/50 backdrop-blur-md pr-14 sm:pr-16">
					<div className="flex items-center justify-between gap-3">
						<div>
							<DialogTitle className="font-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
								<BookOpen className="h-5 w-5 text-primary shrink-0" />
								Compêndio de {featsLabel}
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground mt-0.5">
								{allFeats.length} {featsLabel.toLowerCase()} catalogados no
								sistema · Busque, inspecione e adicione à ficha.
							</DialogDescription>
						</div>

						<Button
							type="button"
							variant={showHomebrewForm ? "default" : "outline"}
							size="sm"
							className="gap-1.5 text-xs font-semibold h-8 rounded-xl shrink-0 mr-4 transition-all hover:scale-[1.02] active:scale-[0.98]"
							onClick={() => setShowHomebrewForm(!showHomebrewForm)}
						>
							<Sparkles className="h-3.5 w-3.5" />
							{showHomebrewForm
								? `Voltar aos ${featsLabel}`
								: `Criar ${featsLabel} Homebrew`}
						</Button>
					</div>
				</DialogHeader>

				{showHomebrewForm ? (
					/* Homebrew Form View */
					<form
						onSubmit={handleCreateHomebrew}
						className="flex-1 flex flex-col min-h-0 p-5 sm:p-6 overflow-y-auto animate-in fade-in-50 duration-150"
					>
						<div className="max-w-2xl mx-auto w-full space-y-4">
							<div className="flex items-center gap-2 pb-2 border-b border-border/40">
								<Sparkles className="h-4 w-4 text-primary" />
								<h3 className="font-display text-base font-bold text-foreground">
									Novo {featsLabel} Homebrew
								</h3>
							</div>

							{hbError && (
								<div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
									{hbError}
								</div>
							)}

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								<Field label="Nome" className="sm:col-span-2">
									<Input
										placeholder="Ex: Mestre das Lâminas"
										value={hbName}
										onChange={(e) => setHbName(e.target.value)}
										required
										className="h-9 text-xs font-medium"
									/>
								</Field>

								<Field label="Categoria">
									<Input
										placeholder="Ex: Geral, Racial, Combate, Magia..."
										value={hbCategory}
										onChange={(e) => setHbCategory(e.target.value)}
										className="h-9 text-xs"
									/>
								</Field>

								<Field label="Fonte (Livro / Origem)">
									<Input
										placeholder="Ex: Livro do Jogador, Homebrew..."
										value={hbSource}
										onChange={(e) => setHbSource(e.target.value)}
										className="h-9 text-xs"
									/>
								</Field>

								<Field label="Pré-requisitos" className="sm:col-span-2">
									<Input
										placeholder="Ex: Força 13+ ou Proficiência com Armaduras Médias (Opcional)"
										value={hbPrerequisites}
										onChange={(e) => setHbPrerequisites(e.target.value)}
										className="h-9 text-xs"
									/>
								</Field>

								<Field label="Melhoria de Atributo" className="sm:col-span-2">
									<Input
										placeholder="Ex: +1 de Força ou Constituição (Opcional)"
										value={hbAbilityIncrease}
										onChange={(e) => setHbAbilityIncrease(e.target.value)}
										className="h-9 text-xs"
									/>
								</Field>
							</div>

							<Field label="Descrição Detalhada das Regras e Efeitos">
								<Textarea
									rows={5}
									placeholder="Descreva as regras mecânicas, vantagens e habilidades concedidas..."
									value={hbDescription}
									onChange={(e) => setHbDescription(e.target.value)}
									required
									className="text-xs leading-relaxed"
								/>
							</Field>

							<div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setShowHomebrewForm(false)}
									disabled={creatingHb}
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									size="sm"
									disabled={creatingHb}
									className="gap-1.5"
								>
									<Sparkles className="h-3.5 w-3.5" />
									{creatingHb ? "Criando..." : "Criar e Adicionar"}
								</Button>
							</div>
						</div>
					</form>
				) : (
					/* Main Feats Compendium View */
					<div className="flex-1 min-h-0 flex flex-col">
						{/* Search Bar & Comprehensive Filters (Hidden on mobile when in detail mode) */}
						<div
							className={cn(
								"p-3 sm:px-5 sm:py-3 border-b border-border/60 bg-background/30 flex flex-col sm:flex-row items-center gap-2 shrink-0",
								mobileView === "detail" && "hidden md:flex",
							)}
						>
							{/* Search input with quick clear */}
							<div className="relative flex-1 w-full">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
								<Input
									placeholder={`Buscar ${featsLabel.toLowerCase()} por nome, requisitos ou regras...`}
									className="pl-8.5 pr-8 h-9 text-xs bg-background/50 border-border/60 rounded-xl transition-all focus:border-primary/60"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
								{searchQuery && (
									<button
										type="button"
										onClick={() => setSearchQuery("")}
										className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
									>
										<X className="h-3 w-3" />
									</button>
								)}
							</div>

							{/* Book & Category Filters */}
							<div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto shrink-0">
								{/* Book / Source Filter */}
								{system === "dnd5e" && (
									<Select
										value={bookFilter}
										onChange={(e) => setBookFilter(e.target.value)}
										className="h-9 text-xs rounded-xl bg-background/50 border-border/60 w-[155px]"
									>
										<option value="all">Todos os Livros</option>
										<option value="phb">📖 Livro Jogador (PHB)</option>
										<option value="xge">👁️ Xanathar (XGE)</option>
										<option value="tce">🧪 Tasha (TCE)</option>
										<option value="homebrew">✨ Homebrew</option>
									</Select>
								)}

								{/* Category Selector */}
								{categoryOptions.length > 0 && (
									<Select
										value={categoryFilter}
										onChange={(e) => setCategoryFilter(e.target.value)}
										className="h-9 text-xs rounded-xl bg-background/50 border-border/60 w-[165px]"
									>
										<option value="all">Todas as Categorias</option>
										{categoryOptions.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</Select>
								)}

								<button
									type="button"
									onClick={() => setOnlyUnlearned(!onlyUnlearned)}
									className={cn(
										"h-9 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all shrink-0 select-none cursor-pointer active:scale-95",
										onlyUnlearned
											? "border-primary/60 bg-primary/15 text-primary"
											: "border-border/60 bg-background/40 text-muted-foreground hover:text-foreground",
									)}
								>
									<Check className="h-3 w-3" />
									<span>Não adicionados</span>
								</button>
							</div>
						</div>

						{/* Split View: Left List (60%) + Right Details (40%) */}
						<div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/60">
							{/* LEFT: Feats List */}
							<div
								className={cn(
									"flex-1 flex flex-col min-h-0 p-3 sm:p-4 overflow-y-auto scrollbar-none",
									mobileView === "detail" ? "hidden md:flex" : "flex",
								)}
							>
								<div className="flex items-center justify-between px-1 pb-2 text-[11px] font-semibold text-muted-foreground">
									<span>
										{filteredFeats.length} de {allFeats.length}{" "}
										{featsLabel.toLowerCase()}
									</span>
									{currentFeats.length > 0 && (
										<span className="text-emerald-400">
											{currentFeats.length} na ficha
										</span>
									)}
								</div>

								{loading ? (
									<div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
										<Sparkles className="h-6 w-6 text-primary animate-spin mb-2 opacity-60" />
										<p className="text-xs font-semibold">
											Carregando {featsLabel.toLowerCase()}...
										</p>
									</div>
								) : filteredFeats.length === 0 ? (
									<div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
										<BookOpen className="h-7 w-7 mb-2 opacity-30" />
										<p className="text-xs font-semibold text-foreground">
											Nenhum registro encontrado
										</p>
									</div>
								) : (
									<div className="space-y-1.5">
										{filteredFeats.map((feat) => {
											const isAdded = currentFeats.some(
												(f) => f.name.toLowerCase() === feat.name.toLowerCase(),
											);
											const isSelected = selectedFeat?.id === feat.id;
											const bookLabel = getFeatBookLabel(feat);

											return (
												<div
													key={feat.id}
													role="button"
													tabIndex={0}
													className={cn(
														"w-full text-left p-2.5 sm:p-3 rounded-xl border transition-all duration-150 ease-out flex items-center justify-between group cursor-pointer select-none",
														isSelected
															? "bg-primary/15 border-primary/70 shadow-xs translate-x-0.5"
															: "bg-background/40 border-border/50 hover:bg-background/80 hover:border-border/80 hover:translate-x-0.5",
													)}
													onClick={() => {
														setSelectedFeat(feat);
														setMobileView("detail");
													}}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															setSelectedFeat(feat);
															setMobileView("detail");
														}
													}}
												>
													<div className="min-w-0 pr-2 flex-1">
														<div className="flex items-center gap-1.5 flex-wrap">
															<span
																className={cn(
																	"font-display font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors truncate",
																	isSelected && "text-primary",
																)}
															>
																{feat.name}
															</span>

															<span className="text-[8px] font-semibold text-white/50 bg-white/5 px-1.5 py-0.2 rounded border border-white/10">
																{bookLabel}
															</span>

															{feat.is_homebrew && (
																<span className="text-[8px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/30">
																	HB
																</span>
															)}
														</div>

														<div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
															<span className="font-semibold text-primary/90">
																{feat.category || "Geral"}
															</span>

															{feat.prerequisites && (
																<span className="text-white/60">
																	· Req: {feat.prerequisites}
																</span>
															)}

															{feat.ability_increase && (
																<span className="text-emerald-400/80 hidden sm:inline">
																	· {feat.ability_increase}
																</span>
															)}
														</div>
													</div>

													<div className="flex items-center gap-1.5 shrink-0">
														{isAdded ? (
															<span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
																<Check className="h-3 w-3" />
																<span className="hidden sm:inline">
																	Na Ficha
																</span>
															</span>
														) : (
															<button
																type="button"
																title="Adicionar à Ficha"
																className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-primary/40 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all text-xs font-bold active:scale-95"
																onClick={(e) => {
																	e.stopPropagation();
																	onSelectFeat(feat);
																}}
															>
																<Plus className="h-3.5 w-3.5" />
																<span className="hidden sm:inline">
																	Adicionar
																</span>
															</button>
														)}
													</div>
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* RIGHT: Reader Detail Pane (Fixed container with bottom-pinned button) */}
							<div
								className={cn(
									"md:w-[380px] lg:w-[440px] p-4 sm:p-5 flex flex-col justify-between min-h-0 bg-background/25 overflow-hidden",
									mobileView === "list" ? "hidden md:flex" : "flex",
								)}
							>
								{selectedFeat ? (
									<div
										key={selectedFeat.id}
										className="flex-1 flex flex-col justify-between min-h-0 animate-in fade-in-50 slide-in-from-right-1 duration-150"
									>
										{/* Mobile Back Button */}
										<button
											type="button"
											onClick={() => setMobileView("list")}
											className="md:hidden flex items-center gap-1.5 text-xs text-primary font-bold pb-2.5 mb-2 border-b border-border/40 hover:underline cursor-pointer shrink-0"
										>
											<ArrowLeft className="h-4 w-4" />
											Voltar para a Lista de {featsLabel}
										</button>

										{/* Top part: Title, Book, Category, Stats Grid */}
										<div className="space-y-3 shrink-0">
											<div>
												<div className="flex items-center justify-between gap-2 flex-wrap">
													<span className="px-2 py-0.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider">
														{selectedFeat.category || "Geral"}
													</span>

													<span className="text-[9px] font-semibold text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/10">
														{getFeatBookLabel(selectedFeat)}
													</span>
												</div>

												<h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight mt-1.5">
													{selectedFeat.name}
												</h3>
											</div>

											{/* Feat Attributes / Requirements Grid */}
											<div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-border/60 bg-background/40 text-xs">
												<div className="space-y-0.5">
													<span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
														<Target className="h-2.5 w-2.5 text-primary" />{" "}
														Pré-requisitos
													</span>
													<p className="font-semibold text-foreground text-[11px]">
														{selectedFeat.prerequisites || "Nenhum"}
													</p>
												</div>

												<div className="space-y-0.5">
													<span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
														<TrendingUp className="h-2.5 w-2.5 text-primary" />{" "}
														Aumento Atributo
													</span>
													<p className="font-semibold text-foreground text-[11px]">
														{selectedFeat.ability_increase || "Nenhum"}
													</p>
												</div>

												<div className="space-y-0.5 pt-1.5 border-t border-border/40 col-span-2">
													<span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
														<BookOpen className="h-2.5 w-2.5 text-primary" />{" "}
														Livro de Origem
													</span>
													<p className="font-semibold text-foreground text-[11px]">
														{getFeatBookLabel(selectedFeat)}
													</p>
												</div>
											</div>
										</div>

										{/* Middle part: Description container stretching to fill full vertical height */}
										<div className="flex flex-col flex-1 min-h-0 my-3 space-y-1.5">
											<h4 className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground shrink-0">
												Descrição e Regras
											</h4>
											<div className="p-3.5 rounded-xl border border-border/50 bg-background/40 text-[11px] sm:text-xs leading-relaxed text-white/90 whitespace-pre-line break-words flex-1 h-full min-h-0 overflow-y-auto">
												{selectedFeat.description}
											</div>
										</div>

										{/* Bottom Action Button (ALWAYS PINNED FIRMLY TO THE BOTTOM) */}
										<div className="pt-2 border-t border-border/40 shrink-0">
											{currentFeats.some(
												(f) =>
													f.name.toLowerCase() ===
													selectedFeat.name.toLowerCase(),
											) ? (
												<div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold text-xs">
													<Check className="h-3.5 w-3.5" />
													{featsLabel} já está na Ficha
												</div>
											) : (
												<Button
													type="button"
													className="w-full gap-2 font-bold h-10 rounded-xl text-xs shadow-md shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
													onClick={() => onSelectFeat(selectedFeat)}
												>
													<Plus className="h-3.5 w-3.5" />
													Adicionar {featsLabel} à Ficha
												</Button>
											)}
										</div>
									</div>
								) : (
									<div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
										<BookOpen className="h-8 w-8 mb-2 opacity-30 text-primary" />
										<p className="text-xs font-semibold text-foreground">
											Selecione um {featsLabel.toLowerCase()}
										</p>
										<p className="text-[10px] text-muted-foreground mt-0.5">
											Clique em qualquer {featsLabel.toLowerCase()} para ler
											suas regras e efeitos.
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
