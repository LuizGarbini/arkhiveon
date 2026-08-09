import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, FileText, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
	AbilitiesFields,
	buildCharacterFormDefaults,
	CHARACTER_NAME_REQUIRED_MESSAGE,
	type CharacterFormValues,
	CombatFields,
	FeatsFields,
	IdentityFields,
	InventoryFields,
	MagicFields,
	NotesFields,
	PersonalityFields,
	SanityFields,
	SystemFields,
	sanitizeCharacterFormValues,
} from "@/components/character-sheet-fields";
import { CrisImportDialog } from "@/components/ordem/cris-import-dialog";
import { SaveSheetLayoutPanel } from "@/components/save-sheet-layout-panel";
import { SheetModuleEditor } from "@/components/sheet-module-editor";
import {
	SystemPicker,
	type SystemPickerSelection,
} from "@/components/system-picker";
import { Button } from "@/components/ui/button";
import { FormTabs } from "@/components/ui/form-tabs";
import { shouldShowEmptyCampaignOnboarding } from "@/lib/campaign-bootstrap";
import {
	cloneSheetLayout,
	createCustomSheetModule,
	createDefaultSheetLayout,
	normalizeModuleOrders,
} from "@/lib/sheet-modules";
import type { RpgSystem, SheetModuleConfig } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sheets/new")({
	component: NewSheetPage,
});

type WizardStep = "system" | "essential" | "layout" | "details" | "review";

const WIZARD_STEPS: Array<{
	id: WizardStep;
	label: string;
	description: string;
}> = [
	{ id: "system", label: "Sistema", description: "Escolha o template" },
	{ id: "essential", label: "Essencial", description: "Nome e identidade" },
	{ id: "layout", label: "Layout", description: "Organize os módulos" },
	{ id: "details", label: "Detalhes", description: "Stats — opcional" },
	{ id: "review", label: "Revisão", description: "Salvar ficha" },
];

function scrollToTop() {
	setTimeout(() => {
		const mainEl = document.querySelector("main");
		if (mainEl) {
			mainEl.scrollTo({ top: 0, behavior: "smooth" });
		} else {
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}, 50);
}

const detailsTabs = [
	{ id: "abilities", label: "Atributos" },
	{ id: "combat", label: "Combate" },
	{ id: "extra", label: "Inventário & notas" },
];

function NewSheetPage() {
	const navigate = useNavigate();
	const addCharacter = useRPGStore((state) => state.addCharacter);
	const customTemplates = useRPGStore((state) => state.customTemplates || []);
	const campaigns = useRPGStore((state) => state.campaigns);
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const hasLoadedCampaigns = useRPGStore((state) => state.hasLoadedCampaigns);
	const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);
	const [activeStep, setActiveStep] = useState<WizardStep>("system");

	useEffect(() => {
		if (
			shouldShowEmptyCampaignOnboarding({
				hasLoadedCampaigns,
				campaignCount: campaigns.length,
			})
		) {
			void navigate({ to: "/dashboard" });
		}
	}, [hasLoadedCampaigns, campaigns.length, navigate]);

	const [stepError, setStepError] = useState<string | null>(null);
	const [selectedLayoutTemplateId, setSelectedLayoutTemplateId] = useState<
		string | undefined
	>();
	const [detailsTab, setDetailsTab] = useState("abilities");
	const [prevIndex, setPrevIndex] = useState(-1);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);

	useEffect(() => {
		const index = detailsTabs.findIndex((t) => t.id === detailsTab);
		if (index !== -1) {
			if (prevIndex !== -1 && index < prevIndex) {
				setSlideDirection("right");
			} else {
				setSlideDirection("left");
			}
			setPrevIndex(index);
		}
	}, [detailsTab, prevIndex]);

	const [modules, setModules] = useState<SheetModuleConfig[]>(
		() => createDefaultSheetLayout("dnd5e").modules,
	);
	const form = useForm<CharacterFormValues>({
		defaultValues: buildCharacterFormDefaults(
			{
				sheetLayout: createDefaultSheetLayout("dnd5e"),
			},
			{ forCreation: true },
		),
	});
	const {
		register,
		control,
		setValue,
		handleSubmit,
		trigger,
		formState: { errors, isSubmitting },
	} = form;

	// Inherit system automatically from active campaign if defined
	useEffect(() => {
		if (activeCampaign?.system) {
			setValue("system", activeCampaign.system);
		}
	}, [activeCampaign?.system, setValue]);
	const system = useWatch({ control, name: "system" }) as RpgSystem;
	const config = SYSTEM_CONFIG[system] ?? SYSTEM_CONFIG.dnd5e;
	const characterName = useWatch({ control, name: "characterName" });
	const characterClass = useWatch({ control, name: "class" });
	const characterRace = useWatch({ control, name: "race" });
	const characterLevel = useWatch({ control, name: "level" });
	const characterBackground = useWatch({ control, name: "background" });

	useEffect(() => {
		if (stepError && characterName?.trim()) {
			setStepError(null);
		}
	}, [characterName, stepError]);

	const activeSteps = WIZARD_STEPS;
	const activeStepIndex = activeSteps.findIndex(
		(step) => step.id === activeStep,
	);
	const enabledModules = useMemo(
		() => modules.filter((module) => module.enabled),
		[modules],
	);
	const progress = Math.round(
		((activeStepIndex + 1) / activeSteps.length) * 100,
	);

	const selectedLayoutTemplate = customTemplates.find(
		(template) => template.id === selectedLayoutTemplateId,
	);

	useEffect(() => {
		const currentTemplate = form.getValues("sheetLayout")?.template;
		if (currentTemplate === system || selectedLayoutTemplateId) return;
		const nextConfig = SYSTEM_CONFIG[system] ?? SYSTEM_CONFIG.generic;
		const nextLayout = createDefaultSheetLayout(system, {
			showSanity: nextConfig.showSanity,
			showSpells: nextConfig.showSpells,
		});
		setModules(nextLayout.modules);
		setValue("sheetLayout", nextLayout, { shouldDirty: true });
	}, [form, selectedLayoutTemplateId, setValue, system]);

	async function validateStep(step: WizardStep): Promise<boolean> {
		if (step === "system") {
			return Boolean(system);
		}
		if (step === "essential") {
			const nameVal = form.getValues("characterName");
			if (!nameVal?.trim()) {
				return false;
			}
			return trigger("characterName");
		}
		return true;
	}

	async function goToStep(step: WizardStep) {
		const targetIndex = activeSteps.findIndex((item) => item.id === step);
		if (targetIndex > activeStepIndex) {
			for (let index = activeStepIndex; index < targetIndex; index += 1) {
				const valid = await validateStep(activeSteps[index].id);
				if (!valid) {
					setStepError(
						activeSteps[index].id === "essential"
							? CHARACTER_NAME_REQUIRED_MESSAGE
							: "Complete esta etapa antes de continuar.",
					);
					setActiveStep(activeSteps[index].id);
					scrollToTop();
					return;
				}
			}
		}
		setStepError(null);
		setActiveStep(step);
		scrollToTop();
	}

	async function goNext() {
		const valid = await validateStep(activeStep);
		if (!valid) {
			setStepError(
				activeStep === "essential"
					? CHARACTER_NAME_REQUIRED_MESSAGE
					: "Complete esta etapa antes de continuar.",
			);
			return;
		}
		setStepError(null);
		const next = activeSteps[activeStepIndex + 1];
		if (next) {
			setActiveStep(next.id);
			scrollToTop();
		}
	}

	function skipDetails() {
		setStepError(null);
		setActiveStep("review");
		scrollToTop();
	}

	function goBack() {
		const previous = activeSteps[activeStepIndex - 1];
		if (previous) {
			setActiveStep(previous.id);
			scrollToTop();
		}
	}

	function handleSelectSystem(selection: SystemPickerSelection) {
		setStepError(null);
		setSelectedLayoutTemplateId(undefined);

		if (selection.type === "layout") {
			const template = customTemplates.find(
				(item) => item.id === selection.layoutTemplateId,
			);
			if (!template?.sheetLayout) return;

			const baseSystem = template.baseSystem ?? selection.system;
			const nextLayout = cloneSheetLayout(template.sheetLayout, baseSystem);
			setSelectedLayoutTemplateId(template.id);
			setModules(normalizeModuleOrders(nextLayout.modules));
			setValue("system", baseSystem, { shouldDirty: true });
			setValue("sheetLayout", nextLayout, { shouldDirty: true });
			setValue("systemAttributes", {}, { shouldDirty: true });
			setActiveStep("essential");
			scrollToTop();
			return;
		}

		const nextConfig = SYSTEM_CONFIG[selection.system] ?? SYSTEM_CONFIG.generic;
		const nextLayout = createDefaultSheetLayout(selection.system, {
			showSanity: nextConfig.showSanity,
			showSpells: nextConfig.showSpells,
		});
		setValue("system", selection.system, { shouldDirty: true });
		setValue("sheetLayout", nextLayout, { shouldDirty: true });
		setValue("systemAttributes", {}, { shouldDirty: true });
		setModules(nextLayout.modules);
		setActiveStep("essential");
		scrollToTop();
	}

	function addCustomModule(kind: "customText" | "customStats") {
		const title = window.prompt(
			kind === "customText"
				? "Digite o título para o novo Bloco de Texto:"
				: "Digite o título para o novo Bloco de Stats:",
		);
		if (title === null) return; // User cancelled
		const trimmed = title.trim();
		if (!trimmed) {
			alert("O título não pode ser vazio.");
			return;
		}
		if (
			trimmed.toLowerCase() === "novo texto livre" ||
			trimmed.toLowerCase() === "novo bloco de stats"
		) {
			alert("Por favor, digite um título personalizado e diferente do padrão.");
			return;
		}

		setModules((current) =>
			normalizeModuleOrders([
				...current,
				{
					...createCustomSheetModule(kind, current.length * 10 + 100),
					title: trimmed,
				},
			]),
		);
	}

	function onSubmit(values: CharacterFormValues) {
		if (!values.characterName?.trim()) {
			setStepError(CHARACTER_NAME_REQUIRED_MESSAGE);
			setActiveStep("essential");
			scrollToTop();
			return;
		}
		const sanitized = sanitizeCharacterFormValues(values, {
			emptyToZero: true,
		});
		const sheetLayout = {
			version: 1 as const,
			template: system,
			modules: normalizeModuleOrders(modules),
		};
		const created = addCharacter({
			...sanitized,
			sheetLayout,
			customTemplateId: selectedLayoutTemplateId,
		});
		void navigate({
			to: "/sheets/$characterId",
			params: { characterId: created.id },
		});
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="mx-auto flex w-full max-w-6xl flex-col gap-7 px-6 py-8 sm:px-8"
		>
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-7 shadow-xl shadow-black/5 sm:p-9">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-3xl">
						<div className="flex flex-col items-start gap-4">
							<Link
								to="/characters"
								className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
							>
								<ArrowLeft className="h-3.5 w-3.5" />
								Voltar para personagens
							</Link>
							<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
								<FileText className="h-3.5 w-3.5" />
								Nova ficha
							</div>
						</div>
						<h1 className="font-display mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
							Crie uma ficha modular
						</h1>
						<p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
							Escolha o sistema, defina o essencial e monte o layout arrastando
							os módulos. Stats e detalhes podem ficar para depois.
						</p>
					</div>
					<div className="flex flex-col items-end gap-3">
						<CrisImportDialog
							onImportSuccess={(id) => {
								void navigate({
									to: "/sheets/$characterId",
									params: { characterId: id },
								});
							}}
						/>
						<div className="min-w-[220px] rounded-2xl border border-border/70 bg-background/45 p-4">
							<div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
								<span>Progresso</span>
								<span className="text-primary">{progress}%</span>
							</div>
							<div className="mt-2 h-2 overflow-hidden rounded-full bg-muted/60">
								<div
									className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<p className="mt-2 text-[12px] font-bold text-foreground">
								{activeSteps[activeStepIndex]?.label}
							</p>
						</div>
					</div>
				</div>
			</header>

			<div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
				<aside className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm shadow-black/5 lg:sticky lg:top-24 lg:self-start">
					{activeSteps.map((step, index) => {
						const active = step.id === activeStep;
						const done = index < activeStepIndex;
						const optional = step.id === "details";
						return (
							<button
								key={step.id}
								type="button"
								onClick={() => void goToStep(step.id)}
								className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ${
									active
										? "bg-primary/10 text-primary"
										: "text-muted-foreground hover:bg-muted/45 hover:text-foreground"
								}`}
							>
								<span
									className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-[11px] font-bold ${
										active || done
											? "border-primary/25 bg-primary/10 text-primary"
											: "border-border/70 bg-background/45"
									}`}
								>
									{done ? <Check className="h-3.5 w-3.5" /> : index + 1}
								</span>
								<span>
									<span className="flex items-center gap-2">
										<span className="block text-[13px] font-bold">
											{step.label}
										</span>
										{optional ? (
											<span className="rounded-full bg-muted/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
												Opcional
											</span>
										) : null}
									</span>
									<span className="block text-[11px]">{step.description}</span>
								</span>
							</button>
						);
					})}
				</aside>

				<section className="min-h-[560px] rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/5 sm:p-8">
					{activeStep === "system" && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Template"
								title="Escolha o sistema da ficha"
								description="O template define os módulos iniciais, rótulos de atributos e campos específicos."
							/>
							<SystemPicker
								value={system}
								layoutTemplateId={selectedLayoutTemplateId}
								onSelect={handleSelectSystem}
							/>
						</div>
					)}

					{activeStep === "essential" && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Essencial"
								title="Quem é esse personagem?"
								description="Só o nome é obrigatório. O restante você completa agora ou depois na ficha."
							/>

							{system === "ordem" && (
								<div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="font-display text-base font-bold text-primary flex items-center gap-2">
												<Sparkles className="h-4 w-4" /> Galeria de Agentes
												Prontos da Ordem
											</h4>
											<p className="text-xs text-muted-foreground">
												Escolha um agente pré-construído com ficha completa,
												rituais, habilidades e retrato em HD
											</p>
										</div>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[460px] overflow-y-auto pr-1">
										{[
											{
												id: "agatha",
												name: "Agatha",
												classLabel: "Ocultista",
												subclass: "Graduado",
												nex: "NEX 40%",
												pv: 40,
												san: 52,
												pe: 40,
												img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Agatha - token estilo Hexatombe.png",
												fallback: "/presets/mage.png",
												presetIdx: 0,
												color:
													"from-purple-900/60 to-purple-950/90 border-purple-500/40 text-purple-200",
												badgeBg:
													"bg-purple-500/20 text-purple-300 border-purple-500/30",
											},
											{
												id: "giovanni",
												name: "Giovanni Opspor",
												classLabel: "Combatente",
												subclass: "Aniquilador",
												nex: "NEX 40%",
												pv: 68,
												san: 30,
												pe: 20,
												img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Giovanni Opspor - token estilo Hexatombe.png",
												fallback: "/presets/warrior.png",
												presetIdx: 1,
												color:
													"from-red-900/60 to-red-950/90 border-red-500/40 text-red-200",
												badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
											},
											{
												id: "carrara",
												name: "Carrara",
												classLabel: "Especialista",
												subclass: "Infiltrador",
												nex: "NEX 35%",
												pv: 48,
												san: 42,
												pe: 35,
												img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Carrara - token estilo Hexatombe.png",
												fallback: "/presets/rogue.png",
												presetIdx: 2,
												color:
													"from-emerald-900/60 to-emerald-950/90 border-emerald-500/40 text-emerald-200",
												badgeBg:
													"bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
											},
											{
												id: "cleo",
												name: "Cleo",
												classLabel: "Ocultista",
												subclass: "Conduíte",
												nex: "NEX 35%",
												pv: 36,
												san: 58,
												pe: 45,
												img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Cleo - token estilo Hexatombe.png",
												fallback: "/presets/mage.png",
												presetIdx: 3,
												color:
													"from-purple-900/60 to-purple-950/90 border-purple-500/40 text-purple-200",
												badgeBg:
													"bg-purple-500/20 text-purple-300 border-purple-500/30",
											},
											{
												id: "cristino",
												name: "Cristino",
												classLabel: "Combatente",
												subclass: "Guerreiro",
												nex: "NEX 35%",
												pv: 62,
												san: 32,
												pe: 22,
												img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Cristino - token estilo Hexatombe.png",
												fallback: "/presets/warrior.png",
												presetIdx: 4,
												color:
													"from-red-900/60 to-red-950/90 border-red-500/40 text-red-200",
												badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
											},
											{
												id: "mosto",
												name: "Mosto",
												classLabel: "Especialista",
												subclass: "Técnico",
												nex: "NEX 30%",
												pv: 44,
												san: 40,
												pe: 30,
												img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Mosto - token estilo Hexatombe.png",
												fallback: "/presets/detective.png",
												presetIdx: 5,
												color:
													"from-emerald-900/60 to-emerald-950/90 border-emerald-500/40 text-emerald-200",
												badgeBg:
													"bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
											},
											{
												id: "nando",
												name: "Nando",
												classLabel: "Combatente",
												subclass: "Tropa de Choque",
												nex: "NEX 30%",
												pv: 70,
												san: 28,
												pe: 18,
												img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Nando - token estilo Hexatombe.png",
												fallback: "/presets/warrior.png",
												presetIdx: 6,
												color:
													"from-red-900/60 to-red-950/90 border-red-500/40 text-red-200",
												badgeBg: "bg-red-500/20 text-red-300 border-red-500/30",
											},
											{
												id: "tarrafa",
												name: "Tarrafa",
												classLabel: "Ocultista",
												subclass: "Intuitivo",
												nex: "NEX 30%",
												pv: 34,
												san: 60,
												pe: 42,
												img: "/Arquivos secretos/AS1/Agente de Elite - Extras/Tarrafa - token estilo Hexatombe.png",
												fallback: "/presets/cleric.png",
												presetIdx: 7,
												color:
													"from-purple-900/60 to-purple-950/90 border-purple-500/40 text-purple-200",
												badgeBg:
													"bg-purple-500/20 text-purple-300 border-purple-500/30",
											},
											{
												id: "laila",
												name: "Laila Verdante",
												classLabel: "Ocultista",
												subclass: "Lâmina Paranormal",
												nex: "NEX 50%",
												pv: 48,
												san: 50,
												pe: 50,
												img: "/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token-Laila-Verdante-borda.png",
												fallback: "/presets/mage.png",
												presetIdx: 8,
												color:
													"from-purple-900/60 to-purple-950/90 border-purple-500/40 text-purple-200",
												badgeBg:
													"bg-purple-500/20 text-purple-300 border-purple-500/30",
											},
											{
												id: "alice",
												name: "Alice Cruzes",
												classLabel: "Especialista",
												subclass: "Médico de Campo",
												nex: "NEX 45%",
												pv: 54,
												san: 48,
												pe: 38,
												img: "/Arquivos secretos/AS6/Extras/AS 06 - Extras v1.0 - Elite/Token---Alice-Cruzes---borda.png",
												fallback: "/presets/detective.png",
												presetIdx: 9,
												color:
													"from-emerald-900/60 to-emerald-950/90 border-emerald-500/40 text-emerald-200",
												badgeBg:
													"bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
											},
										].map((agent) => (
											<div
												key={agent.id}
												className={`group relative overflow-hidden rounded-xl border bg-gradient-to-b ${agent.color} p-3.5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/40 flex flex-col justify-between`}
											>
												{/* Portrait Header */}
												<div className="relative mb-3 aspect-[4/3] w-full overflow-hidden rounded-lg bg-black/40 border border-white/10">
													<img
														src={encodeURI(agent.img)}
														alt={agent.name}
														className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
														onError={(e) => {
															(e.target as HTMLImageElement).src =
																agent.fallback;
														}}
													/>
													<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

													{/* NEX Badge */}
													<span className="absolute top-2 right-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-amber-300 backdrop-blur-md border border-amber-500/30">
														{agent.nex}
													</span>

													{/* Name overlay */}
													<div className="absolute bottom-2 left-2 right-2">
														<div className="font-display text-sm font-bold text-white drop-shadow-md">
															{agent.name}
														</div>
														<div className="text-[10px] text-white/70">
															{agent.subclass}
														</div>
													</div>
												</div>

												{/* Badges & Stats */}
												<div className="space-y-2 mb-3">
													<div className="flex items-center gap-1.5">
														<span
															className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${agent.badgeBg}`}
														>
															{agent.classLabel}
														</span>
													</div>

													<div className="grid grid-cols-3 gap-1 rounded-lg bg-black/30 p-1.5 text-center text-[10px] border border-white/5">
														<div>
															<span className="block text-white/50 text-[9px]">
																PV
															</span>
															<span className="font-bold text-red-400">
																{agent.pv}
															</span>
														</div>
														<div>
															<span className="block text-white/50 text-[9px]">
																SAN
															</span>
															<span className="font-bold text-cyan-300">
																{agent.san}
															</span>
														</div>
														<div>
															<span className="block text-white/50 text-[9px]">
																PE
															</span>
															<span className="font-bold text-amber-300">
																{agent.pe}
															</span>
														</div>
													</div>
												</div>

												{/* Load Button */}
												<Button
													type="button"
													variant="outline"
													size="sm"
													className="w-full justify-center gap-1.5 text-xs font-bold bg-white/5 hover:bg-white/15 border-white/20 text-white"
													onClick={async () => {
														const { ORDEM_PRESET_AGENTS } = await import(
															"@/lib/ordem/presets"
														);
														const preset = ORDEM_PRESET_AGENTS[agent.presetIdx];
														if (!preset) return;

														setValue(
															"characterName",
															preset.characterName ?? "",
															{
																shouldDirty: true,
															},
														);
														setValue("class", preset.class ?? "", {
															shouldDirty: true,
														});
														setValue("subclass", preset.subclass ?? "", {
															shouldDirty: true,
														});
														setValue("race", preset.race ?? "", {
															shouldDirty: true,
														});
														setValue("level", preset.level ?? 8, {
															shouldDirty: true,
														});
														setValue("health", preset.health ?? 40, {
															shouldDirty: true,
														});
														setValue("healthMax", preset.healthMax ?? 40, {
															shouldDirty: true,
														});
														setValue("sanity", preset.sanity ?? 50, {
															shouldDirty: true,
														});
														setValue("sanityMax", preset.sanityMax ?? 50, {
															shouldDirty: true,
														});
														setValue("effort", preset.effort ?? 30, {
															shouldDirty: true,
														});
														setValue("effortMax", preset.effortMax ?? 30, {
															shouldDirty: true,
														});
														setValue("imageUrl", preset.imageUrl ?? "", {
															shouldDirty: true,
														});
														setValue("notes", preset.notes ?? "", {
															shouldDirty: true,
														});
														if (preset.customFields) {
															setValue(
																"systemFields",
																preset.customFields as Record<string, string>,
																{ shouldDirty: true },
															);
														}
														if (preset.spellsList) {
															setValue("spellsList", preset.spellsList, {
																shouldDirty: true,
															});
														}
														if (preset.featsList) {
															setValue("featsList", preset.featsList, {
																shouldDirty: true,
															});
														}
													}}
												>
													<Sparkles className="h-3.5 w-3.5 text-amber-300" />
													Usar este Agente
												</Button>
											</div>
										))}
									</div>
								</div>
							)}

							<SystemFields register={register} />
							<IdentityFields
								register={register}
								control={control}
								setValue={setValue}
								errors={errors}
							/>
						</div>
					)}

					{activeStep === "layout" && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Layout"
								title="Monte a ficha em blocos"
								description="Os blocos abaixo são o layout real da ficha. Arraste, oculte o que não precisar e adicione módulos extras."
							/>
							<SheetModuleEditor
								mode="layout"
								modules={modules}
								onChange={setModules}
								onAddCustom={addCustomModule}
							/>
							<SaveSheetLayoutPanel baseSystem={system} modules={modules} />
						</div>
					)}

					{activeStep === "details" && (
						<div className="space-y-7">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
								<SectionIntro
									eyebrow="Detalhes"
									title="Preencha stats e recursos"
									description="Opcional. Você pode pular e completar tudo depois na página da ficha."
								/>
								<Button type="button" variant="outline" onClick={skipDetails}>
									Pular por agora
								</Button>
							</div>
							<FormTabs
								tabs={detailsTabs}
								value={detailsTab}
								onChange={(val) => {
									setDetailsTab(val);
									scrollToTop();
								}}
							/>
							<div
								key={detailsTab}
								className={cn(
									"space-y-7",
									slideDirection === "left"
										? "t-tab-slide-left"
										: "t-tab-slide-right",
								)}
							>
								{detailsTab === "abilities" && (
									<AbilitiesFields
										register={register}
										control={control}
										setValue={setValue}
										config={config}
									/>
								)}
								{detailsTab === "combat" && (
									<div className="space-y-7">
										<CombatFields
											register={register}
											control={control}
											setValue={setValue}
											config={config}
										/>
										{config.showSanity && (
											<SanityFields
												register={register}
												control={control}
												setValue={setValue}
												config={config}
											/>
										)}
										{(config.showSpells ||
											config.customFields?.some(
												(field) => field.section === "magic",
											)) && (
											<MagicFields
												register={register}
												config={config}
												control={control}
												setValue={setValue}
											/>
										)}
										{config.showFeats && (
											<FeatsFields
												register={register}
												config={config}
												control={control}
												setValue={setValue}
											/>
										)}
									</div>
								)}
								{detailsTab === "extra" && (
									<div className="space-y-7">
										<InventoryFields register={register} config={config} />
										<PersonalityFields register={register} config={config} />
										<NotesFields register={register} config={config} />
									</div>
								)}
							</div>
						</div>
					)}

					{activeStep === "review" && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Revisão"
								title="Tudo pronto para salvar"
								description="Confira o resumo. Depois de criar, você pode editar cada módulo na ficha."
							/>
							<div className="grid gap-3 sm:grid-cols-3">
								<ReviewCard
									label="Sistema"
									value={selectedLayoutTemplate?.name ?? config.label}
								/>
								<ReviewCard label="Nome" value={characterName || "Sem nome"} />
								<ReviewCard
									label="Nível / NEX"
									value={
										Number.isFinite(Number(characterLevel))
											? String(characterLevel)
											: "Não definido"
									}
								/>
								<ReviewCard
									label="Raça / Origem"
									value={characterRace || characterBackground || "Não definido"}
								/>
								<ReviewCard
									label="Classe / Trilha"
									value={characterClass || "Não definido"}
								/>
								<ReviewCard
									label="Módulos ativos"
									value={String(enabledModules.length)}
								/>
							</div>
							<div className="rounded-2xl border border-primary/20 bg-primary/8 p-4">
								<div className="flex items-center gap-2 text-[12px] font-bold text-primary">
									<Sparkles className="h-4 w-4" />
									Próximo passo
								</div>
								<p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
									Após criar, use &quot;Editar ficha&quot; para ajustar o layout
									com drag and drop e preencher módulo por módulo.
								</p>
							</div>
							<Button
								type="submit"
								className="h-11 gap-2 px-5"
								loading={isSubmitting}
								loadingText="Criando ficha..."
							>
								<Check className="h-4 w-4" />
								Criar ficha
							</Button>
						</div>
					)}

					<div className="mt-6 flex flex-col gap-3 border-t border-border/60 pt-4">
						{stepError ? (
							<p className="text-[12px] font-medium text-destructive">
								{stepError}
							</p>
						) : null}
						<div className="flex items-center justify-between">
							<Button
								type="button"
								variant="ghost"
								onClick={goBack}
								disabled={activeStepIndex === 0}
							>
								<ArrowLeft className="h-4 w-4" />
								Voltar
							</Button>
							{activeStep === "details" && (
								<Button type="button" variant="ghost" onClick={skipDetails}>
									Pular etapa
								</Button>
							)}
							{activeStep !== "review" && (
								<Button type="button" onClick={() => void goNext()}>
									Continuar
									<ArrowRight className="h-4 w-4" />
								</Button>
							)}
						</div>
					</div>
				</section>
			</div>
		</form>
	);
}

function SectionIntro({
	eyebrow,
	title,
	description,
}: {
	eyebrow: string;
	title: string;
	description: string;
}) {
	return (
		<div>
			<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
				{eyebrow}
			</p>
			<h2 className="font-display mt-1 text-2xl font-bold tracking-tight text-foreground">
				{title}
			</h2>
			<p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
				{description}
			</p>
		</div>
	);
}

function ReviewCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
			<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</p>
			<p className="mt-2 text-[13px] font-bold text-foreground">{value}</p>
		</div>
	);
}
