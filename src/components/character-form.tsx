import { ArrowLeft, Dices, Pencil, Plus, Sparkles, Wand2 } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useToast } from "@/components/ui/toast";
import { generateThematicName } from "@/lib/name-generator";
import {
	cloneSheetLayout,
	createDefaultSheetLayout,
} from "@/lib/sheet-modules";
import {
	abilityModifier,
	type Character,
	characterDefaults,
	formatModifier,
	type RpgSystem,
	useRPGStore,
} from "@/lib/store";
import { type CharacterSection, SYSTEM_CONFIG } from "@/lib/systems";
import { cn } from "@/lib/utils";
import {
	type CharacterControl,
	type CharacterRegister,
	type CharacterSetValue,
	FeatsFields,
	getAttributeConstraints,
	InventoryFields,
	MagicFields,
	pickChangedFormValues,
	sanitizeCharacterFormValues,
} from "./character-sheet-fields";
import { DiceRollOverlay } from "./dice-roll-overlay";
import { ImageUploader } from "./image-uploader";
import { SystemPicker, type SystemPickerSelection } from "./system-picker";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./ui/dialog";
import { Field, FormSection, FormTabs } from "./ui/form-tabs";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

// =====================================================
//  Form values & defaults
// =====================================================
type CharacterFormValues = Omit<Character, "id" | "createdAt" | "updatedAt">;

function buildDefaults(
	overrides?: Partial<CharacterFormValues>,
): CharacterFormValues {
	const system = overrides?.system ?? characterDefaults.system;
	return {
		...characterDefaults,
		sheetLayout: createDefaultSheetLayout(system),
		...overrides,
	};
}

// Mapa de label das abas (refletindo as `sections` do system config).
const SECTION_LABELS: Record<CharacterSection, string> = {
	identity: "Identidade",
	abilities: "Atributos",
	combat: "Combate",
	personality: "Personalidade",
	magic: "Magia & Equip.",
	notes: "Notas",
	sanity: "Sanidade",
	inventory: "Inventário",
};

// =====================================================
//  Componente público: trigger Create
// =====================================================
export function CharacterForm() {
	return (
		<CharacterFormDialog
			trigger={
				<Button variant="default" size="sm">
					<Plus className="h-3.5 w-3.5" />
					Nova Ficha
				</Button>
			}
		/>
	);
}

// =====================================================
//  Componente público: trigger Edit
// =====================================================
interface CharacterEditButtonProps {
	character: Character;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	trigger?: ReactNode;
}

export function CharacterEditButton({
	character,
	open,
	onOpenChange,
	trigger,
}: CharacterEditButtonProps) {
	return (
		<CharacterFormDialog
			character={character}
			open={open}
			onOpenChange={onOpenChange}
			trigger={
				trigger === undefined ? (
					<Button variant="ghost" size="sm">
						<Pencil className="h-3.5 w-3.5" />
						Editar
					</Button>
				) : (
					trigger
				)
			}
		/>
	);
}

// =====================================================
//  Diálogo principal — controlado ou não-controlado
// =====================================================
type DialogStep = "system" | "form";

interface CharacterFormDialogProps {
	character?: Character; // se passado, modo edição
	trigger?: ReactNode;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

function CharacterFormDialog({
	character,
	trigger,
	open: openProp,
	onOpenChange,
}: CharacterFormDialogProps) {
	const isEdit = !!character;
	const [internalOpen, setInternalOpen] = useState(false);
	const open = openProp ?? internalOpen;
	const setOpen = onOpenChange ?? setInternalOpen;

	const addCharacter = useRPGStore((s) => s.addCharacter);
	const updateCharacter = useRPGStore((s) => s.updateCharacter);
	const customTemplates = useRPGStore((s) => s.customTemplates || []);

	const [step, setStep] = useState<DialogStep>(isEdit ? "form" : "system");
	const [selectedLayoutTemplateId, setSelectedLayoutTemplateId] = useState<
		string | undefined
	>();
	const [activeSection, setActiveSection] =
		useState<CharacterSection>("identity");
	const [prevIndex, setPrevIndex] = useState(-1);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);

	const form = useForm<CharacterFormValues>({
		defaultValues: buildDefaults(character ?? undefined),
	});
	const { register, handleSubmit, reset, control, setValue, formState } = form;

	const system = useWatch({ control, name: "system" }) as RpgSystem;
	const config = SYSTEM_CONFIG[system] ?? SYSTEM_CONFIG.dnd5e;

	const [rollState, setRollState] = useState<{
		open: boolean;
		label: string;
		fieldName: string | null;
	}>({
		open: false,
		label: "",
		fieldName: null,
	});

	const handleRollTrigger = (label: string, fieldName: string) => {
		setRollState({
			open: true,
			label,
			fieldName,
		});
	};

	const handleRollComplete = (value: number) => {
		if (rollState.fieldName) {
			setValue(rollState.fieldName as any, value, {
				shouldValidate: true,
				shouldDirty: true,
			});
		}
	};

	const handleSectionChange = (nextSection: string) => {
		const section = nextSection as CharacterSection;
		const index = config.sections.indexOf(section);
		if (index !== -1) {
			if (prevIndex !== -1 && index < prevIndex) {
				setSlideDirection("right");
			} else {
				setSlideDirection("left");
			}
			setPrevIndex(index);
		}
		setActiveSection(section);
	};

	// Inicializa e reseta o formulário ao abrir ou trocar de personagem
	useEffect(() => {
		if (open) {
			setStep(isEdit ? "form" : "system");
			setActiveSection("identity");
			setSelectedLayoutTemplateId(character?.customTemplateId);
		}
	}, [open, isEdit, character?.customTemplateId]);

	// Garante que a aba ativa exista no sistema escolhido
	useEffect(() => {
		if (!config.sections.includes(activeSection)) {
			setActiveSection(config.sections[0]);
		}
	}, [config.sections, activeSection]);

	// Resetar valores do formulário (react-hook-form) quando abrir o dialog ou trocar a entidade
	useEffect(() => {
		if (!open) return;
		reset(buildDefaults(character ?? undefined));
	}, [open, character, reset]);

	const tabs = useMemo(
		() =>
			config.sections.map((id) => ({
				id,
				label: SECTION_LABELS[id],
			})),
		[config.sections],
	);

	function onSubmit(data: CharacterFormValues) {
		const values = sanitizeCharacterFormValues(data);
		if (isEdit && character) {
			// Só o que mudou: não regrava campos de uma cópia desatualizada.
			updateCharacter(
				character.id,
				pickChangedFormValues(values, buildDefaults(character)),
			);
		} else {
			addCharacter(values);
		}
		setOpen(false);
	}

	function handleSelectSystem(selection: SystemPickerSelection) {
		setSelectedLayoutTemplateId(undefined);

		if (selection.type === "layout") {
			const template = customTemplates.find(
				(item) => item.id === selection.layoutTemplateId,
			);
			if (!template?.sheetLayout) return;

			const baseSystem = template.baseSystem ?? selection.system;
			setSelectedLayoutTemplateId(template.id);
			setValue("system", baseSystem, { shouldDirty: true });
			setValue(
				"sheetLayout",
				cloneSheetLayout(template.sheetLayout, baseSystem),
				{ shouldDirty: true },
			);
			setValue("customTemplateId", template.id, { shouldDirty: true });
			setStep("form");
			return;
		}

		const selectedConfig =
			SYSTEM_CONFIG[selection.system] ?? SYSTEM_CONFIG.generic;
		setValue("system", selection.system, { shouldDirty: true });
		setValue(
			"sheetLayout",
			createDefaultSheetLayout(selection.system, {
				showSanity: selectedConfig.showSanity,
				showSpells: selectedConfig.showSpells,
			}),
			{
				shouldDirty: true,
			},
		);
		setValue("customTemplateId", undefined, { shouldDirty: true });
		setStep("form");
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger render={trigger as React.ReactElement} />}

			<DialogContent className="max-w-3xl! h-[680px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex h-full min-h-0 flex-col"
				>
					<DialogHeader className="border-b border-border px-6 pt-6 pb-4">
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<DialogTitle className="font-display text-lg">
									{isEdit
										? `Editar: ${character?.characterName || "Ficha"}`
										: step === "system"
											? "Nova Ficha — escolha o sistema"
											: "Nova Ficha de Personagem"}
								</DialogTitle>
								<DialogDescription>
									{step === "system"
										? "O formulário se adapta ao sistema. Você pode mudar depois."
										: `Sistema: ${config.label} — ${config.tagline}`}
								</DialogDescription>
							</div>

							{step === "form" && !isEdit && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setStep("system")}
									className="mr-8"
								>
									<ArrowLeft className="h-3.5 w-3.5" />
									Trocar sistema
								</Button>
							)}
						</div>

						{step === "form" && (
							<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
								<Field label="Sistema">
									<Select {...register("system")}>
										{Object.values(SYSTEM_CONFIG).map((s) => (
											<option key={s.value} value={s.value}>
												{s.label}
											</option>
										))}
									</Select>
								</Field>
								<Field label="Nome do jogador">
									<Input
										placeholder="Quem joga este personagem"
										{...register("playerName")}
									/>
								</Field>
							</div>
						)}

						{step === "form" && (
							<div className="mt-3">
								<FormTabs
									tabs={tabs}
									value={activeSection}
									onChange={handleSectionChange}
								/>
							</div>
						)}
					</DialogHeader>

					<div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
						{step === "system" ? (
							<SystemPicker
								value={system}
								layoutTemplateId={selectedLayoutTemplateId}
								onSelect={handleSelectSystem}
							/>
						) : (
							<div
								key={activeSection}
								className={cn(
									"space-y-6",
									slideDirection === "left"
										? "t-tab-slide-left"
										: "t-tab-slide-right",
								)}
							>
								{activeSection === "identity" && (
									<IdentitySection
										register={register}
										control={control}
										setValue={setValue}
									/>
								)}
								{activeSection === "abilities" && (
									<AbilitiesSection
										register={register}
										control={control}
										config={config}
										setValue={setValue}
										onRollTrigger={handleRollTrigger}
									/>
								)}
								{activeSection === "sanity" && (
									<SanitySection register={register} config={config} />
								)}
								{activeSection === "combat" && (
									<CombatSection register={register} config={config} />
								)}
								{activeSection === "personality" && (
									<PersonalitySection register={register} config={config} />
								)}
								{activeSection === "magic" && (
									<MagicSection
										register={register}
										config={config}
										control={control}
										setValue={setValue}
									/>
								)}
								{activeSection === "notes" && (
									<NotesSection register={register} config={config} />
								)}
							</div>
						)}
					</div>

					<div className="flex items-center justify-between gap-2 border-t border-border bg-card-elevated/40 px-6 py-3">
						<span className="text-[11px] text-muted-foreground">
							{step === "system"
								? "Etapa 1 de 2"
								: `Aba: ${SECTION_LABELS[activeSection]}`}
						</span>
						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setOpen(false)}
							>
								Cancelar
							</Button>
							{step === "system" ? (
								<Button type="button" size="sm" onClick={() => setStep("form")}>
									Continuar
								</Button>
							) : (
								<Button
									type="submit"
									size="sm"
									loading={formState.isSubmitting}
									loadingText="Salvando..."
								>
									{isEdit ? "Salvar alterações" : "Salvar Ficha"}
								</Button>
							)}
						</div>
					</div>
				</form>
			</DialogContent>
			<DiceRollOverlay
				open={rollState.open}
				attributeLabel={rollState.label}
				diceType={config.defaultDice || "d20"}
				onComplete={handleRollComplete}
				onClose={() => setRollState((s) => ({ ...s, open: false }))}
			/>
		</Dialog>
	);
}

// =====================================================
//  Sub-seções do formulário
// =====================================================
type RegisterFn = ReturnType<typeof useForm<CharacterFormValues>>["register"];
type ControlFn = ReturnType<typeof useForm<CharacterFormValues>>["control"];
type SetValueFn = ReturnType<typeof useForm<CharacterFormValues>>["setValue"];
type SystemConf = (typeof SYSTEM_CONFIG)[RpgSystem];

export function CustomFieldsRenderer({
	register,
	config,
	section,
}: {
	register: RegisterFn;
	config: SystemConf;
	section: CharacterSection;
}) {
	const fields = config.customFields?.filter((f) => f.section === section);
	if (!fields || fields.length === 0) return null;

	return (
		<>
			{fields.map((field) => (
				<Field key={field.key} label={field.label} hint={field.hint}>
					{field.type === "textarea" ? (
						<Textarea
							rows={3}
							placeholder="..."
							{...register(`systemFields.${field.key}` as any)}
						/>
					) : (
						<Input
							type={field.type}
							placeholder="..."
							{...register(
								`systemFields.${field.key}` as any,
								field.type === "number" ? { valueAsNumber: true } : undefined,
							)}
						/>
					)}
				</Field>
			))}
		</>
	);
}

function IdentitySection({
	register,
	control,
	setValue,
}: {
	register: RegisterFn;
	control: ControlFn;
	setValue: SetValueFn;
}) {
	const imageUrl = useWatch({ control, name: "imageUrl" });
	const characterName = useWatch({ control, name: "characterName" });

	const system = useWatch({ control, name: "system" }) || "dnd5e";
	const race = useWatch({ control, name: "race" });
	const className = useWatch({ control, name: "class" });

	const strength = useWatch({ control, name: "strength" }) || 10;
	const dexterity = useWatch({ control, name: "dexterity" }) || 10;
	const constitution = useWatch({ control, name: "constitution" }) || 10;
	const intelligence = useWatch({ control, name: "intelligence" }) || 10;
	const wisdom = useWatch({ control, name: "wisdom" }) || 10;
	const charisma = useWatch({ control, name: "charisma" }) || 10;

	const toast = useToast();

	const handleGenerateName = () => {
		const generated = generateThematicName({
			system,
			race,
			class: className,
			attributes: {
				strength,
				dexterity,
				constitution,
				intelligence,
				wisdom,
				charisma,
			},
		});
		setValue("characterName", generated, {
			shouldValidate: true,
			shouldDirty: true,
		});

		if (!race && !className) {
			toast.info({
				title: "Nome Genérico Gerado",
				description:
					"Dica: preencha a Raça e a Classe para gerar um nome temático e personalizado!",
			});
		} else {
			const sysName = SYSTEM_CONFIG[system as RpgSystem]?.label || system;
			const contextDesc = [race, className].filter(Boolean).join(" ");
			toast.success({
				title: "Nome Temático Gerado",
				description: `Nome criado baseado no contexto: ${contextDesc} (${sysName}).`,
			});
		}
	};

	return (
		<>
			<FormSection title="Identidade Básica">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Field label="Nome do personagem">
						<div className="relative flex items-center">
							<Input
								placeholder="Ex: Aragorn, Lyra Cinzal..."
								className="pr-10"
								{...register("characterName", { required: true })}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								onClick={handleGenerateName}
								className="absolute right-1 text-muted-foreground/80 hover:text-primary hover:bg-primary/10 rounded-md h-8 w-8"
								title="Gerar nome temático"
							>
								<Wand2 className="h-4 w-4" />
							</Button>
						</div>
					</Field>
					<Field label="Tendência / Alinhamento">
						<Input placeholder="Ex: Caótico Bom" {...register("alignment")} />
					</Field>
				</div>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Field label="Raça">
						<Input placeholder="Elfo, Humano..." {...register("race")} />
					</Field>
					<Field label="Classe">
						<Input placeholder="Guerreiro, Mago..." {...register("class")} />
					</Field>
					<Field label="Subclasse / Caminho">
						<Input placeholder="Domínio da Vida..." {...register("subclass")} />
					</Field>
				</div>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Field label="Antecedente / Background">
						<Input
							placeholder="Charlatão, Sábio..."
							{...register("background")}
						/>
					</Field>
					<Field label="Nível">
						<Input
							type="number"
							min={1}
							max={30}
							placeholder="1"
							{...register("level", { valueAsNumber: true })}
						/>
					</Field>
					<Field label="Experiência (XP)">
						<Input
							type="number"
							min={0}
							placeholder="0"
							{...register("xp", { valueAsNumber: true })}
						/>
					</Field>
				</div>
			</FormSection>

			<FormSection title="Aparência">
				<ImageUploader
					value={imageUrl ?? ""}
					onChange={(url) => {
						setValue("imageUrl", url, { shouldDirty: true });
						setValue("imageAssetId", "", { shouldDirty: true });
					}}
					label="Avatar do personagem"
					folder="characters"
					libraryName={characterName}
					size="lg"
				/>
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					<Field label="Idade">
						<Input placeholder="Ex: 137" {...register("age")} />
					</Field>
					<Field label="Altura">
						<Input placeholder="Ex: 1,78m" {...register("height")} />
					</Field>
					<Field label="Peso">
						<Input placeholder="Ex: 72kg" {...register("weight")} />
					</Field>
					<Field label="Olhos">
						<Input placeholder="Ex: Verdes" {...register("eyes")} />
					</Field>
					<Field label="Cabelo">
						<Input placeholder="Ex: Negros, longos" {...register("hair")} />
					</Field>
					<Field label="Pele">
						<Input placeholder="Ex: Pálida" {...register("skin")} />
					</Field>
				</div>
				<Field label="Descrição visual">
					<Textarea
						rows={3}
						placeholder="Cicatrizes, vestimentas, postura..."
						{...register("appearance")}
					/>
				</Field>
			</FormSection>
		</>
	);
}

function AbilitiesSection({
	register,
	control,
	config,
	setValue,
	onRollTrigger,
}: {
	register: RegisterFn;
	control: ControlFn;
	config: SystemConf;
	setValue: SetValueFn;
	onRollTrigger?: (label: string, fieldName: string) => void;
}) {
	const fields = config.attributes || [];

	const handleRollAll = () => {
		const rollSingle = (system: string) => {
			if (system === "coc" || system === "ordem") {
				const r = () => Math.floor(Math.random() * 6) + 1;
				return (r() + r() + r()) * 5;
			}
			const rolls = Array.from(
				{ length: 4 },
				() => Math.floor(Math.random() * 6) + 1,
			);
			rolls.sort((a, b) => a - b);
			return rolls[1] + rolls[2] + rolls[3];
		};

		for (const field of fields) {
			const isStandardKey = [
				"strength",
				"dexterity",
				"constitution",
				"intelligence",
				"wisdom",
				"charisma",
				"power",
				"size",
				"education",
			].includes(field.key);
			const fieldName = isStandardKey
				? field.key
				: `systemAttributes.${field.key}`;
			const newValue = rollSingle(config.value);
			setValue(fieldName as any, newValue, {
				shouldValidate: true,
				shouldDirty: true,
			});
		}
	};

	return (
		<>
			<FormSection
				title="Atributos Primários"
				description={
					config.value === "coc" || config.value === "ordem"
						? "Cthulhu/Ordem: pontos podem ir até 99 (escala percentual)."
						: "Pontuações de 1 a 30."
				}
				action={
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handleRollAll}
						className="text-xs gap-1.5 h-8 font-semibold shrink-0 cursor-pointer"
					>
						<Sparkles className="h-3.5 w-3.5 text-primary" />
						Rolar Atributos
					</Button>
				}
			>
				<div
					className={`grid gap-3 ${fields.length >= 8 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6"}`}
				>
					{fields.map((f) => (
						<AbilityField
							key={f.key}
							label={f.label}
							name={f.key}
							register={register}
							control={control}
							config={config}
							onRollTrigger={onRollTrigger}
						/>
					))}
				</div>
			</FormSection>

			<FormSection title="Proficiências">
				<Field
					label="Salvaguardas proficientes"
					hint="Separe por vírgula. Ex: FOR, CON"
				>
					<Input placeholder="FOR, DES..." {...register("savingThrows")} />
				</Field>
				<Field
					label="Perícias treinadas"
					hint="Ex: Atletismo, Furtividade, Persuasão"
				>
					<Input
						placeholder="Atletismo, Furtividade..."
						{...register("skills")}
					/>
				</Field>
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Field label="Idiomas">
						<Input placeholder="Comum, Élfico..." {...register("languages")} />
					</Field>
					<Field label="Outras proficiências">
						<Input
							placeholder="Ferramentas, armas..."
							{...register("proficiencies")}
						/>
					</Field>
				</div>
			</FormSection>
		</>
	);
}

function SanitySection({
	register,
	config,
}: {
	register: RegisterFn;
	config: SystemConf;
}) {
	return (
		<FormSection
			title="Sanidade & Atributos Específicos"
			description="Para Cthulhu, Ordem Paranormal e similares."
		>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<CustomFieldsRenderer
					register={register}
					config={config}
					section="sanity"
				/>
				{config.value === "coc" && (
					<>
						<Field label="Poder (POW)">
							<Input
								type="number"
								placeholder="10"
								{...register("power", { valueAsNumber: true })}
							/>
						</Field>
						<Field label="Tamanho (SIZ)">
							<Input
								type="number"
								placeholder="10"
								{...register("size", { valueAsNumber: true })}
							/>
						</Field>
						<Field label="Educação (EDU)">
							<Input
								type="number"
								placeholder="10"
								{...register("education", { valueAsNumber: true })}
							/>
						</Field>
					</>
				)}
				<Field label="Sanidade Atual">
					<Input
						type="number"
						placeholder="0"
						{...register("sanity", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Sanidade Máxima">
					<Input
						type="number"
						placeholder="0"
						{...register("sanityMax", { valueAsNumber: true })}
					/>
				</Field>
			</div>
		</FormSection>
	);
}

function CombatSection({
	register,
	config,
}: {
	register: RegisterFn;
	config: SystemConf;
}) {
	return (
		<FormSection title="Status de Combate">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<Field label="HP Atual">
					<Input
						type="number"
						placeholder="10"
						{...register("health", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="HP Máximo">
					<Input
						type="number"
						placeholder="10"
						{...register("healthMax", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="HP Temporário">
					<Input
						type="number"
						placeholder="0"
						{...register("tempHealth", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="CA / Defesa">
					<Input
						type="number"
						placeholder="10"
						{...register("armorClass", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Iniciativa">
					<Input
						type="number"
						placeholder="0"
						{...register("initiative", { valueAsNumber: true })}
					/>
				</Field>
				<Field label={`Deslocamento (${config.speedUnit})`}>
					<Input
						type="number"
						placeholder="9"
						{...register("speed", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Bônus de proficiência">
					<Input
						type="number"
						placeholder="2"
						{...register("proficiencyBonus", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Dados de Vida (Hit Dice)" hint="Ex: 5d8">
					<Input placeholder="5d8" {...register("hitDice")} />
				</Field>
				{config.value.startsWith("dnd") && (
					<>
						<Field label="Testes contra Morte (Sucessos)" hint="0 a 3">
							<Input
								type="number"
								min={0}
								max={3}
								placeholder="0"
								{...register("deathSaves.successes" as any, {
									valueAsNumber: true,
								})}
							/>
						</Field>
						<Field label="Testes contra Morte (Falhas)" hint="0 a 3">
							<Input
								type="number"
								min={0}
								max={3}
								placeholder="0"
								{...register("deathSaves.failures" as any, {
									valueAsNumber: true,
								})}
							/>
						</Field>
					</>
				)}
				<CustomFieldsRenderer
					register={register}
					config={config}
					section="combat"
				/>
			</div>
		</FormSection>
	);
}

function PersonalitySection({
	register,
	config,
}: {
	register: RegisterFn;
	config: SystemConf;
}) {
	return (
		<FormSection title="Personalidade & História">
			<CustomFieldsRenderer
				register={register}
				config={config}
				section="personality"
			/>
			<Field label="Traços de personalidade">
				<Textarea
					rows={2}
					placeholder="Ex: Sempre tem uma piada na ponta da língua."
					{...register("personalityTraits")}
				/>
			</Field>
			<Field label="Ideais">
				<Textarea
					rows={2}
					placeholder="O que motiva moralmente seu personagem?"
					{...register("ideals")}
				/>
			</Field>
			<Field label="Vínculos">
				<Textarea
					rows={2}
					placeholder="Pessoas, lugares ou coisas importantes."
					{...register("bonds")}
				/>
			</Field>
			<Field label="Defeitos / Fraquezas">
				<Textarea
					rows={2}
					placeholder="O que pode causar problemas?"
					{...register("flaws")}
				/>
			</Field>
		</FormSection>
	);
}

function MagicSection({
	register,
	config,
	control,
	setValue,
}: {
	register: CharacterRegister;
	config: (typeof SYSTEM_CONFIG)[keyof typeof SYSTEM_CONFIG];
	control: CharacterControl;
	setValue: CharacterSetValue;
}) {
	const hasCustomMagic = config.customFields?.some(
		(f) => f.section === "magic",
	);
	const shouldShowSpells = config.showSpells || hasCustomMagic;

	return (
		<div className="space-y-6">
			{shouldShowSpells && (
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
			<InventoryFields register={register} config={config} />
		</div>
	);
}

function NotesSection({
	register,
	config,
}: {
	register: RegisterFn;
	config: SystemConf;
}) {
	return (
		<FormSection title="Notas Livres">
			<CustomFieldsRenderer
				register={register}
				config={config}
				section="notes"
			/>
			<Field label="Anotações do jogador">
				<Textarea
					rows={8}
					placeholder="Pistas, planos, segredos, lembretes..."
					{...register("notes")}
				/>
			</Field>
		</FormSection>
	);
}

interface AbilityFieldProps {
	label: string;
	name: string;
	register: RegisterFn;
	control: ControlFn;
	config: SystemConf;
	onRollTrigger?: (label: string, fieldName: string) => void;
}

function AbilityField({
	label,
	name,
	register,
	control,
	config,
	onRollTrigger,
}: AbilityFieldProps) {
	const isStandardKey = [
		"strength",
		"dexterity",
		"constitution",
		"intelligence",
		"wisdom",
		"charisma",
		"power",
		"size",
		"education",
	].includes(name);

	const fieldName = (
		isStandardKey ? name : `systemAttributes.${name}`
	) as keyof CharacterFormValues;
	const value = useWatch({ control, name: fieldName as never });
	const numeric = Number(value);
	const mod = Number.isFinite(numeric) ? abilityModifier(numeric) : 0;
	const { min, max, placeholder } = getAttributeConstraints(config);

	const handleRollSingle = () => {
		if (onRollTrigger) {
			onRollTrigger(label || name, fieldName);
		}
	};

	return (
		<div className="group/tooltip relative flex flex-col items-center gap-1 rounded-md border border-border bg-card-elevated/40 p-2 hover:bg-card-elevated hover:border-primary/35 transition-all">
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				onClick={handleRollSingle}
				className="absolute top-1 right-1 h-5 w-5 text-muted-foreground/60 hover:text-primary hover:bg-primary/10 rounded-md shrink-0 md:opacity-40 group-hover/tooltip:opacity-100 hover:!opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
				title="Rolar este atributo"
			>
				<Dices className="h-3.5 w-3.5" />
			</Button>

			<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</span>
			<Input
				type="number"
				min={min}
				max={max}
				placeholder={placeholder}
				className="h-8 w-full text-center text-[14px] font-bold"
				{...register(fieldName, { valueAsNumber: true })}
			/>
			<span className="font-mono text-[11px] tabular-nums text-primary">
				{formatModifier(mod)}
			</span>
		</div>
	);
}
