import {
	ArrowLeft,
	BookOpen,
	Check,
	Clock,
	Compass,
	Eye,
	Flame,
	FlaskConical,
	Plus,
	Search,
	Shield,
	Skull,
	Sparkles,
	Target,
	Wand2,
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
import type { Spell } from "@/lib/store/types";
import { getSupabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface SpellSearchDialogProps {
	system: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectSpell: (spell: Spell) => void;
	currentSpells: Spell[];
}

const SCHOOL_THEMES: Record<
	string,
	{
		label: string;
		tone: string;
		badgeBg: string;
		border: string;
		icon: React.ComponentType<{ className?: string }>;
	}
> = {
	evocacao: {
		label: "Evocação",
		tone: "text-amber-300",
		badgeBg: "bg-amber-500/10 text-amber-300 border-amber-500/30",
		border: "border-l-amber-500",
		icon: Flame,
	},
	abjuracao: {
		label: "Abjuração",
		tone: "text-sky-300",
		badgeBg: "bg-sky-500/10 text-sky-300 border-sky-500/30",
		border: "border-l-sky-500",
		icon: Shield,
	},
	conjuracao: {
		label: "Conjuração",
		tone: "text-teal-300",
		badgeBg: "bg-teal-500/10 text-teal-300 border-teal-500/30",
		border: "border-l-teal-500",
		icon: Wand2,
	},
	convocacao: {
		label: "Convocação",
		tone: "text-teal-300",
		badgeBg: "bg-teal-500/10 text-teal-300 border-teal-500/30",
		border: "border-l-teal-500",
		icon: Wand2,
	},
	necromancia: {
		label: "Necromancia",
		tone: "text-emerald-400",
		badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
		border: "border-l-emerald-500",
		icon: Skull,
	},
	encantamento: {
		label: "Encantamento",
		tone: "text-pink-300",
		badgeBg: "bg-pink-500/10 text-pink-300 border-pink-500/30",
		border: "border-l-pink-500",
		icon: Sparkles,
	},
	ilusao: {
		label: "Ilusão",
		tone: "text-purple-300",
		badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/30",
		border: "border-l-purple-500",
		icon: Eye,
	},
	adivinhacao: {
		label: "Adivinhação",
		tone: "text-indigo-300",
		badgeBg: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
		border: "border-l-indigo-500",
		icon: Compass,
	},
	transmutacao: {
		label: "Transmutação",
		tone: "text-orange-300",
		badgeBg: "bg-orange-500/10 text-orange-300 border-orange-500/30",
		border: "border-l-orange-500",
		icon: FlaskConical,
	},
};

// Recognized D&D 5e source books
const TCE_SPELLS = new Set([
	"lâmina estrondosa (booming blade)",
	"lâmina da chama verde (green-flame blade)",
	"estilhaço mental (mind sliver)",
	"mistura cáustica de tasha (tasha's caustic brew)",
	"chicote mental de tasha (tasha's mind whip)",
	"invocar fera (summon beast)",
	"invocar feérico (summon fey)",
	"invocar morto-vivo (summon undead)",
	"invocar sombra (summon shadowspawn)",
	"fortaleza do intelecto (intellect fortress)",
	"sudário espiritual (spirit shroud)",
	"invocar aberração (summon aberration)",
	"invocar construto (summon construct)",
	"invocar elemental (summon elemental)",
	"invocar celestial (summon celestial)",
	"invocar espírito dracônico (summon draconic spirit)",
	"invocar ínfero (summon fiend)",
	"sonho do véu azul (dream of the blue veil)",
	"disfarce de outro mundo de tasha (tasha's otherworldly guise)",
	"lâmina do desastre (blade of disaster)",
]);

const XGE_SPELLS = new Set([
	"golpe primitivo (primal savagery)",
	"infestação (infestation)",
	"rajada de espadas (sword burst)",
	"pancada do trovão (thunderclap)",
	"palavra de resplandecência (word of radiance)",
	"moldar terra (mold earth)",
	"moldar água (shape water)",
	"controle de chamas (control flames)",
	"tromba de ar (gust)",
	"toque gélido / queimadura de gelo (frostbite)",
	"criar fogueira (create bonfire)",
	"absorver elementos (absorb elements)",
	"fera vínculo (beast bond)",
	"catapulta (catapult)",
	"causar medo (cause fear)",
	"cerimônia (ceremony)",
	"raio do caos (chaos bolt)",
	"faca de gelo (ice knife)",
	"armadilha de laço (snare)",
	"tremor de terra (earth tremor)",
	"ataque do zéfiro (zephyr strike)",
	"lâmina das sombras (shadow blade)",
	"espiga mental (mind spike)",
	"sopro do dragão (dragon's breath)",
	"espírito curador (healing spirit)",
	"vento protetor (warding wind)",
	"garra de terra de maximilian (maximilian's earthen grasp)",
	"passo do trovão (thunder step)",
	"erupção telúrica (erupting earth)",
	"transferência de vida (life transference)",
	"inimigos abundantes (enemies abound)",
	"maremoto (tidal wave)",
	"muralha de água (wall of water)",
	"radiação nociva (sickening radiance)",
	"sombra de moil (shadow of moil)",
	"esfera da tempestade (storm sphere)",
	"invocar demônio maior (summon greater demon)",
	"estática sináptica (synaptic static)",
	"arma sagrada (holy weapon)",
	"ataque do vento de aço (steel wind strike)",
	"passo distante (far step)",
	"dança macabra (danse macabre)",
	"muralha de luz (wall of light)",
	"turbilhão (maelstrom)",
	"prisão mental (mental prison)",
	"jaula da alma (soul cage)",
	"dispersão (scatter)",
	"ossos da terra (bones of the earth)",
	"coroa de estrelas (crown of stars)",
	"templo dos deuses (temple of the gods)",
	"palavra de poder: dor (power word pain)",
	"escuridão enlouquecedora (maddening darkness)",
	"dragão ilusório (illusory dragon)",
	"ressecamento horrível de abi-dalzim (abi-dalzim's horrid wilting)",
	"grito psíquico (psychic scream)",
	"metamorfose em massa (mass polymorph)",
	"invulnerabilidade (invulnerability)",
]);

function getSpellBook(spell: Spell): "phb" | "xge" | "tce" | "homebrew" {
	if (spell.is_homebrew) return "homebrew";
	const normalized = spell.name.toLowerCase().trim();
	if (TCE_SPELLS.has(normalized)) return "tce";
	if (XGE_SPELLS.has(normalized)) return "xge";
	return "phb";
}

function getSpellBookLabel(spell: Spell): string {
	const book = getSpellBook(spell);
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

function normalizeSchool(schoolName?: string) {
	if (!schoolName) return "geral";
	return schoolName
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

function getSchoolTheme(schoolName?: string) {
	const key = normalizeSchool(schoolName);
	return (
		SCHOOL_THEMES[key] || {
			label: schoolName || "Geral",
			tone: "text-primary",
			badgeBg: "bg-primary/10 text-primary border-primary/30",
			border: "border-l-primary",
			icon: Sparkles,
		}
	);
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
	const [bookFilter, setBookFilter] = useState<string>("all");
	const [onlyUnlearned, setOnlyUnlearned] = useState(false);
	const [allSpells, setAllSpells] = useState<Spell[]>([]);
	const [loading, setLoading] = useState(false);
	const [showHomebrewForm, setShowHomebrewForm] = useState(false);
	const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
	const [mobileView, setMobileView] = useState<"list" | "detail">("list");

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

				const { data } = await client
					.from("spells")
					.select("*")
					.in("system", getCompatibleSystems(system))
					.order("name", { ascending: true });

				let fetched = (data as Spell[]) || [];
				if (system === "ordem" || fetched.length === 0) {
					const { ORDEM_SPELLS_SEED } = await import("@/lib/ordem/presets");
					if (system === "ordem") {
						fetched = [...ORDEM_SPELLS_SEED, ...fetched];
					}
				}
				setAllSpells(fetched);

				if (fetched.length > 0) {
					setSelectedSpell(fetched[0]);
				}
			} catch (err) {
				console.error("Erro ao carregar magias:", err);
				if (system === "ordem") {
					const { ORDEM_SPELLS_SEED } = await import("@/lib/ordem/presets");
					setAllSpells(ORDEM_SPELLS_SEED);
				}
			} finally {
				setLoading(false);
			}
		}

		void fetchAllSpells();
	}, [open, system]);

	// Filter & sort spells by Level ASC, then Name ASC
	const filteredSpells = useMemo(() => {
		const filtered = allSpells.filter((spell) => {
			if (levelFilter !== "all" && spell.level !== Number(levelFilter)) {
				return false;
			}
			if (
				schoolFilter !== "all" &&
				normalizeSchool(spell.school) !== normalizeSchool(schoolFilter)
			) {
				return false;
			}
			if (bookFilter !== "all") {
				const b = getSpellBook(spell);
				if (b !== bookFilter) return false;
			}
			if (onlyUnlearned) {
				const alreadyAdded = currentSpells.some(
					(s) => s.name.toLowerCase() === spell.name.toLowerCase(),
				);
				if (alreadyAdded) return false;
			}
			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase().trim();
				const nameMatch = spell.name.toLowerCase().includes(query);
				const descMatch = spell.description?.toLowerCase().includes(query);
				const schoolMatch = spell.school?.toLowerCase().includes(query);
				return nameMatch || descMatch || schoolMatch;
			}
			return true;
		});

		// Sort by Level ascending (Truques 0 -> 1 -> 2 ... -> 9), then alphabetical by Name
		return filtered.sort((a, b) => {
			if (a.level !== b.level) {
				return a.level - b.level;
			}
			return a.name.localeCompare(b.name, "pt-BR");
		});
	}, [
		allSpells,
		levelFilter,
		schoolFilter,
		bookFilter,
		onlyUnlearned,
		searchQuery,
		currentSpells,
	]);

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

	useEffect(() => {
		if (!open) {
			setSearchQuery("");
			setLevelFilter("all");
			setSchoolFilter("all");
			setBookFilter("all");
			setOnlyUnlearned(false);
			setShowHomebrewForm(false);
			setSelectedSpell(null);
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
				setAllSpells((prev) => [spell, ...prev]);
				setSelectedSpell(spell);
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

	const formatLevelBadge = (lvl: number) => {
		if (lvl === 0) return "Truque";
		return `${lvl}º Círculo`;
	};

	const levelPills = [
		{ value: "all", label: "Todas" },
		{ value: "0", label: "Truques" },
		{ value: "1", label: "1º" },
		{ value: "2", label: "2º" },
		{ value: "3", label: "3º" },
		{ value: "4", label: "4º" },
		{ value: "5", label: "5º" },
		{ value: "6", label: "6º" },
		{ value: "7", label: "7º" },
		{ value: "8", label: "8º" },
		{ value: "9", label: "9º" },
	];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-4xl lg:max-w-5xl w-[96vw] h-[88vh] max-h-[840px] flex flex-col p-0 overflow-hidden bg-card-elevated border border-border/80 text-foreground shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
				{/* Top Arcane Header */}
				<DialogHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 shrink-0 bg-background/50 backdrop-blur-md pr-14 sm:pr-16">
					<div className="flex items-center justify-between gap-3">
						<div>
							<DialogTitle className="font-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
								<BookOpen className="h-5 w-5 text-primary shrink-0" />
								Grimório de Magias
							</DialogTitle>
							<DialogDescription className="text-xs text-muted-foreground mt-0.5">
								{allSpells.length} magias catalogadas · Ordenadas por Círculo e
								Nome.
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
							{showHomebrewForm ? "Voltar ao Grimório" : "Criar Homebrew"}
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
									Nova Magia Homebrew
								</h3>
							</div>

							{hbError && (
								<div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium">
									{hbError}
								</div>
							)}

							<div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
								<Field label="Nome da Magia" className="sm:col-span-2">
									<Input
										placeholder="Ex: Flecha Corrosiva de Hadar"
										value={hbName}
										onChange={(e) => setHbName(e.target.value)}
										required
										className="h-9 text-xs font-medium"
									/>
								</Field>

								<Field label="Nível / Círculo da Magia">
									<Select
										value={String(hbLevel)}
										onChange={(e) => setHbLevel(Number(e.target.value))}
										className="h-9 text-xs"
									>
										<option value="0">Truque (Círculo 0)</option>
										<option value="1">1º Círculo</option>
										<option value="2">2º Círculo</option>
										<option value="3">3º Círculo</option>
										<option value="4">4º Círculo</option>
										<option value="5">5º Círculo</option>
										<option value="6">6º Círculo</option>
										<option value="7">7º Círculo</option>
										<option value="8">8º Círculo</option>
										<option value="9">9º Círculo</option>
									</Select>
								</Field>

								<Field label="Escola de Magia">
									<Select
										value={hbSchool}
										onChange={(e) => setHbSchool(e.target.value)}
										className="h-9 text-xs"
									>
										<option value="">Selecione a Escola...</option>
										{schoolOptions.map((opt) => (
											<option key={opt} value={opt}>
												{opt}
											</option>
										))}
									</Select>
								</Field>

								<Field label="Tempo de Conjuração">
									<Input
										placeholder="Ex: 1 ação, 1 reação"
										value={hbCastingTime}
										onChange={(e) => setHbCastingTime(e.target.value)}
										className="h-9 text-xs"
									/>
								</Field>

								<Field label="Alcance">
									<Input
										placeholder="Ex: 18 metros, Toque"
										value={hbRange}
										onChange={(e) => setHbRange(e.target.value)}
										className="h-9 text-xs"
									/>
								</Field>

								<Field label="Componentes">
									<Input
										placeholder="Ex: V, S, M (uma pena)"
										value={hbComponents}
										onChange={(e) => setHbComponents(e.target.value)}
										className="h-9 text-xs"
									/>
								</Field>

								<Field label="Duração">
									<Input
										placeholder="Ex: Instantânea, Concentração"
										value={hbDuration}
										onChange={(e) => setHbDuration(e.target.value)}
										className="h-9 text-xs"
									/>
								</Field>
							</div>

							<Field label="Descrição Detalhada dos Efeitos">
								<Textarea
									rows={4}
									placeholder="Descreva as regras, dano e salvaguardas..."
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
					/* Main Grimoire Explorer View */
					<div className="flex-1 min-h-0 flex flex-col">
						{/* Search Bar & Comprehensive Filters (Hidden on mobile when in detail mode) */}
						<div
							className={cn(
								"p-3 sm:px-5 sm:py-3 border-b border-border/60 bg-background/30 flex flex-col gap-2.5 shrink-0",
								mobileView === "detail" && "hidden md:flex",
							)}
						>
							<div className="flex flex-col sm:flex-row items-center gap-2">
								{/* Search input with quick clear */}
								<div className="relative flex-1 w-full">
									<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
									<Input
										placeholder="Buscar por nome, efeito ou escola..."
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

								{/* School & Book Filters */}
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

									{/* School Selector */}
									<Select
										value={schoolFilter}
										onChange={(e) => setSchoolFilter(e.target.value)}
										className="h-9 text-xs rounded-xl bg-background/50 border-border/60 w-[165px]"
									>
										<option value="all">Todas as Escolas</option>
										{schoolOptions.map((opt) => (
											<option key={opt} value={opt}>
												{opt}
											</option>
										))}
									</Select>

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
										<span>Não adicionadas</span>
									</button>
								</div>
							</div>

							{/* Compact Level Filter Bar (Wrap/Buttons) */}
							<div className="flex flex-wrap items-center gap-1 text-xs">
								<span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground/80 shrink-0 mr-1">
									Círculo:
								</span>
								{levelPills.map((pill) => {
									const isActive = levelFilter === pill.value;
									return (
										<button
											type="button"
											key={pill.value}
											onClick={() => setLevelFilter(pill.value)}
											className={cn(
												"px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all select-none cursor-pointer border",
												isActive
													? "border-primary bg-primary text-primary-foreground shadow-xs shadow-primary/20 scale-[1.02]"
													: "border-border/50 bg-background/40 text-muted-foreground hover:border-border hover:bg-background/80 hover:text-foreground active:scale-95",
											)}
										>
											{pill.label}
										</button>
									);
								})}
							</div>
						</div>

						{/* Split View: Left List (60%) + Right Details (40%) */}
						<div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border/60">
							{/* LEFT: Spells List */}
							<div
								className={cn(
									"flex-1 flex flex-col min-h-0 p-3 sm:p-4 overflow-y-auto scrollbar-none",
									mobileView === "detail" ? "hidden md:flex" : "flex",
								)}
							>
								<div className="flex items-center justify-between px-1 pb-2 text-[11px] font-semibold text-muted-foreground">
									<span>
										{filteredSpells.length} de {allSpells.length} magias
									</span>
									{currentSpells.length > 0 && (
										<span className="text-emerald-400">
											{currentSpells.length} preparadas
										</span>
									)}
								</div>

								{loading ? (
									<div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
										<Sparkles className="h-6 w-6 text-primary animate-spin mb-2 opacity-60" />
										<p className="text-xs font-semibold">
											Carregando magias...
										</p>
									</div>
								) : filteredSpells.length === 0 ? (
									<div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
										<BookOpen className="h-7 w-7 mb-2 opacity-30" />
										<p className="text-xs font-semibold text-foreground">
											Nenhuma magia encontrada
										</p>
									</div>
								) : (
									<div className="space-y-1.5">
										{filteredSpells.map((spell, index) => {
											const isAdded = currentSpells.some(
												(s) =>
													s.name.toLowerCase() === spell.name.toLowerCase(),
											);
											const isSelected = selectedSpell?.id === spell.id;
											const theme = getSchoolTheme(spell.school);
											const SchoolIcon = theme.icon;
											const bookLabel = getSpellBookLabel(spell);

											// Check if we should render a level separator
											const prevSpell = filteredSpells[index - 1];
											const showLevelHeader =
												levelFilter === "all" &&
												(!prevSpell || prevSpell.level !== spell.level);

											return (
												<div key={spell.id} className="space-y-1.5">
													{showLevelHeader && (
														<div className="pt-2.5 pb-1 px-1 flex items-center gap-2">
															<span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary flex items-center gap-1.5">
																<Sparkles className="h-3 w-3" />
																{spell.level === 0
																	? "Truques (Círculo 0)"
																	: `${spell.level}º Círculo`}
															</span>
															<div className="h-px flex-1 bg-border/50" />
														</div>
													)}

													<div
														role="button"
														tabIndex={0}
														className={cn(
															"w-full text-left p-2.5 sm:p-3 rounded-xl border border-l-4 transition-all duration-150 ease-out flex items-center justify-between group cursor-pointer select-none",
															theme.border,
															isSelected
																? "bg-primary/15 border-primary/70 shadow-xs translate-x-0.5"
																: "bg-background/40 border-border/50 hover:bg-background/80 hover:border-border/80 hover:translate-x-0.5",
														)}
														onClick={() => {
															setSelectedSpell(spell);
															setMobileView("detail");
														}}
														onKeyDown={(e) => {
															if (e.key === "Enter" || e.key === " ") {
																e.preventDefault();
																setSelectedSpell(spell);
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
																	{spell.name}
																</span>

																<span className="text-[8px] font-semibold text-white/50 bg-white/5 px-1.5 py-0.2 rounded border border-white/10">
																	{bookLabel}
																</span>
															</div>

															<div className="flex flex-wrap items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
																<span
																	className={cn(
																		"font-semibold flex items-center gap-1",
																		theme.tone,
																	)}
																>
																	<SchoolIcon className="h-2.5 w-2.5 inline" />
																	{formatLevelBadge(spell.level)} ·{" "}
																	{spell.school || "Geral"}
																</span>

																{spell.casting_time && (
																	<span className="text-white/60">
																		· ⏱️ {spell.casting_time}
																	</span>
																)}

																{spell.range && (
																	<span className="text-white/50 hidden sm:inline">
																		· 🎯 {spell.range}
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
																		onSelectSpell(spell);
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
												</div>
											);
										})}
									</div>
								)}
							</div>

							{/* RIGHT: Arcane Reader Detail Pane (Fixed container with bottom-pinned button) */}
							<div
								className={cn(
									"md:w-[380px] lg:w-[440px] p-4 sm:p-5 flex flex-col justify-between min-h-0 bg-background/25 overflow-hidden",
									mobileView === "list" ? "hidden md:flex" : "flex",
								)}
							>
								{selectedSpell ? (
									<div
										key={selectedSpell.id}
										className="flex-1 flex flex-col justify-between min-h-0 animate-in fade-in-50 slide-in-from-right-1 duration-150"
									>
										{/* Mobile Back Button */}
										<button
											type="button"
											onClick={() => setMobileView("list")}
											className="md:hidden flex items-center gap-1.5 text-xs text-primary font-bold pb-2.5 mb-2 border-b border-border/40 hover:underline cursor-pointer shrink-0"
										>
											<ArrowLeft className="h-4 w-4" />
											Voltar para a Lista de Magias
										</button>

										{/* Top part: Title, Book, School, Stats Grid */}
										<div className="space-y-3 shrink-0">
											<div>
												<div className="flex items-center justify-between gap-2 flex-wrap">
													<span
														className={cn(
															"px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider",
															getSchoolTheme(selectedSpell.school).badgeBg,
														)}
													>
														{formatLevelBadge(selectedSpell.level)} ·{" "}
														{selectedSpell.school || "Geral"}
													</span>

													<span className="text-[9px] font-semibold text-white/60 bg-white/5 px-2 py-0.5 rounded border border-white/10">
														{getSpellBookLabel(selectedSpell)}
													</span>
												</div>

												<h3 className="font-display text-lg sm:text-xl font-bold text-white tracking-tight mt-1.5">
													{selectedSpell.name}
												</h3>
											</div>

											{/* Spell Stats Grid */}
											<div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-border/60 bg-background/40 text-xs">
												<div className="space-y-0.5">
													<span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
														<Clock className="h-2.5 w-2.5 text-primary" /> Tempo
													</span>
													<p className="font-semibold text-foreground text-[11px]">
														{selectedSpell.casting_time || "1 ação"}
													</p>
												</div>

												<div className="space-y-0.5">
													<span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
														<Target className="h-2.5 w-2.5 text-primary" />{" "}
														Alcance
													</span>
													<p className="font-semibold text-foreground text-[11px]">
														{selectedSpell.range || "Pessoal"}
													</p>
												</div>

												<div className="space-y-0.5 pt-1.5 border-t border-border/40">
													<span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
														<Sparkles className="h-2.5 w-2.5 text-primary" />{" "}
														Componentes
													</span>
													<p className="font-semibold text-foreground text-[11px] truncate">
														{selectedSpell.components || "V, S"}
													</p>
												</div>

												<div className="space-y-0.5 pt-1.5 border-t border-border/40">
													<span className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
														<Clock className="h-2.5 w-2.5 text-primary" /> Duração
													</span>
													<p className="font-semibold text-foreground text-[11px] truncate">
														{selectedSpell.duration || "Instantânea"}
													</p>
												</div>
											</div>
										</div>

										{/* Middle part: Description container stretching to fill full vertical height */}
										<div className="flex flex-col flex-1 min-h-0 my-3 space-y-1.5">
											<h4 className="text-[9px] font-extrabold uppercase tracking-wider text-muted-foreground shrink-0">
												Descrição dos Efeitos
											</h4>
											<div className="p-3.5 rounded-xl border border-border/50 bg-background/40 text-[11px] sm:text-xs leading-relaxed text-white/90 whitespace-pre-line break-words flex-1 h-full min-h-0 overflow-y-auto">
												{selectedSpell.description}
											</div>
										</div>

										{/* Bottom Action Button (ALWAYS PINNED FIRMLY TO THE BOTTOM) */}
										<div className="pt-2 border-t border-border/40 shrink-0">
											{currentSpells.some(
												(s) =>
													s.name.toLowerCase() ===
													selectedSpell.name.toLowerCase(),
											) ? (
												<div className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-bold text-xs">
													<Check className="h-3.5 w-3.5" />
													Magia já está na Ficha
												</div>
											) : (
												<Button
													type="button"
													className="w-full gap-2 font-bold h-10 rounded-xl text-xs shadow-md shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
													onClick={() => onSelectSpell(selectedSpell)}
												>
													<Plus className="h-3.5 w-3.5" />
													Adicionar Magia à Ficha
												</Button>
											)}
										</div>
									</div>
								) : (
									<div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
										<BookOpen className="h-8 w-8 mb-2 opacity-30 text-primary" />
										<p className="text-xs font-semibold text-foreground">
											Selecione uma magia
										</p>
										<p className="text-[10px] text-muted-foreground mt-0.5">
											Clique em qualquer magia para ler seus efeitos e regras.
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
