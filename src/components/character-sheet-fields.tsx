import {
	type Control,
	type UseFormRegister,
	type UseFormSetValue,
	useWatch,
} from "react-hook-form";
import {
	abilityModifier,
	type Character,
	characterDefaults,
	formatModifier,
	type SheetModuleKind,
} from "@/lib/store";
import { SYSTEM_CONFIG, type SystemConfig } from "@/lib/systems";
import { ImageUploader } from "./image-uploader";
import { Field, FormSection } from "./ui/form-tabs";
import { Input } from "./ui/input";
import { Select } from "./ui/select";
import { Textarea } from "./ui/textarea";

export type CharacterFormValues = Omit<
	Character,
	"id" | "createdAt" | "updatedAt"
>;
export type CharacterRegister = UseFormRegister<CharacterFormValues>;
export type CharacterControl = Control<CharacterFormValues>;
export type CharacterSetValue = UseFormSetValue<CharacterFormValues>;

export function buildCharacterFormDefaults(
	overrides?: Partial<CharacterFormValues>,
): CharacterFormValues {
	return { ...characterDefaults, ...overrides };
}

export function sanitizeCharacterFormValues(
	values: CharacterFormValues,
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
			(sanitized as Record<string, unknown>)[key] =
				characterDefaults[key as keyof typeof characterDefaults] ?? 0;
		}
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
}: {
	kind: SheetModuleKind;
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
}) {
	if (kind === "identity") {
		return (
			<IdentityFields
				register={register}
				control={control}
				setValue={setValue}
			/>
		);
	}
	if (kind === "abilities") {
		return (
			<AbilitiesFields register={register} control={control} config={config} />
		);
	}
	if (kind === "combat") {
		return <CombatFields register={register} config={config} />;
	}
	if (kind === "sanity") {
		return <SanityFields register={register} />;
	}
	if (kind === "magic") {
		return <MagicFields register={register} />;
	}
	if (kind === "inventory") {
		return <InventoryFields register={register} />;
	}
	if (kind === "personality") {
		return <PersonalityFields register={register} />;
	}
	if (kind === "notes" || kind === "customText" || kind === "customStats") {
		return <NotesFields register={register} />;
	}
	return null;
}

export function IdentityFields({
	register,
	control,
	setValue,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
}) {
	const imageUrl = useWatch({ control, name: "imageUrl" });
	return (
		<>
			<FormSection title="Identidade Básica">
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
	config,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	config: SystemConfig;
}) {
	const fields = [
		{ label: config.abilityLabels[0], name: "strength" },
		{ label: config.abilityLabels[1], name: "dexterity" },
		{ label: config.abilityLabels[2], name: "constitution" },
		{ label: config.abilityLabels[3], name: "intelligence" },
		{ label: config.abilityLabels[4], name: "wisdom" },
		{ label: config.abilityLabels[5], name: "charisma" },
	] as const;

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
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
					{fields.map((field) => (
						<AbilityField
							key={field.name}
							label={field.label}
							name={field.name}
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

export function SanityFields({ register }: { register: CharacterRegister }) {
	return (
		<FormSection
			title="Sanidade & Atributos Específicos"
			description="Para Cthulhu, Ordem Paranormal e similares."
		>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

export function CombatFields({
	register,
	config,
}: {
	register: CharacterRegister;
	config: SystemConfig;
}) {
	return (
		<FormSection title="Status de Combate">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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

export function PersonalityFields({
	register,
}: {
	register: CharacterRegister;
}) {
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

export function MagicFields({ register }: { register: CharacterRegister }) {
	return (
		<FormSection title="Conjuração de Magias">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
					<Input placeholder="Nv1: 4 / Nv2: 3..." {...register("spellSlots")} />
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
	);
}

export function InventoryFields({ register }: { register: CharacterRegister }) {
	return (
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
	);
}

export function NotesFields({ register }: { register: CharacterRegister }) {
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

function AbilityField({
	label,
	name,
	register,
	control,
}: {
	label: string;
	name:
		| "strength"
		| "dexterity"
		| "constitution"
		| "intelligence"
		| "wisdom"
		| "charisma";
	register: CharacterRegister;
	control: CharacterControl;
}) {
	const value = useWatch({ control, name });
	const numeric = Number(value ?? 10);
	const mod = abilityModifier(Number.isFinite(numeric) ? numeric : 10);

	return (
		<div className="flex flex-col items-center gap-2 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm shadow-black/5">
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
