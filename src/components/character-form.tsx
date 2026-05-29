import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { createDefaultSheetLayout } from "@/lib/sheet-modules";
import {
	abilityModifier,
	type Character,
	characterDefaults,
	formatModifier,
	type RpgSystem,
	useRPGStore,
} from "@/lib/store";
import { type CharacterSection, SYSTEM_CONFIG } from "@/lib/systems";
import { sanitizeCharacterFormValues } from "./character-sheet-fields";
import { ImageUploader } from "./image-uploader";
import { SystemPicker } from "./system-picker";
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

	const [step, setStep] = useState<DialogStep>(isEdit ? "form" : "system");
	const [activeSection, setActiveSection] =
		useState<CharacterSection>("identity");

	const form = useForm<CharacterFormValues>({
		defaultValues: buildDefaults(character ?? undefined),
	});
	const { register, handleSubmit, reset, control, setValue, formState } = form;

	const system = useWatch({ control, name: "system" }) as RpgSystem;
	const config = SYSTEM_CONFIG[system] ?? SYSTEM_CONFIG.dnd5e;

	// Resetar quando abrir o dialog ou trocar a entidade.
	useEffect(() => {
		if (open) {
			reset(buildDefaults(character ?? undefined));
			setStep(isEdit ? "form" : "system");
			setActiveSection("identity");
		}
	}, [open, character, isEdit, reset]);

	// Garantir que a aba ativa exista no sistema escolhido.
	useEffect(() => {
		if (!config.sections.includes(activeSection)) {
			setActiveSection(config.sections[0]);
		}
	}, [config.sections, activeSection]);

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
			updateCharacter(character.id, values);
		} else {
			addCharacter(values);
		}
		setOpen(false);
	}

	function handleSelectSystem(value: RpgSystem) {
		const selectedConfig = SYSTEM_CONFIG[value] ?? SYSTEM_CONFIG.generic;
		setValue("system", value, { shouldDirty: true });
		setValue(
			"sheetLayout",
			createDefaultSheetLayout(value, {
				showSanity: selectedConfig.showSanity,
				showSpells: selectedConfig.showSpells,
			}),
			{
				shouldDirty: true,
			},
		);
		setStep("form");
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			{trigger && <DialogTrigger render={trigger as React.ReactElement} />}

			<DialogContent className="max-w-3xl! max-h-[92vh] overflow-hidden p-0">
				<form
					onSubmit={handleSubmit(onSubmit)}
					className="flex max-h-[92vh] flex-col"
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
									onChange={(id) => setActiveSection(id as CharacterSection)}
								/>
							</div>
						)}
					</DialogHeader>

					<div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
						{step === "system" ? (
							<SystemPicker value={system} onSelect={handleSelectSystem} />
						) : (
							<>
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
									/>
								)}
								{activeSection === "sanity" && (
									<SanitySection register={register} />
								)}
								{activeSection === "combat" && (
									<CombatSection register={register} config={config} />
								)}
								{activeSection === "personality" && (
									<PersonalitySection register={register} />
								)}
								{activeSection === "magic" && config.showSpells && (
									<MagicSection register={register} />
								)}
								{activeSection === "notes" && (
									<NotesSection register={register} />
								)}
							</>
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
									disabled={formState.isSubmitting}
								>
									{isEdit ? "Salvar alterações" : "Salvar Ficha"}
								</Button>
							)}
						</div>
					</div>
				</form>
			</DialogContent>
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
	return (
		<>
			<FormSection title="Identidade Básica">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<Field label="Nome do personagem">
						<Input
							placeholder="Ex: Aragorn, Lyra Cinzal..."
							{...register("characterName", { required: true })}
						/>
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
							{...register("level", { valueAsNumber: true })}
						/>
					</Field>
					<Field label="Experiência (XP)">
						<Input
							type="number"
							min={0}
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
}: {
	register: RegisterFn;
	control: ControlFn;
	config: SystemConf;
}) {
	const fields: Array<{
		label: string;
		name: keyof Pick<
			CharacterFormValues,
			| "strength"
			| "dexterity"
			| "constitution"
			| "intelligence"
			| "wisdom"
			| "charisma"
		>;
	}> = [
		{ label: config.abilityLabels[0], name: "strength" },
		{ label: config.abilityLabels[1], name: "dexterity" },
		{ label: config.abilityLabels[2], name: "constitution" },
		{ label: config.abilityLabels[3], name: "intelligence" },
		{ label: config.abilityLabels[4], name: "wisdom" },
		{ label: config.abilityLabels[5], name: "charisma" },
	];

	return (
		<>
			<FormSection
				title="Atributos Primários"
				description={
					config.value === "coc" || config.value === "ordem"
						? "Cthulhu/Ordem: pontos podem ir até 99 (escala percentual)."
						: "Pontuações de 1 a 30."
				}
			>
				<div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
					{fields.map((f) => (
						<AbilityField
							key={f.name}
							label={f.label}
							name={f.name}
							register={register}
							control={control}
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

function SanitySection({ register }: { register: RegisterFn }) {
	return (
		<FormSection
			title="Sanidade & Atributos Específicos"
			description="Para Cthulhu, Ordem Paranormal e similares."
		>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<Field label="Poder (POW)">
					<Input
						type="number"
						{...register("power", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Tamanho (SIZ)">
					<Input type="number" {...register("size", { valueAsNumber: true })} />
				</Field>
				<Field label="Educação (EDU)">
					<Input
						type="number"
						{...register("education", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Sanidade Atual">
					<Input
						type="number"
						{...register("sanity", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Sanidade Máxima">
					<Input
						type="number"
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
						{...register("health", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="HP Máximo">
					<Input
						type="number"
						{...register("healthMax", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="HP Temporário">
					<Input
						type="number"
						{...register("tempHealth", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="CA / Defesa">
					<Input
						type="number"
						{...register("armorClass", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Iniciativa">
					<Input
						type="number"
						{...register("initiative", { valueAsNumber: true })}
					/>
				</Field>
				<Field label={`Deslocamento (${config.speedUnit})`}>
					<Input
						type="number"
						{...register("speed", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Bônus de proficiência">
					<Input
						type="number"
						{...register("proficiencyBonus", { valueAsNumber: true })}
					/>
				</Field>
				<Field label="Dados de Vida (Hit Dice)" hint="Ex: 5d8">
					<Input placeholder="5d8" {...register("hitDice")} />
				</Field>
			</div>
		</FormSection>
	);
}

function PersonalitySection({ register }: { register: RegisterFn }) {
	return (
		<FormSection title="Personalidade & História">
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

function MagicSection({ register }: { register: RegisterFn }) {
	return (
		<>
			<FormSection title="Conjuração de Magias">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
					<Field label="Classe conjuradora">
						<Input
							placeholder="Mago, Clérigo..."
							{...register("spellcastingClass")}
						/>
					</Field>
					<Field label="Atributo de magia">
						<Input
							placeholder="INT / SAB / CAR"
							{...register("spellAbility")}
						/>
					</Field>
					<Field label="CD da magia">
						<Input
							type="number"
							{...register("spellSaveDc", { valueAsNumber: true })}
						/>
					</Field>
					<Field label="Bônus de ataque mágico">
						<Input
							type="number"
							{...register("spellAttackBonus", { valueAsNumber: true })}
						/>
					</Field>
					<Field
						label="Espaços de magia"
						className="sm:col-span-2"
						hint="Ex: Nv1: 4 / Nv2: 3"
					>
						<Input
							placeholder="Nv1: 4 / Nv2: 3..."
							{...register("spellSlots")}
						/>
					</Field>
				</div>
				<Field label="Magias preparadas / conhecidas">
					<Textarea
						rows={4}
						placeholder="Mísseis Mágicos, Bola de Fogo..."
						{...register("spells")}
					/>
				</Field>
			</FormSection>

			<FormSection title="Equipamento">
				<Field label="Inventário">
					<Textarea
						rows={4}
						placeholder="Espada longa, escudo, mochila..."
						{...register("equipment")}
					/>
				</Field>
				<Field label="Moedas / Tesouro">
					<Input
						placeholder="Ex: 50 PO, 12 PP, 30 PC"
						{...register("currency")}
					/>
				</Field>
			</FormSection>
		</>
	);
}

function NotesSection({ register }: { register: RegisterFn }) {
	return (
		<FormSection title="Notas Livres">
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
	name: keyof Pick<
		CharacterFormValues,
		| "strength"
		| "dexterity"
		| "constitution"
		| "intelligence"
		| "wisdom"
		| "charisma"
	>;
	register: RegisterFn;
	control: ControlFn;
}

function AbilityField({ label, name, register, control }: AbilityFieldProps) {
	const value = useWatch({ control, name });
	const numeric = Number(value ?? 10);
	const mod = abilityModifier(Number.isFinite(numeric) ? numeric : 10);

	return (
		<div className="flex flex-col items-center gap-1 rounded-md border border-border bg-card-elevated/40 p-2">
			<span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
				{label}
			</span>
			<Input
				type="number"
				min={1}
				max={99}
				className="h-8 w-full text-center text-[14px] font-bold"
				{...register(name, { valueAsNumber: true })}
			/>
			<span className="font-mono text-[11px] tabular-nums text-primary">
				{formatModifier(mod)}
			</span>
		</div>
	);
}
