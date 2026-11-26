import { Dices, Search, X } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { DiceRollOverlay } from "@/components/dice-roll-overlay";
import { Input } from "@/components/ui/input";
import {
	calculatePassiveSkillScore,
	calculateProficiencyBonus,
	calculateSavingThrowModifier,
	calculateSkillModifier,
	formatModifier,
	nextSkillProficiencyLevel,
	type SkillProficiencyLevel,
} from "@/core/rules";
import type { Character, WeaponAbility } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import { cn } from "@/lib/utils";
import type {
	CharacterControl,
	CharacterRegister,
	CharacterSetValue,
} from "../types";

export type AbilityKey =
	| "strength"
	| "dexterity"
	| "constitution"
	| "intelligence"
	| "wisdom"
	| "charisma";

export const DND5E_SKILLS: Array<{
	id: string;
	name: string;
	attributeKey: AbilityKey;
	attributeName: string;
	attributeShort: string;
}> = [
	{
		id: "acrobatics",
		name: "Acrobacia",
		attributeKey: "dexterity",
		attributeName: "Destreza",
		attributeShort: "DES",
	},
	{
		id: "animalHandling",
		name: "Adestrar Animais",
		attributeKey: "wisdom",
		attributeName: "Sabedoria",
		attributeShort: "SAB",
	},
	{
		id: "arcana",
		name: "Arcanismo",
		attributeKey: "intelligence",
		attributeName: "Inteligência",
		attributeShort: "INT",
	},
	{
		id: "athletics",
		name: "Atletismo",
		attributeKey: "strength",
		attributeName: "Força",
		attributeShort: "FOR",
	},
	{
		id: "performance",
		name: "Atuação",
		attributeKey: "charisma",
		attributeName: "Carisma",
		attributeShort: "CAR",
	},
	{
		id: "deception",
		name: "Enganação",
		attributeKey: "charisma",
		attributeName: "Carisma",
		attributeShort: "CAR",
	},
	{
		id: "stealth",
		name: "Furtividade",
		attributeKey: "dexterity",
		attributeName: "Destreza",
		attributeShort: "DES",
	},
	{
		id: "history",
		name: "História",
		attributeKey: "intelligence",
		attributeName: "Inteligência",
		attributeShort: "INT",
	},
	{
		id: "intimidation",
		name: "Intimidação",
		attributeKey: "charisma",
		attributeName: "Carisma",
		attributeShort: "CAR",
	},
	{
		id: "insight",
		name: "Intuição",
		attributeKey: "wisdom",
		attributeName: "Sabedoria",
		attributeShort: "SAB",
	},
	{
		id: "investigation",
		name: "Investigação",
		attributeKey: "intelligence",
		attributeName: "Inteligência",
		attributeShort: "INT",
	},
	{
		id: "medicine",
		name: "Medicina",
		attributeKey: "wisdom",
		attributeName: "Sabedoria",
		attributeShort: "SAB",
	},
	{
		id: "nature",
		name: "Natureza",
		attributeKey: "intelligence",
		attributeName: "Inteligência",
		attributeShort: "INT",
	},
	{
		id: "perception",
		name: "Percepção",
		attributeKey: "wisdom",
		attributeName: "Sabedoria",
		attributeShort: "SAB",
	},
	{
		id: "persuasion",
		name: "Persuasão",
		attributeKey: "charisma",
		attributeName: "Carisma",
		attributeShort: "CAR",
	},
	{
		id: "sleightOfHand",
		name: "Prestidigitação",
		attributeKey: "dexterity",
		attributeName: "Destreza",
		attributeShort: "DES",
	},
	{
		id: "religion",
		name: "Religião",
		attributeKey: "intelligence",
		attributeName: "Inteligência",
		attributeShort: "INT",
	},
	{
		id: "survival",
		name: "Sobrevivência",
		attributeKey: "wisdom",
		attributeName: "Sabedoria",
		attributeShort: "SAB",
	},
];

export const SAVING_THROWS_LIST: Array<{
	key: AbilityKey;
	label: string;
	short: string;
}> = [
	{ key: "strength", label: "Força", short: "FOR" },
	{ key: "dexterity", label: "Destreza", short: "DES" },
	{ key: "constitution", label: "Constituição", short: "CON" },
	{ key: "intelligence", label: "Inteligência", short: "INT" },
	{ key: "wisdom", label: "Sabedoria", short: "SAB" },
	{ key: "charisma", label: "Carisma", short: "CAR" },
];

const SKILL_ATTRIBUTE_FILTERS: Array<{ key: AbilityKey; short: string }> = [
	{ key: "strength", short: "FOR" },
	{ key: "dexterity", short: "DES" },
	{ key: "intelligence", short: "INT" },
	{ key: "wisdom", short: "SAB" },
	{ key: "charisma", short: "CAR" },
];

const PROFICIENCY_LABELS: Record<SkillProficiencyLevel, string> = {
	none: "Sem proficiência",
	half: "Meia proficiência",
	proficient: "Proficiente",
	expertise: "Especialista",
};

function normalizeSkillLevel(raw: string | undefined): SkillProficiencyLevel {
	if (raw === "proficient" || raw === "expertise" || raw === "half") {
		return raw;
	}
	return "none";
}

function proficiencySymbol(level: SkillProficiencyLevel): string {
	switch (level) {
		case "expertise":
			return "2×";
		case "proficient":
			return "•";
		case "half":
			return "½";
		default:
			return "";
	}
}

export interface SkillsFieldsProps {
	control: CharacterControl;
	setValue: CharacterSetValue;
	register?: CharacterRegister;
	config?: SystemConfig;
}

export function SkillsFields({ control, setValue }: SkillsFieldsProps) {
	const level = useWatch({ control, name: "level" }) ?? 1;
	const strength = useWatch({ control, name: "strength" }) ?? 10;
	const dexterity = useWatch({ control, name: "dexterity" }) ?? 10;
	const constitution = useWatch({ control, name: "constitution" }) ?? 10;
	const intelligence = useWatch({ control, name: "intelligence" }) ?? 10;
	const wisdom = useWatch({ control, name: "wisdom" }) ?? 10;
	const charisma = useWatch({ control, name: "charisma" }) ?? 10;

	const skillProficiencies =
		useWatch({ control, name: "skillProficiencies" }) ?? {};
	const savingThrowProficiencies =
		useWatch({ control, name: "savingThrowProficiencies" }) ?? {};

	const proficiencyBonus = calculateProficiencyBonus(Number(level) || 1);

	const handleToggleSavingThrow = (key: string) => {
		const current = !!savingThrowProficiencies[key];
		setValue(`savingThrowProficiencies.${key}`, !current, {
			shouldDirty: true,
		});
	};

	const handleCycleSkillProficiency = (skillId: string) => {
		const next = nextSkillProficiencyLevel(skillProficiencies[skillId]);
		setValue(`skillProficiencies.${skillId}`, next, { shouldDirty: true });
	};

	return (
		<SkillsFieldsView
			proficiencyBonus={proficiencyBonus}
			strength={Number(strength) || 10}
			dexterity={Number(dexterity) || 10}
			constitution={Number(constitution) || 10}
			intelligence={Number(intelligence) || 10}
			wisdom={Number(wisdom) || 10}
			charisma={Number(charisma) || 10}
			skillProficiencies={skillProficiencies}
			savingThrowProficiencies={savingThrowProficiencies}
			onToggleSavingThrow={handleToggleSavingThrow}
			onCycleSkillProficiency={handleCycleSkillProficiency}
		/>
	);
}

export interface SavesBonusDetail {
	total: number;
	parts?: Array<{ label: string; value: number }>;
	notes?: string[];
}

export interface SkillsFieldsViewProps {
	proficiencyBonus: number;
	strength: number;
	dexterity: number;
	constitution: number;
	intelligence: number;
	wisdom: number;
	charisma: number;
	skillProficiencies: Record<string, string>;
	savingThrowProficiencies: Record<string, boolean>;
	savesBonus?: number | SavesBonusDetail;
	onToggleSavingThrow?: (key: string) => void;
	onCycleSkillProficiency?: (skillId: string) => void;
}

export function SkillsFieldsView({
	proficiencyBonus,
	strength,
	dexterity,
	constitution,
	intelligence,
	wisdom,
	charisma,
	skillProficiencies,
	savingThrowProficiencies,
	savesBonus,
	onToggleSavingThrow,
	onCycleSkillProficiency,
}: SkillsFieldsViewProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearch = useDeferredValue(searchQuery);
	const [filterType, setFilterType] = useState<
		"all" | "proficient" | "expertise"
	>("all");
	const [attrFilter, setAttrFilter] = useState<AbilityKey | null>(null);
	const [rollOverlay, setRollOverlay] = useState<{
		name: string;
		bonus: number;
	} | null>(null);

	const getAttrScore = (key: AbilityKey): number => {
		switch (key) {
			case "strength":
				return strength;
			case "dexterity":
				return dexterity;
			case "constitution":
				return constitution;
			case "intelligence":
				return intelligence;
			case "wisdom":
				return wisdom;
			case "charisma":
				return charisma;
		}
	};

	const savesItemBonus =
		typeof savesBonus === "number" ? savesBonus : (savesBonus?.total ?? 0);
	const savesParts =
		typeof savesBonus === "object" ? (savesBonus?.parts ?? []) : [];
	const savesNotes =
		typeof savesBonus === "object" ? (savesBonus?.notes ?? []) : [];

	const skillCounts = useMemo(() => {
		let proficient = 0;
		let expertise = 0;
		for (const skill of DND5E_SKILLS) {
			const level = normalizeSkillLevel(skillProficiencies[skill.id]);
			if (level === "proficient" || level === "expertise") proficient += 1;
			if (level === "expertise") expertise += 1;
		}
		return { total: DND5E_SKILLS.length, proficient, expertise };
	}, [skillProficiencies]);

	const proficientSavesCount = useMemo(
		() =>
			SAVING_THROWS_LIST.reduce(
				(count, st) => count + (savingThrowProficiencies[st.key] ? 1 : 0),
				0,
			),
		[savingThrowProficiencies],
	);

	const passives = useMemo(
		() => ({
			perception: calculatePassiveSkillScore({
				attributeScore: wisdom,
				proficiencyBonus,
				proficiencyLevel: normalizeSkillLevel(skillProficiencies.perception),
			}),
			investigation: calculatePassiveSkillScore({
				attributeScore: intelligence,
				proficiencyBonus,
				proficiencyLevel: normalizeSkillLevel(skillProficiencies.investigation),
			}),
			insight: calculatePassiveSkillScore({
				attributeScore: wisdom,
				proficiencyBonus,
				proficiencyLevel: normalizeSkillLevel(skillProficiencies.insight),
			}),
		}),
		[wisdom, intelligence, proficiencyBonus, skillProficiencies],
	);

	const filteredSkills = useMemo(() => {
		const query = deferredSearch.trim().toLowerCase();
		return DND5E_SKILLS.filter((skill) => {
			if (attrFilter && skill.attributeKey !== attrFilter) return false;

			const status = normalizeSkillLevel(skillProficiencies[skill.id]);
			const matchesFilter =
				filterType === "all" ||
				(filterType === "proficient" &&
					(status === "proficient" || status === "expertise")) ||
				(filterType === "expertise" && status === "expertise");

			if (!matchesFilter) return false;
			if (!query) return true;

			return (
				skill.name.toLowerCase().includes(query) ||
				skill.attributeName.toLowerCase().includes(query) ||
				skill.attributeShort.toLowerCase().includes(query)
			);
		});
	}, [deferredSearch, filterType, attrFilter, skillProficiencies]);

	const hasActiveFilters =
		searchQuery.trim().length > 0 ||
		filterType !== "all" ||
		attrFilter !== null;

	const clearFilters = () => {
		setSearchQuery("");
		setFilterType("all");
		setAttrFilter(null);
	};

	return (
		<div className="space-y-5">
			{rollOverlay && (
				<DiceRollOverlay
					open={true}
					attributeLabel={`${rollOverlay.name} (${formatModifier(rollOverlay.bonus)})`}
					diceType="d20"
					modifier={rollOverlay.bonus}
					onComplete={() => {}}
					onClose={() => setRollOverlay(null)}
				/>
			)}

			<section
				aria-label="Resumo de proficiência e sentidos passivos"
				className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/50 sm:grid-cols-4"
			>
				<div className="bg-background/80 px-3 py-2.5">
					<p className="truncate text-[11px] font-medium text-muted-foreground">
						Proficiência
					</p>
					<p className="font-display mt-0.5 text-lg font-bold tabular-nums text-primary">
						{formatModifier(proficiencyBonus)}
					</p>
				</div>
				<div className="bg-background/80 px-3 py-2.5">
					<p className="truncate text-[11px] font-medium text-muted-foreground">
						Percepção passiva
					</p>
					<p className="font-display mt-0.5 text-lg font-bold tabular-nums text-foreground">
						{passives.perception}
					</p>
				</div>
				<div className="bg-background/80 px-3 py-2.5">
					<p className="truncate text-[11px] font-medium text-muted-foreground">
						Investigação passiva
					</p>
					<p className="font-display mt-0.5 text-lg font-bold tabular-nums text-foreground">
						{passives.investigation}
					</p>
				</div>
				<div className="bg-background/80 px-3 py-2.5">
					<p className="truncate text-[11px] font-medium text-muted-foreground">
						Intuição passiva
					</p>
					<p className="font-display mt-0.5 text-lg font-bold tabular-nums text-foreground">
						{passives.insight}
					</p>
				</div>
			</section>

			<section className="space-y-2.5">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<div className="flex items-baseline gap-2">
						<h3 className="text-xs font-semibold text-foreground">
							Salvaguardas
						</h3>
						<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
							{proficientSavesCount}/6
						</span>
					</div>
					<div className="flex items-center gap-2">
						{savesItemBonus !== 0 && (
							<span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary tabular-nums ring-1 ring-inset ring-primary/20">
								Itens {formatModifier(savesItemBonus)}
							</span>
						)}
						<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
							<Dices className="size-3 shrink-0" aria-hidden />
							Clique no bônus para rolar
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/50 sm:grid-cols-2 lg:grid-cols-3">
					{SAVING_THROWS_LIST.map((st) => {
						const attrScore = getAttrScore(st.key);
						const isProficient = !!savingThrowProficiencies[st.key];
						const totalBonus = calculateSavingThrowModifier({
							abilityScore: attrScore,
							proficiencyBonus,
							isProficient,
							miscBonus: savesItemBonus,
						});

						return (
							<div
								key={st.key}
								className="flex min-h-12 items-center justify-between gap-2 bg-background/80 px-3 py-1 transition-colors duration-150 hover:bg-muted/25 motion-reduce:transition-none select-none"
							>
								<div className="flex items-center gap-1.5 min-w-0">
									{onToggleSavingThrow ? (
										<button
											type="button"
											onClick={() => onToggleSavingThrow(st.key)}
											aria-pressed={isProficient}
											aria-label={`Alternar proficiência em salvaguarda de ${st.label}`}
											title={
												isProficient
													? "Proficiente (clique para remover)"
													: "Sem proficiência (clique para marcar)"
											}
											className="flex min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9 -ml-2 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
										>
											<span
												className={cn(
													"block h-2.5 w-2.5 rounded-full border transition-colors",
													isProficient
														? "border-primary bg-primary"
														: "border-muted-foreground/50 bg-transparent",
												)}
											/>
										</button>
									) : (
										<span
											className={cn(
												"mr-1 block h-2 w-2 shrink-0 rounded-full border",
												isProficient
													? "border-primary bg-primary"
													: "border-muted-foreground/50 bg-transparent",
											)}
										/>
									)}
									<span className="w-8 shrink-0 font-mono text-[11px] font-semibold text-muted-foreground">
										{st.short}
									</span>
									<span
										className={cn(
											"truncate text-sm",
											isProficient
												? "font-semibold text-foreground"
												: "text-foreground/85",
										)}
									>
										{st.label}
									</span>
								</div>

								<button
									type="button"
									title={`Rolar 1d20 ${formatModifier(totalBonus)}`}
									aria-label={`Rolar salvaguarda de ${st.label} (${formatModifier(totalBonus)})`}
									onClick={() => {
										setRollOverlay({
											name: `Salvaguarda: ${st.label}`,
											bonus: totalBonus,
										});
									}}
									className={cn(
										"flex min-h-[44px] sm:min-h-8 min-w-13 shrink-0 cursor-pointer items-center justify-center rounded-lg px-2.5 font-mono text-xs font-semibold tabular-nums ring-1 ring-inset transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none",
										isProficient
											? "bg-primary/12 text-primary ring-primary/30 hover:bg-primary/20"
											: "bg-muted/50 text-foreground/85 ring-border/70 hover:bg-muted hover:text-foreground",
									)}
								>
									{formatModifier(totalBonus)}
								</button>
							</div>
						);
					})}
				</div>

				{(savesParts.length > 0 || savesNotes.length > 0) && (
					<div className="space-y-1 text-xs text-muted-foreground">
						{savesParts.length > 0 && (
							<p>
								Bônus ativo de itens:{" "}
								{savesParts
									.map((p) => `${p.label} (${formatModifier(p.value)})`)
									.join(", ")}
							</p>
						)}
						{savesNotes.map((note) => (
							<p key={note}>{note}</p>
						))}
					</div>
				)}
			</section>

			<section className="space-y-3 border-t border-border/40 pt-4">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<h3 className="text-xs font-semibold text-foreground">Perícias</h3>
					{onCycleSkillProficiency && (
						<p className="text-[11px] text-muted-foreground">
							<span className="font-mono font-semibold text-primary">•</span>{" "}
							Proficiente ·{" "}
							<span className="font-mono font-semibold text-primary">2×</span>{" "}
							Especialista ·{" "}
							<span className="font-mono font-semibold text-foreground">½</span>{" "}
							Meia
						</p>
					)}
				</div>

				<div className="space-y-2">
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div className="relative sm:max-w-xs sm:flex-1">
							<Search
								className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
								aria-hidden
							/>
							<Input
								aria-label="Buscar perícia"
								placeholder="Buscar perícia ou atributo..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="min-h-[44px] sm:min-h-9 pl-8 pr-9 text-base sm:text-xs"
							/>
							{searchQuery && (
								<button
									type="button"
									aria-label="Limpar busca de perícia"
									onClick={() => setSearchQuery("")}
									className="absolute right-1 top-1/2 flex h-9 w-9 sm:h-7 sm:w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
								>
									<X className="size-3.5" aria-hidden />
								</button>
							)}
						</div>

						<div className="flex items-center gap-2 sm:gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
							<button
								type="button"
								aria-pressed={filterType === "all"}
								onClick={() => setFilterType("all")}
								className={cn(
									"flex min-h-[44px] sm:min-h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none",
									filterType === "all"
										? "border-primary/35 bg-primary/15 text-primary"
										: "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
								)}
							>
								Todas
								<span className="font-mono text-[11px] opacity-80 tabular-nums">
									{skillCounts.total}
								</span>
							</button>
							<button
								type="button"
								aria-pressed={filterType === "proficient"}
								onClick={() => setFilterType("proficient")}
								className={cn(
									"flex min-h-[44px] sm:min-h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none",
									filterType === "proficient"
										? "border-primary/35 bg-primary/15 text-primary"
										: "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
								)}
							>
								Proficientes
								<span className="font-mono text-[11px] opacity-80 tabular-nums">
									{skillCounts.proficient}
								</span>
							</button>
							<button
								type="button"
								aria-pressed={filterType === "expertise"}
								onClick={() => setFilterType("expertise")}
								className={cn(
									"flex min-h-[44px] sm:min-h-8 cursor-pointer items-center justify-center gap-1 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none",
									filterType === "expertise"
										? "border-primary/35 bg-primary/15 text-primary"
										: "border-transparent text-muted-foreground hover:bg-muted/40 hover:text-foreground",
								)}
							>
								Especialista
								<span className="font-mono text-[11px] opacity-80 tabular-nums">
									{skillCounts.expertise}
								</span>
							</button>
						</div>
					</div>

					<fieldset
						aria-label="Filtrar perícias por atributo"
						className="m-0 flex min-w-0 items-center gap-2 sm:gap-1 overflow-x-auto border-0 p-0 pb-1 sm:pb-0 scrollbar-none"
					>
						<button
							type="button"
							aria-pressed={attrFilter === null}
							onClick={() => setAttrFilter(null)}
							className={cn(
								"flex min-h-[44px] sm:min-h-7 cursor-pointer items-center justify-center rounded-md px-2.5 font-mono text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none",
								attrFilter === null
									? "bg-muted text-foreground"
									: "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
							)}
						>
							Todos
						</button>
						{SKILL_ATTRIBUTE_FILTERS.map((attr) => {
							const active = attrFilter === attr.key;
							return (
								<button
									key={attr.key}
									type="button"
									aria-pressed={active}
									onClick={() => setAttrFilter(active ? null : attr.key)}
									className={cn(
										"flex min-h-[44px] sm:min-h-7 cursor-pointer items-center justify-center rounded-md px-2.5 font-mono text-[11px] font-semibold transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none",
										active
											? "bg-primary/15 text-primary ring-1 ring-inset ring-primary/30"
											: "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
									)}
								>
									{attr.short}
								</button>
							);
						})}
					</fieldset>
				</div>

				{filteredSkills.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/70 bg-background/40 px-4 py-8 text-center">
						<p className="text-sm text-muted-foreground">
							Nenhuma perícia encontrada para os filtros atuais.
						</p>
						{hasActiveFilters && (
							<button
								type="button"
								onClick={clearFilters}
								className="min-h-[44px] sm:min-h-8 cursor-pointer rounded-lg border border-border/70 bg-card px-3 text-xs font-semibold text-foreground transition-all duration-150 hover:bg-muted active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none"
							>
								Limpar filtros
							</button>
						)}
					</div>
				) : (
					<div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/60 bg-border/50 sm:grid-cols-2">
						{filteredSkills.map((skill) => {
							const attrScore = getAttrScore(skill.attributeKey);
							const status = normalizeSkillLevel(skillProficiencies[skill.id]);
							const totalBonus = calculateSkillModifier({
								attributeScore: attrScore,
								proficiencyBonus,
								proficiencyLevel: status,
							});
							const isTrained =
								status === "proficient" || status === "expertise";

							return (
								<div
									key={skill.id}
									className="flex min-h-12 items-center justify-between gap-2 bg-background/80 px-3 py-1 transition-colors duration-150 hover:bg-muted/25 motion-reduce:transition-none select-none"
								>
									<div className="flex items-center gap-1.5 min-w-0">
										{onCycleSkillProficiency ? (
											<button
												type="button"
												onClick={() => onCycleSkillProficiency(skill.id)}
												title={`${PROFICIENCY_LABELS[status]} (clique para alternar)`}
												aria-label={`Alternar proficiência em ${skill.name} (atual: ${PROFICIENCY_LABELS[status]})`}
												className="flex min-h-[44px] min-w-[44px] sm:min-h-9 sm:min-w-9 -ml-2 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-transform duration-150 active:scale-95 motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
											>
												<span
													className={cn(
														"flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-bold transition-colors",
														status === "expertise"
															? "border-primary bg-primary text-primary-foreground"
															: status === "proficient"
																? "border-primary/45 bg-primary/15 text-primary"
																: status === "half"
																	? "border-border bg-muted text-foreground"
																	: "border-border/60 bg-background text-transparent",
													)}
												>
													{proficiencySymbol(status)}
												</span>
											</button>
										) : (
											<span
												title={PROFICIENCY_LABELS[status]}
												className={cn(
													"mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold",
													status === "expertise"
														? "border-primary bg-primary text-primary-foreground"
														: status === "proficient"
															? "border-primary/45 bg-primary/15 text-primary"
															: status === "half"
																? "border-border bg-muted text-foreground"
																: "border-border/50 bg-transparent text-transparent",
												)}
											>
												{proficiencySymbol(status)}
											</span>
										)}
										<div className="flex items-baseline gap-1.5 min-w-0">
											<span
												className={cn(
													"truncate text-sm",
													isTrained
														? "font-semibold text-foreground"
														: "text-foreground/85",
												)}
											>
												{skill.name}
											</span>
											<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
												{skill.attributeShort}
											</span>
										</div>
									</div>

									<button
										type="button"
										title={`Rolar 1d20 ${formatModifier(totalBonus)}`}
										aria-label={`Rolar ${skill.name} (${formatModifier(totalBonus)})`}
										onClick={() =>
											setRollOverlay({
												name: `Perícia: ${skill.name}`,
												bonus: totalBonus,
											})
										}
										className={cn(
											"flex min-h-[44px] sm:min-h-8 min-w-13 shrink-0 cursor-pointer items-center justify-center rounded-lg px-2.5 font-mono text-xs font-semibold tabular-nums ring-1 ring-inset transition-all duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 select-none",
											isTrained
												? "bg-primary/12 text-primary ring-primary/30 hover:bg-primary/20"
												: "bg-muted/50 text-foreground/85 ring-border/70 hover:bg-muted hover:text-foreground",
										)}
									>
										{formatModifier(totalBonus)}
									</button>
								</div>
							);
						})}
					</div>
				)}
			</section>
		</div>
	);
}

export function SkillsFieldsReadOnly({
	character,
	proficiencyBonus = 2,
	scores,
	savesBonus,
	onToggleSavingThrow,
	onCycleSkillProficiency,
}: {
	character: Character;
	proficiencyBonus?: number;
	/** Atributos com itens equipados; sem eles vale o que está salvo na ficha. */
	scores?: Record<WeaponAbility, number>;
	savesBonus?: number | SavesBonusDetail;
	onToggleSavingThrow?: (key: string) => void;
	onCycleSkillProficiency?: (skillId: string) => void;
}) {
	const skillProficiencies = character.skillProficiencies || {};
	const savingThrowProficiencies = character.savingThrowProficiencies || {};

	return (
		<SkillsFieldsView
			proficiencyBonus={proficiencyBonus}
			strength={scores?.strength ?? (character.strength || 10)}
			dexterity={scores?.dexterity ?? (character.dexterity || 10)}
			constitution={scores?.constitution ?? (character.constitution || 10)}
			intelligence={scores?.intelligence ?? (character.intelligence || 10)}
			wisdom={scores?.wisdom ?? (character.wisdom || 10)}
			charisma={scores?.charisma ?? (character.charisma || 10)}
			skillProficiencies={skillProficiencies}
			savingThrowProficiencies={savingThrowProficiencies}
			savesBonus={savesBonus}
			onToggleSavingThrow={onToggleSavingThrow}
			onCycleSkillProficiency={onCycleSkillProficiency}
		/>
	);
}
