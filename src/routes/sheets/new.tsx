import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
	buildCharacterFormDefaults,
	CHARACTER_NAME_REQUIRED_MESSAGE,
	type CharacterFormValues,
	resolveSheetHealth,
	sanitizeCharacterFormValues,
} from "@/components/character-sheet/fields";
import {
	WIZARD_STEPS,
	WizardProgressHeader,
	type WizardStep,
	WizardStepDetails,
	WizardStepEssential,
	WizardStepLayout,
	WizardStepReview,
	WizardStepSystem,
} from "@/components/character-sheet/wizard";
import type { SystemPickerSelection } from "@/components/system-picker";
import { Button } from "@/components/ui/button";
import { shouldShowEmptyCampaignOnboarding } from "@/lib/campaign-bootstrap";
import {
	cloneSheetLayout,
	createCustomSheetModule,
	createDefaultSheetLayout,
	isLayoutTemplate,
	normalizeModuleOrders,
} from "@/lib/sheet-modules";
import type { RpgSystem, SheetModuleConfig } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { SYSTEM_CONFIG } from "@/lib/systems";

export const Route = createFileRoute("/sheets/new")({
	component: NewSheetPage,
});

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

function NewSheetPage() {
	const navigate = useNavigate();
	const addCharacter = useRPGStore((state) => state.addCharacter);
	const customTemplates = useRPGStore((state) => state.customTemplates || []);
	const campaigns = useRPGStore((state) => state.campaigns);
	const activeCampaignId = useRPGStore((state) => state.activeCampaignId);
	const campaignLoadStatus = useRPGStore((state) => state.campaignLoadStatus);
	const activeCampaign = campaigns.find((c) => c.id === activeCampaignId);

	const [activeStep, setActiveStep] = useState<WizardStep>("system");
	const [stepError, setStepError] = useState<string | null>(null);
	const [selectedLayoutTemplateId, setSelectedLayoutTemplateId] = useState<
		string | undefined
	>();

	useEffect(() => {
		if (
			shouldShowEmptyCampaignOnboarding({
				campaignLoadStatus,
				campaignCount: campaigns.length,
			})
		) {
			void navigate({ to: "/dashboard" });
		}
	}, [campaignLoadStatus, campaigns.length, navigate]);

	const [modules, setModules] = useState<SheetModuleConfig[]>(
		() => createDefaultSheetLayout(activeCampaign?.system || "dnd5e").modules,
	);

	const form = useForm<CharacterFormValues>({
		defaultValues: buildCharacterFormDefaults(
			{
				system: activeCampaign?.system || "dnd5e",
				sheetLayout: createDefaultSheetLayout(
					activeCampaign?.system || "dnd5e",
				),
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

	const system = (useWatch({ control, name: "system" }) ||
		activeCampaign?.system ||
		"dnd5e") as RpgSystem;
	const config = SYSTEM_CONFIG[system] ?? SYSTEM_CONFIG.dnd5e;
	const characterName = useWatch({ control, name: "characterName" });
	const characterClass = useWatch({ control, name: "class" });
	const characterRace = useWatch({ control, name: "race" });
	const characterLevel = useWatch({ control, name: "level" });
	const characterBackground = useWatch({ control, name: "background" });

	const selectedLayoutTemplate = customTemplates.find(
		(template) => template.id === selectedLayoutTemplateId,
	);

	const handleSelectSystem = (selection: SystemPickerSelection) => {
		const nextSystem = selection.system;
		setValue("system", nextSystem, { shouldDirty: true });

		if (selection.type === "layout") {
			setSelectedLayoutTemplateId(selection.layoutTemplateId);
			const tmpl = customTemplates.find(
				(t) => t.id === selection.layoutTemplateId,
			);
			if (tmpl && isLayoutTemplate(tmpl) && tmpl.sheetLayout) {
				const cloned = cloneSheetLayout(tmpl.sheetLayout, nextSystem);
				setModules(cloned.modules);
				setValue("sheetLayout", cloned, { shouldDirty: true });
				return;
			}
		}

		setSelectedLayoutTemplateId(undefined);
		const nextConfig = SYSTEM_CONFIG[nextSystem] ?? SYSTEM_CONFIG.generic;
		const nextLayout = createDefaultSheetLayout(nextSystem, {
			showSanity: nextConfig.showSanity,
			showSpells: nextConfig.showSpells,
		});
		setModules(nextLayout.modules);
		setValue("sheetLayout", nextLayout, { shouldDirty: true });
	};

	const handleAddCustomModule = (kind: "customText" | "customStats") => {
		const title = window.prompt(
			kind === "customText"
				? "Digite o título para o novo Bloco de Texto:"
				: "Digite o título para o novo Bloco de Stats:",
		);
		if (title === null) return;
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

		const nextModule = {
			...createCustomSheetModule(kind, modules.length * 10 + 100),
			title: trimmed,
		};
		const nextModules = normalizeModuleOrders([...modules, nextModule]);
		setModules(nextModules);
		setValue(
			"sheetLayout",
			{
				version: 1,
				template: system,
				modules: nextModules,
			},
			{ shouldDirty: true },
		);
	};

	async function validateStep(step: WizardStep): Promise<boolean> {
		if (step === "system") {
			return Boolean(system);
		}
		if (step === "essential") {
			const nameVal = form.getValues("characterName");
			if (!nameVal?.trim()) {
				setStepError(CHARACTER_NAME_REQUIRED_MESSAGE);
				return false;
			}
			setStepError(null);
			return trigger("characterName");
		}
		return true;
	}

	async function handleNextStep() {
		const isValid = await validateStep(activeStep);
		if (!isValid) return;

		const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === activeStep);
		if (currentIndex < WIZARD_STEPS.length - 1) {
			const nextStep = WIZARD_STEPS[currentIndex + 1];
			if (nextStep) {
				setStepError(null);
				setActiveStep(nextStep.id);
				scrollToTop();
			}
		}
	}

	function handlePrevStep() {
		setStepError(null);
		const currentIndex = WIZARD_STEPS.findIndex((s) => s.id === activeStep);
		if (currentIndex > 0) {
			const prevStep = WIZARD_STEPS[currentIndex - 1];
			if (prevStep) {
				setActiveStep(prevStep.id);
				scrollToTop();
			}
		}
	}

	async function handleStepSelect(targetStep: WizardStep) {
		const targetIndex = WIZARD_STEPS.findIndex((s) => s.id === targetStep);
		const essentialIndex = WIZARD_STEPS.findIndex((s) => s.id === "essential");

		// If user is navigating to essential or earlier, allowed freely
		if (targetIndex > essentialIndex) {
			const nameVal = form.getValues("characterName");
			if (!nameVal?.trim()) {
				setStepError(CHARACTER_NAME_REQUIRED_MESSAGE);
				setActiveStep("essential");
				scrollToTop();
				return;
			}
		}

		setStepError(null);
		setActiveStep(targetStep);
		scrollToTop();
	}

	const onSubmit = async (data: CharacterFormValues) => {
		if (!data.characterName?.trim()) {
			setStepError(CHARACTER_NAME_REQUIRED_MESSAGE);
			setActiveStep("essential");
			scrollToTop();
			return;
		}

		const sanitized = sanitizeCharacterFormValues(data, {
			emptyToZero: true,
		});

		const newCharacter = addCharacter({
			...sanitized,
			// Empty HP fields must not become 0/0 or 0/max (bug 05).
			...resolveSheetHealth(data),
			sheetLayout: {
				version: 1,
				template: system,
				modules: normalizeModuleOrders(modules),
			},
			customTemplateId: selectedLayoutTemplateId,
		});

		if (newCharacter?.id) {
			void navigate({
				to: "/sheets/$characterId",
				params: { characterId: newCharacter.id },
			});
		}
	};

	const isLastStep = activeStep === "review";

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
			{/* Top Header */}
			<div className="flex items-center justify-between">
				<Link
					to="/characters"
					className="inline-flex min-h-[44px] items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
				>
					<ArrowLeft className="h-4 w-4" />
					Voltar para Personagens
				</Link>
				<span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
					Assistente de Criação
				</span>
			</div>

			<WizardProgressHeader
				activeStep={activeStep}
				onSelectStep={handleStepSelect}
				stepError={stepError}
			/>

			{/* Step Body */}
			<form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
				<div className="rounded-2xl border border-border/70 bg-card p-6 sm:p-8 shadow-sm">
					{activeStep === "system" && (
						<WizardStepSystem
							system={system}
							selectedLayoutTemplateId={selectedLayoutTemplateId}
							onSelectSystem={handleSelectSystem}
							onImportSuccess={(characterId) => {
								void navigate({
									to: "/sheets/$characterId",
									params: { characterId },
								});
							}}
						/>
					)}

					{activeStep === "essential" && (
						<WizardStepEssential
							register={register}
							control={control}
							setValue={setValue}
							system={system}
							errors={errors}
						/>
					)}

					{activeStep === "layout" && (
						<WizardStepLayout
							system={system}
							modules={modules}
							onChangeModules={setModules}
							onAddCustomModule={handleAddCustomModule}
						/>
					)}

					{activeStep === "details" && (
						<WizardStepDetails
							register={register}
							control={control}
							setValue={setValue}
							config={config}
							errors={errors}
						/>
					)}

					{activeStep === "review" && (
						<WizardStepReview
							config={config}
							characterName={characterName}
							characterClass={characterClass}
							characterRace={characterRace}
							characterLevel={characterLevel}
							characterBackground={characterBackground}
							modules={modules}
							selectedTemplateName={selectedLayoutTemplate?.name}
							onBackToDetails={() => {
								setActiveStep("details");
								scrollToTop();
							}}
						/>
					)}
				</div>

				{/* Bottom Navigation Buttons (Accessible touch targets >= 44px) */}
				<div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
					<Button
						type="button"
						variant="outline"
						onClick={handlePrevStep}
						disabled={activeStep === "system" || isSubmitting}
						className="min-h-[44px] gap-2 cursor-pointer"
					>
						<ArrowLeft className="h-4 w-4" />
						Voltar
					</Button>

					{isLastStep ? (
						<Button
							type="submit"
							disabled={isSubmitting}
							className="min-h-[44px] gap-2 bg-primary text-white font-bold px-6 shadow-md shadow-primary/20 cursor-pointer"
						>
							{isSubmitting ? (
								"Criando Ficha..."
							) : (
								<>
									<Check className="h-4 w-4" />
									Criar Ficha de Personagem
								</>
							)}
						</Button>
					) : (
						<Button
							type="button"
							onClick={handleNextStep}
							className="min-h-[44px] gap-2 bg-primary text-white font-bold px-6 cursor-pointer"
						>
							Avançar
							<ArrowRight className="h-4 w-4" />
						</Button>
					)}
				</div>
			</form>
		</div>
	);
}
