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

				const { data, error } = await client
					.from("feats")
					.select("*")
					.in("system", getCompatibleSystems(system))
					.order("name", { ascending: true });

				if (error) throw error;
				setAllFeats((data as Feat[]) || []);
			} catch (err) {
				console.error("Erro ao carregar talentos/poderes:", err);
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
			<DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 overflow-hidden bg-card border-border/40">
				<DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 shrink-0">
					<div className="flex items-center justify-between">
						<div>
							<DialogTitle className="text-lg font-bold flex items-center gap-2">
								<BookOpen className="h-5 w-5 text-primary" />
								Buscar no Compêndio de {featsLabel}
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground mt-1">
								Encontre e adicione {featsLabel.toLowerCase()} à sua ficha de
								personagem.
							</DialogDescription>
						</div>
						<Button
							type="button"
							variant={showHomebrewForm ? "ghost" : "default"}
							size="sm"
							onClick={() => setShowHomebrewForm(!showHomebrewForm)}
							className="text-xs h-8"
						>
							{showHomebrewForm ? "Voltar à busca" : "Criar Customizado"}
						</Button>
					</div>
				</DialogHeader>

				{showHomebrewForm ? (
					<form
						onSubmit={handleCreateHomebrew}
						className="flex-1 overflow-y-auto p-6 space-y-4"
					>
						<DialogDescription className="text-xs text-muted-foreground pb-2">
							Crie um registro customizado (Homebrew). Ele ficará disponível
							apenas para as suas fichas.
						</DialogDescription>

						{hbError && (
							<div className="bg-destructive/15 border border-destructive/20 text-destructive text-xs p-3 rounded-lg">
								{hbError}
							</div>
						)}

						<div className="grid grid-cols-2 gap-4">
							<Field label="Nome">
								<Input
									placeholder="Ex: Robusto"
									value={hbName}
									onChange={(e) => setHbName(e.target.value)}
									required
								/>
							</Field>
							<Field label="Categoria">
								<Input
									placeholder="Ex: Geral, Combate, Ocultista..."
									value={hbCategory}
									onChange={(e) => setHbCategory(e.target.value)}
								/>
							</Field>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<Field label="Pré-requisitos">
								<Input
									placeholder="Ex: Força 13+ (Opcional)"
									value={hbPrerequisites}
									onChange={(e) => setHbPrerequisites(e.target.value)}
								/>
							</Field>
							<Field label="Aumento de Atributo">
								<Input
									placeholder="Ex: +1 de Constituição (Opcional)"
									value={hbAbilityIncrease}
									onChange={(e) => setHbAbilityIncrease(e.target.value)}
								/>
							</Field>
						</div>

						<Field label="Descrição">
							<Textarea
								placeholder="Descreva as regras e efeitos mecânicos..."
								value={hbDescription}
								onChange={(e) => setHbDescription(e.target.value)}
								rows={6}
								required
							/>
						</Field>

						<Field label="Fonte (Livro)">
							<Input
								placeholder="Ex: PHB, Suplemento X..."
								value={hbSource}
								onChange={(e) => setHbSource(e.target.value)}
							/>
						</Field>

						<div className="flex justify-end gap-3 pt-4">
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
					<div className="flex-1 flex overflow-hidden">
						{/* Left Column: Search & List */}
						<div className="flex-1 flex flex-col p-5 border-r border-border/30 overflow-hidden">
							{/* Filters */}
							<div className="flex gap-3 mb-4 shrink-0">
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
										className="w-44 text-xs h-9.5"
									>
										<option value="all">Todas Categorias</option>
										{categoryOptions.map((cat) => (
											<option key={cat} value={cat}>
												{cat}
											</option>
										))}
									</Select>
								)}
							</div>

							{/* Feats list */}
							<div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin">
								{loading ? (
									<div className="text-center py-8 text-xs text-muted-foreground">
										Buscando no compêndio...
									</div>
								) : filteredFeats.length === 0 ? (
									<div className="text-center py-8 text-xs text-muted-foreground">
										Nenhum registro encontrado para a busca.
									</div>
								) : (
									filteredFeats.map((feat) => {
										const added = isAlreadyAdded(feat);
										const selected = selectedFeat?.id === feat.id;
										return (
											// biome-ignore lint/a11y/useKeyWithClickEvents: selection only
											// biome-ignore lint/a11y/noStaticElementInteractions: list container click
											<div
												key={feat.id}
												onClick={() => setSelectedFeat(feat)}
												className={`flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition-all duration-150 ${
													selected
														? "border-primary/50 bg-primary/5"
														: "border-border/30 hover:border-border/60 hover:bg-muted/10 bg-background/30"
												}`}
											>
												<div className="min-w-0 pr-4">
													<div className="flex items-center gap-1.5">
														<span className="font-semibold text-xs text-foreground truncate">
															{feat.name}
														</span>
														{feat.is_homebrew && (
															<span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1 py-0.5 rounded">
																H
															</span>
														)}
														<span className="text-[10px] text-muted-foreground uppercase tracking-wider">
															({feat.category || "Geral"})
														</span>
													</div>
													{feat.prerequisites && (
														<p className="text-[10px] text-muted-foreground/80 truncate mt-0.5">
															Req: {feat.prerequisites}
														</p>
													)}
												</div>
												<Button
													type="button"
													variant={added ? "ghost" : "default"}
													size="icon"
													onClick={(e) => {
														e.stopPropagation();
														if (!added) onSelectFeat(feat);
													}}
													className="h-7 w-7 rounded-md shrink-0 cursor-pointer"
													disabled={added}
												>
													{added ? (
														<Check className="h-3.5 w-3.5 text-emerald-500" />
													) : (
														<Plus className="h-3.5 w-3.5" />
													)}
												</Button>
											</div>
										);
									})
								)}
							</div>
						</div>

						{/* Right Column: Feat Details Preview */}
						<div className="hidden md:flex w-80 bg-background/30 flex-col p-5 overflow-y-auto border-l border-border/10">
							{selectedFeat ? (
								<div className="space-y-4 text-xs">
									<div>
										<h4 className="text-sm font-bold text-foreground">
											{selectedFeat.name}
										</h4>
										<div className="flex items-center gap-1.5 mt-1">
											<span className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[10px]">
												{selectedFeat.category || "Geral"}
											</span>
											{selectedFeat.source && (
												<span className="text-muted-foreground text-[10px]">
													Fonte: {selectedFeat.source}
												</span>
											)}
										</div>
									</div>

									{selectedFeat.ability_increase && (
										<div className="bg-card-elevated border border-border/40 rounded-lg p-2.5">
											<span className="font-bold text-foreground">
												Melhoria:
											</span>{" "}
											<span className="text-muted-foreground">
												{selectedFeat.ability_increase}
											</span>
										</div>
									)}

									{selectedFeat.prerequisites && (
										<div>
											<span className="font-bold text-foreground">
												Pré-requisito:
											</span>
											<p className="text-muted-foreground mt-0.5">
												{selectedFeat.prerequisites}
											</p>
										</div>
									)}

									<div className="border-t border-border/30 pt-3">
										<span className="font-bold text-foreground block mb-1">
											Efeitos:
										</span>
										<p className="text-muted-foreground leading-relaxed whitespace-pre-line">
											{selectedFeat.description}
										</p>
									</div>
								</div>
							) : (
								<div className="flex-1 flex flex-col items-center justify-center text-center p-4">
									<Sparkles className="h-8 w-8 text-muted-foreground/30 mb-2" />
									<p className="text-xs text-muted-foreground">
										Selecione um item da lista para visualizar os detalhes
										completos das regras e efeitos.
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
