import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	FileText,
	LayoutGrid,
	Plus,
	Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
	AbilitiesFields,
	buildCharacterFormDefaults,
	type CharacterFormValues,
	CombatFields,
	IdentityFields,
	InventoryFields,
	MagicFields,
	NotesFields,
	PersonalityFields,
	SanityFields,
	SystemFields,
} from "@/components/character-sheet-fields";
import { CustomSheetRenderer } from "@/components/custom-sheet-renderer";
import { SystemPicker } from "@/components/system-picker";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	createCustomSheetModule,
	createDefaultSheetLayout,
	SHEET_MODULE_LABELS,
} from "@/lib/sheet-modules";
import type { RpgSystem, SheetModuleConfig } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";

export const Route = createFileRoute("/sheets/new")({
	component: NewSheetPage,
});

type WizardStep = "system" | "identity" | "abilities" | "combat" | "modules" | "custom" | "review";

const DEFAULT_STEPS: Array<{ id: WizardStep; label: string; description: string }> = [
	{ id: "system", label: "Sistema", description: "Escolha o template" },
	{ id: "identity", label: "Identidade", description: "Base da ficha" },
	{ id: "abilities", label: "Atributos", description: "Números e perícias" },
	{ id: "combat", label: "Combate", description: "PV, defesa e recursos" },
	{ id: "modules", label: "Módulos", description: "Layout personalizável" },
	{ id: "review", label: "Revisão", description: "Conferir e salvar" },
];

const CUSTOM_STEPS: Array<{ id: WizardStep; label: string; description: string }> = [
	{ id: "system", label: "Sistema", description: "Escolha o template" },
	{ id: "identity", label: "Identidade", description: "Base da ficha" },
	{ id: "custom", label: "Ficha", description: "Preencher campos customizados" },
	{ id: "modules", label: "Módulos", description: "Layout personalizável" },
	{ id: "review", label: "Revisão", description: "Conferir e salvar" },
];

function NewSheetPage() {
	const navigate = useNavigate();
	const addCharacter = useRPGStore((state) => state.addCharacter);
	const [activeStep, setActiveStep] = useState<WizardStep>("system");
	const [modules, setModules] = useState<SheetModuleConfig[]>(
		() => createDefaultSheetLayout("dnd5e").modules,
	);
	const form = useForm<CharacterFormValues>({
		defaultValues: buildCharacterFormDefaults({
			sheetLayout: createDefaultSheetLayout("dnd5e"),
		}),
	});
	const { register, control, setValue, handleSubmit } = form;
	const system = useWatch({ control, name: "system" }) as RpgSystem;
	const config = SYSTEM_CONFIG[system] ?? SYSTEM_CONFIG.dnd5e;
	const characterName = useWatch({ control, name: "characterName" });
	const characterClass = useWatch({ control, name: "class" });
	const characterRace = useWatch({ control, name: "race" });
	const characterLevel = useWatch({ control, name: "level" });
	const characterBackground = useWatch({ control, name: "background" });
    
    const isCustomSystem = system?.startsWith("custom_");
    const activeSteps = isCustomSystem ? CUSTOM_STEPS : DEFAULT_STEPS;
	const activeStepIndex = activeSteps.findIndex((step) => step.id === activeStep);
	const enabledModules = useMemo(
		() => modules.filter((module) => module.enabled),
		[modules],
	);

	useEffect(() => {
		const currentTemplate = form.getValues("sheetLayout")?.template;
		if (currentTemplate === system) return;
		const nextConfig = SYSTEM_CONFIG[system] ?? SYSTEM_CONFIG.generic;
		const nextLayout = createDefaultSheetLayout(system, {
			showSanity: nextConfig.showSanity,
			showSpells: nextConfig.showSpells,
		});
		setModules(nextLayout.modules);
		setValue("sheetLayout", nextLayout, { shouldDirty: true });
	}, [form, setValue, system]);

	function goToStep(step: WizardStep) {
		setActiveStep(step);
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	function goNext() {
		const next = activeSteps[activeStepIndex + 1];
		if (next) {
			setActiveStep(next.id);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	function goBack() {
		const previous = activeSteps[activeStepIndex - 1];
		if (previous) {
			setActiveStep(previous.id);
			window.scrollTo({ top: 0, behavior: "smooth" });
		}
	}

	function handleSelectSystem(nextSystem: RpgSystem) {
		const nextConfig = SYSTEM_CONFIG[nextSystem] ?? SYSTEM_CONFIG.generic;
		const nextLayout = createDefaultSheetLayout(nextSystem, {
			showSanity: nextConfig.showSanity,
			showSpells: nextConfig.showSpells,
		});
		setValue("system", nextSystem, { shouldDirty: true });
		setValue("sheetLayout", nextLayout, { shouldDirty: true });
		setModules(nextLayout.modules);
		setActiveStep("identity");
	}

	function updateModule(moduleId: string, patch: Partial<SheetModuleConfig>) {
		setModules((current) =>
			current.map((module) =>
				module.id === moduleId ? { ...module, ...patch } : module,
			),
		);
	}

	function addCustomModule(kind: "customText" | "customStats") {
		setModules((current) => [
			...current,
			createCustomSheetModule(kind, current.length * 10 + 100),
		]);
	}

	function onSubmit(values: CharacterFormValues) {
		const sheetLayout = {
			version: 1 as const,
			template: system,
			modules: modules.map((module, index) => ({
				...module,
				order: index * 10 + 10,
			})),
		};
		const created = addCharacter({
            ...values,
            sheetLayout,
            customTemplateId: isCustomSystem ? system : undefined,
        });
		void navigate({
			to: "/sheets/$characterId",
			params: { characterId: created.id },
		});
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit)}
			className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-6 py-8 sm:px-8"
		>
			<header className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-7 shadow-xl shadow-black/5 sm:p-9">
				<div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
				<div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
					<div className="max-w-3xl">
						<div className="flex flex-col items-start gap-4">
							<Link
								to="/sheets"
								className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground transition-colors hover:text-primary"
							>
								<ArrowLeft className="h-3.5 w-3.5" />
								Voltar para fichas
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
							Escolha um template, preencha o essencial e defina quais módulos
							entram na ficha. Depois você poderá editar cada módulo
							separadamente.
						</p>
					</div>
					<Button type="submit" className="h-11 gap-2 px-5">
						<Check className="h-4 w-4" />
						Salvar ficha
					</Button>
				</div>
			</header>

			<div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
				<aside className="rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm shadow-black/5 lg:sticky lg:top-24 lg:self-start">
					{activeSteps.map((step, index) => {
						const active = step.id === activeStep;
						const done = index < activeStepIndex;
						return (
							<button
								key={step.id}
								type="button"
								onClick={() => goToStep(step.id)}
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
									<span className="block text-[13px] font-bold">{step.label}</span>
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
							<SystemPicker value={system} onSelect={handleSelectSystem} />
						</div>
					)}

					{activeStep === "identity" && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Identidade"
								title="Quem é esse personagem?"
								description="Preencha o essencial para a ficha já nascer com contexto visual e narrativo."
							/>
							<SystemFields register={register} />
							<IdentityFields
								register={register}
								control={control}
								setValue={setValue}
							/>
						</div>
					)}

					{activeStep === "abilities" && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Atributos"
								title="Configure números e proficiências"
								description={`Este template usa atributos no padrão ${config.label}.`}
							/>
							<AbilitiesFields
								register={register}
								control={control}
								config={config}
							/>
						</div>
					)}

					{activeStep === "combat" && !isCustomSystem && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Combate"
								title="Defina os recursos de mesa"
								description="PV, defesa, deslocamento e módulos especiais do sistema."
							/>
							<CombatFields register={register} config={config} />
							{config.showSanity && <SanityFields register={register} config={config} />}
							{(config.showSpells || config.customFields?.some(f => f.section === "magic")) && (
								<MagicFields register={register} config={config} />
							)}
							<InventoryFields register={register} config={config} />
							<PersonalityFields register={register} config={config} />
							<NotesFields register={register} config={config} />
						</div>
					)}

                    {activeStep === "custom" && isCustomSystem && (
                        <div className="space-y-7">
							<SectionIntro
								eyebrow="Ficha"
								title="Preencha sua ficha customizada"
								description="Os campos abaixo foram definidos no seu template."
							/>
                            <CustomSheetRenderer templateId={system} register={register} />
                        </div>
                    )}

					{activeStep === "modules" && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Módulos"
								title="Monte a estrutura da ficha"
								description="Ative, desative e adicione módulos simples. Reordenação por arrastar fica preparada para a próxima etapa."
							/>
							<div className="flex flex-wrap gap-2">
								<Button
									type="button"
									variant="outline"
									className="gap-2"
									onClick={() => addCustomModule("customText")}
								>
									<Plus className="h-4 w-4" />
									Texto livre
								</Button>
								<Button
									type="button"
									variant="outline"
									className="gap-2"
									onClick={() => addCustomModule("customStats")}
								>
									<Plus className="h-4 w-4" />
									Bloco de stats
								</Button>
							</div>
							<div className="grid gap-3">
								{modules.map((module) => (
									<div
										key={module.id}
										className="rounded-2xl border border-border/70 bg-background/45 p-4"
									>
										<div className="flex items-start gap-3">
											<button
												type="button"
												onClick={() =>
													updateModule(module.id, {
														enabled: !module.enabled,
													})
												}
												className={`mt-1 h-5 w-9 rounded-full border p-0.5 transition-colors ${
													module.enabled
														? "border-primary/30 bg-primary/30"
														: "border-border bg-muted/50"
												}`}
											>
												<span
													className={`block h-3.5 w-3.5 rounded-full bg-foreground transition-transform ${
														module.enabled ? "translate-x-4" : "translate-x-0"
													}`}
												/>
											</button>
											<div className="min-w-0 flex-1 space-y-3">
												<Field label="Título do módulo">
													<Input
														value={module.title}
														onChange={(event) =>
															updateModule(module.id, {
																title: event.target.value,
															})
														}
													/>
												</Field>
												{(module.kind === "customText" ||
													module.kind === "customStats") && (
													<Field label="Conteúdo inicial">
														<Textarea
															rows={3}
															value={module.content ?? ""}
															placeholder="Escreva o conteúdo desse módulo..."
															onChange={(event) =>
																updateModule(module.id, {
																	content: event.target.value,
																})
															}
														/>
													</Field>
												)}
											</div>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{activeStep === "review" && (
						<div className="space-y-7">
							<SectionIntro
								eyebrow="Revisão"
								title="Tudo pronto para salvar"
								description="Confira o resumo e crie a ficha. Você poderá ajustar os módulos na página da ficha."
							/>
							<div className="grid gap-3 sm:grid-cols-3">
								<ReviewCard label="Sistema" value={config.label} />
								<ReviewCard
									label="Nome"
									value={characterName || "Sem nome"}
								/>
								<ReviewCard
									label="Nível / NEX"
									value={String(characterLevel || 1)}
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
							<Button type="submit" className="h-11 gap-2 px-5">
								<Check className="h-4 w-4" />
								Criar ficha
							</Button>
						</div>
					)}

					<div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
						<Button
							type="button"
							variant="ghost"
							onClick={goBack}
							disabled={activeStepIndex === 0}
						>
							<ArrowLeft className="h-4 w-4" />
							Voltar
						</Button>
						{activeStep !== "review" && (
							<Button type="button" onClick={goNext}>
								Continuar
								<ArrowRight className="h-4 w-4" />
							</Button>
						)}
					</div>
				</section>

				<aside className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-sm shadow-black/5 lg:col-start-2">
					<div className="flex items-center justify-between gap-3">
						<div>
							<p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
								Preview
							</p>
							<h2 className="font-display mt-1 text-lg font-bold text-foreground">
								{characterName || "Ficha sem nome"}
							</h2>
							<p className="mt-1 text-[12px] text-muted-foreground">
								{[characterRace, characterClass].filter(Boolean).join(" · ") ||
									config.tagline}
							</p>
						</div>
						<div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
							<LayoutGrid className="h-5 w-5" />
						</div>
					</div>
					<div className="mt-5 grid gap-2">
						{enabledModules.map((module) => (
							<div
								key={module.id}
								className="rounded-2xl border border-border/70 bg-background/45 p-3"
							>
								<div className="flex items-center justify-between gap-2">
									<span className="text-[12px] font-bold text-foreground">
										{module.title}
									</span>
									<span className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
										{SHEET_MODULE_LABELS[module.kind]}
									</span>
								</div>
								{module.content && (
									<p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground">
										{module.content}
									</p>
								)}
							</div>
						))}
					</div>
					<div className="mt-5 rounded-2xl border border-primary/20 bg-primary/8 p-3">
						<div className="flex items-center gap-2 text-[12px] font-bold text-primary">
							<Sparkles className="h-4 w-4" />
							Pronto para customização
						</div>
						<p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
							A ficha já nasce com ordem e módulos persistidos para a próxima
							etapa de arrastar, salvar layouts e exportar.
						</p>
					</div>
				</aside>
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
