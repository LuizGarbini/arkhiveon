import {
	BookOpen,
	Check,
	Compass,
	Plus,
	ScrollText,
	Search,
	Shield,
	Sparkles,
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

interface FeatSearchDialogProps {
	system: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectFeat: (feat: Feat) => void;
	currentFeats: Feat[];
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
	const [allFeats, setAllFeats] = useState<Feat[]>([]);
	const [loading, setLoading] = useState(false);
	const [showHomebrewForm, setShowHomebrewForm] = useState(false);
	const [selectedFeat, setSelectedFeat] = useState<Feat | null>(null);

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
		return uniqueCats.sort((a, b) => a.localeCompare(b));
	}, [allFeats]);

	// Filter feats in-memory
	const filteredFeats = useMemo(() => {
		return allFeats.filter((feat) => {
			// Category filter
			if (
				categoryFilter !== "all" &&
				(feat.category || "Geral") !== categoryFilter
			) {
				return false;
			}
			// Search query filter
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase().trim();
				const nameMatch = feat.name.toLowerCase().includes(query);
				const descMatch = feat.description?.toLowerCase().includes(query);
				const prereqMatch = feat.prerequisites?.toLowerCase().includes(query);
				return nameMatch || descMatch || prereqMatch;
			}
			return true;
		});
	}, [allFeats, categoryFilter, searchQuery]);

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
			setShowHomebrewForm(false);
			setSelectedFeat(null);
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

	const isAlreadyAdded = (feat: Feat) => {
		return currentFeats.some(
			(f) => f.name.toLowerCase() === feat.name.toLowerCase(),
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden bg-card-elevated border-border/80 text-foreground">
				<DialogHeader className="p-6 pb-0 border-b border-border/40 shrink-0">
					<DialogTitle className="font-display text-xl flex items-center gap-2">
						<BookOpen className="h-5 w-5 text-primary" />
						Compêndio de {featsLabel}
					</DialogTitle>
					<DialogDescription className="text-xs text-muted-foreground mt-1">
						Busque {featsLabel.toLowerCase()} oficiais ou crie customizados
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
										Novo {featsLabel} Homebrew
									</h3>

									{hbError && (
										<div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-[12px] text-destructive">
											{hbError}
										</div>
									)}

									<div className="grid grid-cols-2 gap-3">
										<Field label="Nome" className="col-span-2">
											<Input
												placeholder="Ex: Robusto"
												value={hbName}
												onChange={(e) => setHbName(e.target.value)}
												required
											/>
										</Field>
										<Field label="Categoria">
											<Input
												placeholder="Ex: Geral, Combate..."
												value={hbCategory}
												onChange={(e) => setHbCategory(e.target.value)}
											/>
										</Field>
										<Field label="Fonte (Livro)">
											<Input
												placeholder="Ex: Livro do Jogador..."
												value={hbSource}
												onChange={(e) => setHbSource(e.target.value)}
											/>
										</Field>
										<Field label="Pré-requisitos" className="col-span-2">
											<Input
												placeholder="Ex: Força 13+ (Opcional)"
												value={hbPrerequisites}
												onChange={(e) => setHbPrerequisites(e.target.value)}
											/>
										</Field>
										<Field label="Melhoria de Atributo" className="col-span-2">
											<Input
												placeholder="Ex: +1 de Constituição (Opcional)"
												value={hbAbilityIncrease}
												onChange={(e) => setHbAbilityIncrease(e.target.value)}
											/>
										</Field>
										<Field label="Descrição" className="col-span-2">
											<Textarea
												placeholder="Descreva as regras e efeitos..."
												value={hbDescription}
												onChange={(e) => setHbDescription(e.target.value)}
												rows={4}
												required
											/>
										</Field>
									</div>
								</div>

								<div className="flex justify-end gap-3 pt-4 border-t border-border/40 mt-4 shrink-0">
									<Button
										type="button"
										variant="ghost"
										onClick={() => setShowHomebrewForm(false)}
										disabled={creatingHb}
									>
										Cancelar
									</Button>
									<Button type="submit" variant="default" disabled={creatingHb}>
										{creatingHb ? "Criando..." : "Criar e Adicionar"}
									</Button>
								</div>
							</form>
						) : (
							<>
								{/* Search & Filters */}
								<div className="space-y-4 mb-4 shrink-0">
									<div className="flex gap-2">
										<div className="relative flex-1">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
											<Input
												placeholder="Buscar por nome ou regras..."
												value={searchQuery}
												onChange={(e) => setSearchQuery(e.target.value)}
												className="pl-9 text-xs"
											/>
										</div>
										{categoryOptions.length > 0 && (
											<Select
												value={categoryFilter}
												onChange={(e) => setCategoryFilter(e.target.value)}
												className="w-44 text-xs"
											>
												<option value="all">Todas as Categorias</option>
												{categoryOptions.map((cat) => (
													<option key={cat} value={cat}>
														{cat}
													</option>
												))}
											</Select>
										)}
									</div>
								</div>

								{/* Feats list */}
								<div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-none min-h-0">
									{loading ? (
										<div className="text-center py-8 text-[13px] text-muted-foreground">
											Buscando {featsLabel.toLowerCase()}...
										</div>
									) : filteredFeats.length === 0 ? (
										<div className="text-center py-8 text-[13px] text-muted-foreground">
											Nenhum registro encontrado.
										</div>
									) : (
										filteredFeats.map((feat) => {
											const added = isAlreadyAdded(feat);
											const selected = selectedFeat?.id === feat.id;
											return (
												// biome-ignore lint/a11y/useSemanticElements: interactive list item containing nested buttons
												<div
													key={feat.id}
													role="button"
													tabIndex={0}
													className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between group cursor-pointer ${
														selected
															? "bg-primary/10 border-primary"
															: "bg-background/40 border-border/40 hover:bg-background/70 hover:border-border/80"
													}`}
													onClick={() => setSelectedFeat(feat)}
													onKeyDown={(e) => {
														if (e.key === "Enter" || e.key === " ") {
															e.preventDefault();
															setSelectedFeat(feat);
														}
													}}
												>
													<div className="min-w-0 pr-2">
														<div className="flex items-center gap-1.5">
															<span className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
																{feat.name}
															</span>
															{feat.is_homebrew && (
																<span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ring-1 ring-amber-500/20">
																	Homebrew
																</span>
															)}
														</div>
														<div className="text-[11px] text-muted-foreground mt-0.5">
															{feat.category || "Geral"}
															{feat.prerequisites &&
																` · Req: ${feat.prerequisites}`}
														</div>
													</div>

													{added ? (
														<span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
															<Check className="h-3.5 w-3.5" />
														</span>
													) : (
														<Button
															type="button"
															variant="ghost"
															size="icon-sm"
															onClick={(e) => {
																e.stopPropagation();
																onSelectFeat(feat);
															}}
															className="h-7 w-7 rounded-md shrink-0 opacity-80 hover:opacity-100 hover:bg-primary/20"
														>
															<Plus className="h-4 w-4" />
														</Button>
													)}
												</div>
											);
										})
									)}
								</div>

								{/* Bottom bar for Homebrew */}
								<div className="mt-4 shrink-0 border-t border-border/40 pt-4 flex items-center justify-between gap-4">
									<span className="text-[11px] text-muted-foreground">
										Não achou o {featsLabel.toLowerCase()} que queria?
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
							</>
						)}
					</div>

					{/* Right Column: Feat Details Preview */}
					<div className="hidden md:flex w-88 flex-col p-6 overflow-y-auto bg-card-elevated/40 border-l border-border/40 relative">
						{selectedFeat ? (
							<div className="space-y-5 text-xs relative z-10">
								{/* Card header */}
								<div className="relative pb-4 border-b border-border/40">
									<div className="absolute -left-3 top-0 h-8 w-1 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
									<h4 className="text-base font-extrabold tracking-wide text-foreground">
										{selectedFeat.name}
									</h4>
									<div className="flex flex-wrap items-center gap-1.5 mt-2">
										<span className="bg-primary/15 text-primary font-bold px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider">
											{selectedFeat.category || "Geral"}
										</span>
										{selectedFeat.source && (
											<span className="text-[10px] text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
												Fonte: {selectedFeat.source}
											</span>
										)}
									</div>
								</div>

								{/* Prerequisites Section */}
								{selectedFeat.prerequisites && (
									<div className="rounded-xl border border-primary/10 bg-primary/5 p-3 space-y-1.5 shadow-sm">
										<span className="font-bold text-primary flex items-center gap-1.5 uppercase text-[9px] tracking-wider">
											<Shield className="h-3.5 w-3.5" />
											Pré-requisitos
										</span>
										<p className="text-foreground leading-relaxed">
											{selectedFeat.prerequisites}
										</p>
									</div>
								)}

								{/* Ability Increase Section */}
								{selectedFeat.ability_increase && (
									<div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1.5">
										<span className="font-bold text-muted-foreground flex items-center gap-1.5 uppercase text-[9px] tracking-wider">
											<Compass className="h-3.5 w-3.5 text-primary" />
											Melhoria de Atributo
										</span>
										<p className="text-foreground leading-relaxed">
											{selectedFeat.ability_increase}
										</p>
									</div>
								)}

								{/* Description/Effects Section */}
								<div className="space-y-2">
									<span className="font-bold text-foreground flex items-center gap-1.5 uppercase text-[9px] tracking-wider">
										<ScrollText className="h-3.5 w-3.5 text-primary" />
										Descrição do Efeito
									</span>
									<div className="text-muted-foreground leading-relaxed whitespace-pre-line p-3 rounded-xl border border-border/30 bg-muted/5 max-h-[300px] overflow-y-auto">
										{selectedFeat.description}
									</div>
								</div>
							</div>
						) : (
							<div className="flex-1 flex flex-col items-center justify-center text-center p-4">
								<div className="relative mb-3">
									<div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-150" />
									<BookOpen className="h-10 w-10 text-muted-foreground/40 relative z-10 animate-pulse" />
								</div>
								<p className="text-[13px] font-bold text-foreground">
									Nenhum {featsLabel.toLowerCase()} selecionado
								</p>
								<p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
									Selecione um item da lista para ver as estatísticas,
									pré-requisitos e efeitos detalhados.
								</p>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
