import { BookOpen, Minus, Plus, Sparkles, Trash } from "lucide-react";
import { useState } from "react";
import {
	type Control,
	type FieldErrors,
	type Path,
	type UseFormRegister,
	type UseFormSetValue,
	useWatch,
} from "react-hook-form";
import { FeatSearchDialog } from "@/components/feat-search-dialog";
import {
	type Character,
	characterDefaults,
	type Feat,
	getAttributeExtraInfo,
	getAttributeFullName,
	type SheetModuleKind,
	type Spell,
} from "@/lib/store";
import {
	type CustomField,
	getFeatsLabel,
	SYSTEM_CONFIG,
	type SystemConfig,
} from "@/lib/systems";
import { cn } from "@/lib/utils";
import { ImageUploader } from "./image-uploader";
import { SpellSearchDialog } from "./spell-search-dialog";
import { Button } from "./ui/button";
import { Field, FormSection } from "./ui/form-tabs";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

const STANDARD_CHARACTER_ATTRIBUTE_KEYS = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
	"power",
	"size",
	"education",
] as const;

const CUSTOM_NUMBER_CONSTRAINTS: Record<
	string,
	{ min?: number; max?: number; placeholder: string }
> = {
	nex: { min: 0, max: 99, placeholder: "0" },
	luck: { min: 0, max: 99, placeholder: "50" },
	magicPoints: { min: 0, max: 99, placeholder: "0" },
	moveRate: { min: 0, placeholder: "8" },
	pe: { min: 0, placeholder: "0" },
	peMax: { min: 0, placeholder: "10" },
	humanity: { min: 0, max: 10, placeholder: "7" },
};

export function getAttributeConstraints(config: SystemConfig) {
	const isPercentile = config.value === "coc" || config.value === "ordem";
	return {
		min: 1,
		max: isPercentile ? 99 : 30,
		placeholder: "10",
	};
}

function getCustomFieldPlaceholder(field: CustomField) {
	const constraints = CUSTOM_NUMBER_CONSTRAINTS[field.key];
	if (constraints?.placeholder) return constraints.placeholder;
	if (field.hint) return field.hint;
	if (field.type === "number") return "0";
	if (field.type === "textarea")
		return `Descreva ${field.label.toLowerCase()}...`;
	return `Ex: ${field.label}`;
}

function ensureSystemAttributeDefaults(
	values: CharacterFormValues,
): CharacterFormValues {
	const config = SYSTEM_CONFIG[values.system] ?? SYSTEM_CONFIG.generic;
	const systemAttributes = { ...(values.systemAttributes ?? {}) };

	for (const attr of config.attributes) {
		if (
			STANDARD_CHARACTER_ATTRIBUTE_KEYS.includes(
				attr.key as (typeof STANDARD_CHARACTER_ATTRIBUTE_KEYS)[number],
			)
		) {
			continue;
		}
		const current = systemAttributes[attr.key];
		if (
			current == null ||
			(typeof current === "number" && Number.isNaN(current))
		) {
			systemAttributes[attr.key] = 10;
		}
	}

	return { ...values, systemAttributes };
}

const CREATION_EMPTY_NUMERIC_KEYS: Array<keyof CharacterFormValues> = [
	"level",
	"xp",
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
	"power",
	"size",
	"education",
	"sanity",
	"sanityMax",
	"health",
	"healthMax",
	"tempHealth",
	"armorClass",
	"initiative",
	"speed",
	"proficiencyBonus",
	"spellSaveDc",
	"spellAttackBonus",
];

export const CHARACTER_NAME_REQUIRED_MESSAGE =
	"Informe o nome do personagem para continuar";

export type BuildCharacterFormDefaultsOptions = {
	forCreation?: boolean;
};

export function buildCharacterFormDefaults(
	overrides?: Partial<CharacterFormValues>,
	options?: BuildCharacterFormDefaultsOptions,
): CharacterFormValues {
	const base = { ...characterDefaults, ...overrides };

	if (options?.forCreation) {
		const empty = { ...base } as CharacterFormValues;
		for (const key of CREATION_EMPTY_NUMERIC_KEYS) {
			(empty as Record<string, unknown>)[key] = Number.NaN;
		}
		empty.deathSaves = {
			successes: Number.NaN,
			failures: Number.NaN,
		};
		empty.systemAttributes = {};
		return empty;
	}

	return ensureSystemAttributeDefaults(base);
}

export type CharacterFormValues = Omit<
	Character,
	"id" | "createdAt" | "updatedAt"
>;
export type CharacterRegister = UseFormRegister<CharacterFormValues>;
export type CharacterControl = Control<CharacterFormValues>;
export type CharacterSetValue = UseFormSetValue<CharacterFormValues>;

export type SanitizeCharacterFormOptions = {
	emptyToZero?: boolean;
};

export function sanitizeCharacterFormValues(
	values: CharacterFormValues,
	options?: SanitizeCharacterFormOptions,
): CharacterFormValues {
	const numericKeys: Array<keyof CharacterFormValues> = [
		"level",
		"xp",
		"strength",
		"dexterity",
		"constitution",
		"intelligence",
		"wisdom",
		"charisma",
		"power",
		"size",
		"education",
		"sanity",
		"sanityMax",
		"health",
		"healthMax",
		"tempHealth",
		"armorClass",
		"initiative",
		"speed",
		"proficiencyBonus",
		"spellSaveDc",
		"spellAttackBonus",
	];
	const sanitized = { ...values };
	for (const key of numericKeys) {
		const value = sanitized[key];
		if (typeof value === "number" && Number.isNaN(value)) {
			(sanitized as Record<string, unknown>)[key] = options?.emptyToZero
				? 0
				: (characterDefaults[key as keyof typeof characterDefaults] ?? 0);
		}
	}

	const deathSaves = { ...sanitized.deathSaves };
	if (Number.isNaN(deathSaves.successes)) {
		deathSaves.successes = options?.emptyToZero
			? 0
			: characterDefaults.deathSaves.successes;
	}
	if (Number.isNaN(deathSaves.failures)) {
		deathSaves.failures = options?.emptyToZero
			? 0
			: characterDefaults.deathSaves.failures;
	}
	sanitized.deathSaves = deathSaves;

	if (sanitized.systemAttributes) {
		const nextAttributes = { ...sanitized.systemAttributes };
		for (const [key, value] of Object.entries(nextAttributes)) {
			if (typeof value === "number" && Number.isNaN(value)) {
				nextAttributes[key] = 0;
			}
		}
		sanitized.systemAttributes = nextAttributes;
	}

	return sanitized;
}

export function SystemFields({ register }: { register: CharacterRegister }) {
	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
			<Field label="Sistema">
				<Select {...register("system")}>
					{Object.values(SYSTEM_CONFIG).map((system) => (
						<option key={system.value} value={system.value}>
							{system.label}
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
	);
}

export function CharacterModuleFields({
	kind,
	register,
	control,
	setValue,
	config,
	errors,
}: {
	kind: SheetModuleKind;
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
	errors?: FieldErrors<CharacterFormValues>;
}) {
	if (kind === "identity") {
		return (
			<IdentityFields
				register={register}
				control={control}
				setValue={setValue}
				errors={errors}
			/>
		);
	}
	if (kind === "abilities") {
		return (
			<AbilitiesFields
				register={register}
				control={control}
				setValue={setValue}
				config={config}
			/>
		);
	}
	if (kind === "combat") {
		return (
			<CombatFields
				register={register}
				control={control}
				setValue={setValue}
				config={config}
				errors={errors}
			/>
		);
	}
	if (kind === "sanity") {
		return (
			<SanityFields
				register={register}
				control={control}
				setValue={setValue}
				config={config}
			/>
		);
	}
	if (kind === "magic") {
		return (
			<MagicFields
				register={register}
				config={config}
				control={control}
				setValue={setValue}
			/>
		);
	}
	if (kind === "feats") {
		return (
			<FeatsFields
				register={register}
				config={config}
				control={control}
				setValue={setValue}
			/>
		);
	}
	if (kind === "inventory") {
		return <InventoryFields register={register} config={config} />;
	}
	if (kind === "personality") {
		return <PersonalityFields register={register} config={config} />;
	}
	if (kind === "notes" || kind === "customText" || kind === "customStats") {
		return <NotesFields register={register} config={config} />;
	}
	return null;
}

export function CustomFieldsRenderer({
	register,
	control,
	setValue,
	config,
	section,
}: {
	register: CharacterRegister;
	control?: CharacterControl;
	setValue?: CharacterSetValue;
	config: SystemConfig;
	section: import("@/lib/systems").CharacterSection;
}) {
	const fields = config.customFields?.filter((f) => f.section === section);
	if (!fields || fields.length === 0) return null;

	return (
		<>
			{fields.map((field) => {
				const placeholder = getCustomFieldPlaceholder(field);
				const numberConstraints = CUSTOM_NUMBER_CONSTRAINTS[field.key];

				return (
					<Field key={field.key} label={field.label} hint={field.hint}>
						{field.type === "textarea" ? (
							<Textarea
								rows={3}
								placeholder={placeholder}
								{...register(
									`systemFields.${field.key}` as Path<CharacterFormValues>,
								)}
							/>
						) : field.type === "number" && control && setValue ? (
							<AdjustableNumberField
								name={`systemFields.${field.key}`}
								register={register}
								control={control}
								setValue={setValue}
								min={numberConstraints?.min ?? 0}
								max={numberConstraints?.max ?? 9999}
								placeholder={placeholder}
							/>
						) : (
							<Input
								type={field.type}
								placeholder={placeholder}
								min={
									field.type === "number" ? numberConstraints?.min : undefined
								}
								max={
									field.type === "number" ? numberConstraints?.max : undefined
								}
								{...register(
									`systemFields.${field.key}` as Path<CharacterFormValues>,
									field.type === "number" ? { valueAsNumber: true } : undefined,
								)}
							/>
						)}
					</Field>
				);
			})}
		</>
	);
}

export function IdentityFields({
	register,
	control,
	setValue,
	errors,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	errors?: FieldErrors<CharacterFormValues>;
}) {
	const imageUrl = useWatch({ control, name: "imageUrl" });
	const characterName = useWatch({ control, name: "characterName" });
	return (
		<>
			<FormSection title="Identidade Básica">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field
						label="Nome do personagem"
						required
						error={errors?.characterName?.message}
					>
						<Input
							placeholder="Ex: Aragorn, Lyra Cinzal..."
							{...register("characterName", {
								required: CHARACTER_NAME_REQUIRED_MESSAGE,
								validate: (value) =>
									value.trim().length > 0 || CHARACTER_NAME_REQUIRED_MESSAGE,
							})}
						/>
					</Field>
					<Field label="Tendência / Alinhamento">
						<Input placeholder="Ex: Caótico Bom" {...register("alignment")} />
					</Field>
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

export function AbilitiesFields({
	register,
	control,
	setValue,
	config,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
}) {
	const fields = config.attributes || [];

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
				<div
					className={`grid gap-4 ${fields.length >= 8 ? "grid-cols-2 sm:grid-cols-4 xl:grid-cols-8" : fields.length === 9 ? "grid-cols-3 sm:grid-cols-3 xl:grid-cols-9" : "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6"}`}
				>
					{fields.map((field) => (
						<AbilityField
							key={field.key}
							label={field.label}
							name={field.key}
							register={register}
							control={control}
							setValue={setValue}
							config={config}
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
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

export function SanityFields({
	register,
	control,
	setValue,
	config,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
}) {
	return (
		<FormSection
			title="Sanidade & Atributos Específicos"
			description="Para Cthulhu, Ordem Paranormal e similares."
		>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				<CustomFieldsRenderer
					register={register}
					control={control}
					setValue={setValue}
					config={config}
					section="sanity"
				/>
				{config.value === "coc" && (
					<>
						<Field label="Poder (POW)">
							<AdjustableNumberField
								name="power"
								register={register}
								control={control}
								setValue={setValue}
								min={1}
								max={99}
								placeholder="10"
							/>
						</Field>
						<Field label="Tamanho (SIZ)">
							<AdjustableNumberField
								name="size"
								register={register}
								control={control}
								setValue={setValue}
								min={1}
								max={99}
								placeholder="10"
							/>
						</Field>
						<Field label="Educação (EDU)">
							<AdjustableNumberField
								name="education"
								register={register}
								control={control}
								setValue={setValue}
								min={1}
								max={99}
								placeholder="10"
							/>
						</Field>
					</>
				)}
				<Field label="Sanidade Atual">
					<AdjustableNumberField
						name="sanity"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						max={99}
						placeholder="0"
					/>
				</Field>
				<Field label="Sanidade Máxima">
					<AdjustableNumberField
						name="sanityMax"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						max={99}
						placeholder="0"
					/>
				</Field>
			</div>
		</FormSection>
	);
}

export function CombatFields({
	register,
	control,
	setValue,
	config,
	errors,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
	errors?: FieldErrors<CharacterFormValues>;
}) {
	return (
		<FormSection title="Status de Combate">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				<Field label="HP Atual" error={errors?.health?.message}>
					<AdjustableNumberField
						name="health"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="10"
						validate={(val, formVals) => {
							const currentVal = Number(val);
							const maxVal = Number(formVals.healthMax);
							if (
								Number.isFinite(currentVal) &&
								Number.isFinite(maxVal) &&
								currentVal > maxVal
							) {
								return "HP Atual não pode exceder o Máximo";
							}
							return true;
						}}
					/>
				</Field>
				<Field label="HP Máximo" error={errors?.healthMax?.message}>
					<AdjustableNumberField
						name="healthMax"
						register={register}
						control={control}
						setValue={setValue}
						min={1}
						placeholder="10"
						validate={(val, formVals) => {
							const currentVal = Number(formVals.health);
							const maxVal = Number(val);
							if (
								Number.isFinite(currentVal) &&
								Number.isFinite(maxVal) &&
								currentVal > maxVal
							) {
								return "HP Máximo não pode ser menor que o Atual";
							}
							return true;
						}}
					/>
				</Field>
				<Field label="HP Temporário">
					<AdjustableNumberField
						name="tempHealth"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="0"
					/>
				</Field>
				<Field label="CA / Defesa">
					<AdjustableNumberField
						name="armorClass"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="10"
					/>
				</Field>
				<Field label="Iniciativa">
					<AdjustableNumberField
						name="initiative"
						register={register}
						control={control}
						setValue={setValue}
						min={-20}
						max={50}
						placeholder="0"
					/>
				</Field>
				<Field label={`Deslocamento (${config.speedUnit})`}>
					<AdjustableNumberField
						name="speed"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="9"
					/>
				</Field>
				<Field label="Bônus de proficiência">
					<AdjustableNumberField
						name="proficiencyBonus"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="2"
					/>
				</Field>
				<Field label="Dados de Vida (Hit Dice)" hint="Ex: 5d8">
					<Input placeholder="5d8" {...register("hitDice")} />
				</Field>
				{config.value.startsWith("dnd") && (
					<>
						<Field label="Testes contra Morte (Sucessos)" hint="0 a 3">
							<AdjustableNumberField
								name="deathSaves.successes"
								register={register}
								control={control}
								setValue={setValue}
								min={0}
								max={3}
								placeholder="0"
							/>
						</Field>
						<Field label="Testes contra Morte (Falhas)" hint="0 a 3">
							<AdjustableNumberField
								name="deathSaves.failures"
								register={register}
								control={control}
								setValue={setValue}
								min={0}
								max={3}
								placeholder="0"
							/>
						</Field>
					</>
				)}
				<CustomFieldsRenderer
					register={register}
					control={control}
					setValue={setValue}
					config={config}
					section="combat"
				/>
			</div>
		</FormSection>
	);
}

export function PersonalityFields({
	register,
	config,
}: {
	register: CharacterRegister;
	config: SystemConfig;
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

export function MagicFields({
	register,
	config,
	control,
	setValue,
}: {
	register: CharacterRegister;
	config: SystemConfig;
	control: CharacterControl;
	setValue: CharacterSetValue;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const system = useWatch({ control, name: "system" }) || "generic";
	const spellsList = useWatch({ control, name: "spellsList" }) || [];
	const legacySpells = useWatch({ control, name: "spells" }) || "";

	const handleSelectSpell = (spell: Spell) => {
		if (
			spellsList.some((s) => s.name.toLowerCase() === spell.name.toLowerCase())
		) {
			return;
		}
		setValue("spellsList", [...spellsList, spell]);
	};

	const handleRemoveSpell = (spellId: string) => {
		setValue(
			"spellsList",
			spellsList.filter((s) => s.id !== spellId),
		);
	};

	return (
		<FormSection title="Magia">
			<CustomFieldsRenderer
				register={register}
				control={control}
				setValue={setValue}
				config={config}
				section="magic"
			/>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
				<Field label="Classe conjuradora">
					<Input
						placeholder="Mago, Clérigo..."
						{...register("spellcastingClass")}
					/>
				</Field>
				<Field label="Atributo de magia">
					<Input placeholder="INT / SAB / CAR" {...register("spellAbility")} />
				</Field>
				<Field label="CD da magia">
					<AdjustableNumberField
						name="spellSaveDc"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="13"
					/>
				</Field>
				<Field label="Bônus de ataque mágico">
					<AdjustableNumberField
						name="spellAttackBonus"
						register={register}
						control={control}
						setValue={setValue}
						min={-20}
						max={50}
						placeholder="0"
					/>
				</Field>
				<Field
					label="Espaços de magia"
					className="sm:col-span-2"
					hint="Ex: Nv1: 4 / Nv2: 3"
				>
					<Input placeholder="Nv1: 4 / Nv2: 3..." {...register("spellSlots")} />
				</Field>
			</div>

			<div className="space-y-4 border-t border-border/40 pt-4">
				<div className="flex items-center justify-between">
					<h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
						<Sparkles className="h-4 w-4 text-primary" />
						Grimório do Personagem
					</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setDialogOpen(true)}
						className="text-xs h-8 gap-1.5"
					>
						<BookOpen className="h-3.5 w-3.5" />
						Buscar no Grimório
					</Button>
				</div>

				{spellsList.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border/60 bg-background/20 p-6 text-center text-xs text-muted-foreground">
						Nenhuma magia adicionada ao grimório ainda. Use o botão acima para
						buscar e adicionar.
					</div>
				) : (
					<div className="grid gap-2 sm:grid-cols-2">
						{spellsList.map((spell) => (
							<div
								key={spell.id}
								className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/30 text-[13px]"
							>
								<div>
									<span className="font-bold text-foreground">
										{spell.name}
									</span>
									<span className="text-[11px] text-muted-foreground ml-2">
										{spell.level === 0 ? "Truque" : `${spell.level}º nível`}
									</span>
								</div>
								<button
									type="button"
									onClick={() => handleRemoveSpell(spell.id)}
									className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
								>
									<Trash className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			{(system !== "dnd5e" || legacySpells.trim()) && (
				<div className="space-y-4 border-t border-border/40 pt-4 mt-6">
					<Field
						label={
							system === "dnd5e"
								? "Magias (Legado / Outras)"
								: "Magias preparadas / conhecidas"
						}
						hint={
							system === "dnd5e"
								? "Campo de texto legado. Recomendamos migrar suas magias para o Grimório estruturado acima."
								: undefined
						}
					>
						<Textarea
							rows={4}
							placeholder="Mísseis Mágicos, Bola de Fogo..."
							{...register("spells")}
						/>
					</Field>
				</div>
			)}

			<SpellSearchDialog
				system={system}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSelectSpell={handleSelectSpell}
				currentSpells={spellsList}
			/>
		</FormSection>
	);
}
export function InventoryFields({
	register,
	config,
}: {
	register: CharacterRegister;
	config: SystemConfig;
}) {
	return (
		<FormSection title="Equipamento">
			<CustomFieldsRenderer
				register={register}
				config={config}
				section="inventory"
			/>
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
	);
}

export function NotesFields({
	register,
	config,
}: {
	register: CharacterRegister;
	config: SystemConfig;
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

export interface AdjustableNumberFieldProps {
	name: string;
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	min?: number;
	max?: number;
	placeholder?: string;
	className?: string;
	validate?: import("react-hook-form").RegisterOptions<
		CharacterFormValues,
		Path<CharacterFormValues>
	>["validate"];
}

export function AdjustableNumberField({
	name,
	register,
	control,
	setValue,
	min = 0,
	max = 9999,
	placeholder = "0",
	className,
	validate,
}: AdjustableNumberFieldProps) {
	const fieldName = name as Path<CharacterFormValues>;
	const value = useWatch({ control, name: fieldName });
	const numeric =
		typeof value === "number" && !Number.isNaN(value)
			? value
			: Number.parseInt(value as string, 10) || 0;

	const handleAdjustment = (delta: number) => {
		const currentVal = Number.isNaN(numeric) ? 0 : numeric;
		const newVal = Math.max(min, Math.min(max, currentVal + delta));
		setValue(fieldName, newVal, { shouldValidate: true, shouldDirty: true });
	};

	return (
		<div
			className={cn(
				"relative flex items-center w-full max-w-[140px] rounded-lg border border-border bg-input/10 focus-within:border-primary/50 focus-within:ring-[3px] focus-within:ring-primary/15 transition-all p-0.5",
				className,
			)}
		>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				disabled={numeric <= min}
				onClick={() => handleAdjustment(-1)}
				className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:scale-90 transition-all select-none disabled:opacity-30 disabled:pointer-events-none shrink-0"
			>
				<Minus className="h-3 w-3" />
			</Button>

			<div className="relative flex-1 h-7 flex items-center justify-center min-w-0">
				<span
					key={numeric}
					className="t-digit-group is-animating text-[13.5px] font-extrabold text-foreground pointer-events-none select-none"
				>
					{String(Number.isNaN(numeric) ? 0 : numeric)
						.split("")
						.map((digit, i, arr) => {
							let staggerVal: string | undefined;
							if (i === arr.length - 2) staggerVal = "1";
							else if (i === arr.length - 1) staggerVal = "2";
							return (
								// biome-ignore lint/suspicious/noArrayIndexKey: split digits are transient
								<span key={i} className="t-digit" data-stagger={staggerVal}>
									{digit}
								</span>
							);
						})}
				</span>

				<input
					type="number"
					min={min}
					max={max}
					placeholder={placeholder}
					className="absolute inset-0 w-full h-full opacity-0 cursor-default outline-none border-none p-0 text-center text-[13.5px] font-extrabold text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
					{...register(fieldName, { valueAsNumber: true, validate })}
				/>
			</div>

			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				disabled={numeric >= max}
				onClick={() => handleAdjustment(1)}
				className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:scale-90 transition-all select-none disabled:opacity-30 disabled:pointer-events-none shrink-0"
			>
				<Plus className="h-3 w-3" />
			</Button>
		</div>
	);
}

function AbilityField({
	label,
	name,
	register,
	control,
	setValue,
	config,
}: {
	label: string;
	name: string;
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
}) {
	const isStandardKey = STANDARD_CHARACTER_ATTRIBUTE_KEYS.includes(
		name as (typeof STANDARD_CHARACTER_ATTRIBUTE_KEYS)[number],
	);
	const { min, max, placeholder } = getAttributeConstraints(config);

	const fieldName = (
		isStandardKey ? name : `systemAttributes.${name}`
	) as Path<CharacterFormValues>;
	const value = useWatch({ control, name: fieldName });
	const fallbackScore = Number.parseInt(placeholder, 10) || 10;
	const numeric =
		typeof value === "number" && !Number.isNaN(value)
			? value
			: Number.parseInt(value as string, 10) || fallbackScore;

	const handleAdjustment = (delta: number) => {
		const currentVal =
			Number.isNaN(numeric) || numeric === 0 ? fallbackScore : numeric;
		const newVal = Math.max(min, Math.min(max, currentVal + delta));
		setValue(fieldName, newVal, { shouldValidate: true, shouldDirty: true });
	};

	const fullName = getAttributeFullName(label || name);
	const extraInfo = getAttributeExtraInfo(numeric, config.value);

	return (
		<div className="group/tooltip relative flex flex-col items-center gap-2 rounded-2xl border border-border bg-card/50 hover:bg-card p-3 shadow-xs transition-all duration-200 hover:border-primary/35 hover:-translate-y-[2px] hover:shadow-md hover:shadow-primary/5">
			{/* Tooltip */}
			<div className="pointer-events-none absolute -top-8 left-1/2 z-30 -translate-x-1/2 scale-75 rounded-lg border border-border bg-card-elevated px-2 py-1 text-[10px] font-bold text-foreground opacity-0 shadow-md backdrop-blur-md transition-all duration-150 group-hover/tooltip:-top-10 group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 whitespace-nowrap">
				{fullName}
			</div>

			<span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover/tooltip:text-primary">
				{label}
			</span>

			<div className="flex w-full items-center justify-between gap-1 rounded-lg border border-border/60 bg-muted/20 p-0.5 focus-within:border-primary/45 transition-all">
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					disabled={numeric <= min}
					onClick={() => handleAdjustment(-1)}
					className="h-6 w-6 rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:scale-90 select-none shrink-0"
				>
					<Minus className="h-3 w-3" />
				</Button>

				<div className="relative flex-1 h-6 flex items-center justify-center min-w-0">
					<span
						key={numeric}
						className="t-digit-group is-animating text-[15px] font-extrabold text-foreground pointer-events-none select-none"
					>
						{String(
							Number.isNaN(numeric) || numeric === 0 ? fallbackScore : numeric,
						)
							.split("")
							.map((digit, i, arr) => {
								let staggerVal: string | undefined;
								if (i === arr.length - 2) staggerVal = "1";
								else if (i === arr.length - 1) staggerVal = "2";
								return (
									// biome-ignore lint/suspicious/noArrayIndexKey: split digits are transient
									<span key={i} className="t-digit" data-stagger={staggerVal}>
										{digit}
									</span>
								);
							})}
					</span>

					<input
						type="number"
						min={min}
						max={max}
						placeholder={placeholder}
						className="absolute inset-0 w-full h-full opacity-0 cursor-default outline-none border-none p-0 text-center text-[15px] font-extrabold text-foreground focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						{...register(fieldName, { valueAsNumber: true })}
					/>
				</div>

				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					disabled={numeric >= max}
					onClick={() => handleAdjustment(1)}
					className="h-6 w-6 rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground active:scale-90 select-none shrink-0"
				>
					<Plus className="h-3 w-3" />
				</Button>
			</div>

			{extraInfo ? (
				<span className="font-mono text-[11.5px] font-extrabold tabular-nums text-primary/80 transition-colors group-hover/tooltip:text-primary">
					{extraInfo}
				</span>
			) : (
				<span className="h-4" />
			)}
		</div>
	);
}

export function FeatsFields({
	register,
	config,
	control,
	setValue,
}: {
	register: CharacterRegister;
	config: SystemConfig;
	control: CharacterControl;
	setValue: CharacterSetValue;
}) {
	const [dialogOpen, setDialogOpen] = useState(false);
	const system = useWatch({ control, name: "system" }) || "generic";
	const level = Number(useWatch({ control, name: "level" }) || 1);
	const featsList = useWatch({ control, name: "featsList" }) || [];

	const featsLabel = getFeatsLabel(system);

	const handleSelectFeat = (feat: Feat) => {
		if (
			featsList.some((f) => f.name.toLowerCase() === feat.name.toLowerCase())
		) {
			return;
		}
		setValue("featsList", [...featsList, feat]);
	};

	const handleRemoveFeat = (featId: string) => {
		setValue(
			"featsList",
			featsList.filter((f) => f.id !== featId),
		);
	};

	const hasTough = featsList.some(
		(f) =>
			f.name.toLowerCase() === "robusto" || f.name.toLowerCase() === "tough",
	);

	return (
		<FormSection title={featsLabel}>
			<CustomFieldsRenderer
				register={register}
				control={control}
				setValue={setValue}
				config={config}
				section="magic"
			/>

			{hasTough && (system === "dnd5e" || system === "dnd2024") && (
				<div className="mb-4 bg-primary/10 border border-primary/20 text-primary text-xs p-3 rounded-lg flex items-center gap-2">
					<Sparkles className="h-4 w-4 shrink-0 animate-pulse" />
					<div>
						<span className="font-bold">Talento Robusto Ativo:</span> Seu HP
						máximo final receberá um bônus dinâmico de{" "}
						<span className="font-extrabold font-mono text-[13px]">
							+{2 * level} HP
						</span>{" "}
						(+2 por nível) no modo de visualização.
					</div>
				</div>
			)}

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
						<Sparkles className="h-4 w-4 text-primary" />
						Lista de {featsLabel} Selecionados
					</h3>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => setDialogOpen(true)}
						className="text-xs h-8 gap-1.5 cursor-pointer"
					>
						<BookOpen className="h-3.5 w-3.5" />
						Buscar no Compêndio
					</Button>
				</div>

				{featsList.length === 0 ? (
					<div className="rounded-xl border border-dashed border-border/60 bg-background/20 p-6 text-center text-xs text-muted-foreground">
						Nenhum item adicionado à lista ainda. Use o botão acima para buscar
						e adicionar.
					</div>
				) : (
					<div className="grid gap-2 sm:grid-cols-2">
						{featsList.map((feat) => (
							<div
								key={feat.id}
								className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/30 text-[13px]"
							>
								<div>
									<span className="font-bold text-foreground">{feat.name}</span>
									<span className="text-[11px] text-muted-foreground ml-2">
										({feat.category || "Geral"})
									</span>
								</div>
								<button
									type="button"
									onClick={() => handleRemoveFeat(feat.id)}
									className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors cursor-pointer"
								>
									<Trash className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				)}
			</div>

			<FeatSearchDialog
				system={system}
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				onSelectFeat={handleSelectFeat}
				currentFeats={featsList}
			/>
		</FormSection>
	);
}
