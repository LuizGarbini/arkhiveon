import { useDeferredValue, useMemo, useState } from "react";
import { useWatch } from "react-hook-form";
import { DiceRollOverlay } from "@/components/dice-roll-overlay";
import { FormSection } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import {
	calculateProficiencyBonus,
	calculateSavingThrowModifier,
	calculateSkillModifier,
	formatModifier,
} from "@/core/rules";
import type { Character } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import { cn } from "@/lib/utils";
import type {
	CharacterControl,
	CharacterRegister,
	CharacterSetValue,
} from "../types";

export const DND5E_SKILLS: Array<{
	id: string;
	name: string;
	attributeKey:
		| "strength"
		| "dexterity"
		| "constitution"
		| "intelligence"
		| "wisdom"
		| "charisma";
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
		id: "stealth",
		name: "Furtividade",
		attributeKey: "dexterity",
		attributeName: "Destreza",
		attributeShort: "DES",
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
	key:
		| "strength"
		| "dexterity"
		| "constitution"
		| "intelligence"
		| "wisdom"
		| "charisma";
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
		const current = skillProficiencies[skillId] || "none";
		let next: "none" | "proficient" | "expertise" = "none";
		if (current === "none") next = "proficient";
		else if (current === "proficient") next = "expertise";
		else next = "none";

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
	onToggleSavingThrow,
	onCycleSkillProficiency,
}: SkillsFieldsViewProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const deferredSearch = useDeferredValue(searchQuery);
	const [filterType, setFilterType] = useState<
		"all" | "proficient" | "expertise"
	>("all");
	const [rollOverlay, setRollOverlay] = useState<{
		name: string;
		bonus: number;
	} | null>(null);

	const getAttrScore = (key: string): number => {
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
			default:
				return 10;
		}
	};

	const filteredSkills = useMemo(() => {
		const query = deferredSearch.trim().toLowerCase();
		return (DND5E_SKILLS || []).filter((skill) => {
			const status = skillProficiencies[skill.id] || "none";
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
	}, [deferredSearch, filterType, skillProficiencies]);

	return (
		<div className="space-y-6">
			{rollOverlay && (
				<DiceRollOverlay
					open={true}
					attributeLabel={`${rollOverlay.name} (${formatModifier(rollOverlay.bonus)})`}
					diceType="d20"
					onComplete={() => {}}
					onClose={() => setRollOverlay(null)}
				/>
			)}

			<FormSection title="Testes de Resistência (Salvaguardas)">
				<div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-6">
					{SAVING_THROWS_LIST.map((st) => {
						const attrScore = getAttrScore(st.key);
						const isProficient = !!savingThrowProficiencies[st.key];
						const totalBonus = calculateSavingThrowModifier({
							abilityScore: attrScore,
							proficiencyBonus,
							isProficient,
						});

						return (
							<div
								key={st.key}
								className={cn(
									"flex flex-col items-center justify-between rounded-xl border p-3 text-center transition-all select-none min-h-[110px]",
									isProficient
										? "border-primary/50 bg-primary/10 ring-1 ring-primary/30"
										: "border-border/60 bg-card/40 hover:border-border hover:bg-card/70",
								)}
							>
								<div className="flex items-center gap-1.5 w-full justify-between">
									<span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
										{st.short}
									</span>
									{onToggleSavingThrow ? (
										<button
											type="button"
											onClick={() => onToggleSavingThrow(st.key)}
											className="cursor-pointer min-h-[44px] min-w-[44px] -mr-2 -mt-2 flex items-center justify-center rounded focus:outline-none"
											aria-label={`Alternar proficiência em ${st.label}`}
										>
											<span
												className={cn(
													"h-3 w-3 rounded-full border transition-all block",
													isProficient
														? "border-primary bg-primary shadow-[0_0_8px_var(--primary)]"
														: "border-muted-foreground/40 bg-transparent",
												)}
											/>
										</button>
									) : (
										<span
											className={cn(
												"h-3 w-3 rounded-full border transition-all",
												isProficient
													? "border-primary bg-primary shadow-[0_0_8px_var(--primary)]"
													: "border-muted-foreground/40 bg-transparent",
											)}
										/>
									)}
								</div>
								<div className="my-1">
									<span className="font-display text-lg font-bold text-foreground">
										{formatModifier(totalBonus)}
									</span>
								</div>
								<button
									type="button"
									onClick={() => {
										setRollOverlay({
											name: `Resistência: ${st.label}`,
											bonus: totalBonus,
										});
									}}
									className="min-h-[44px] flex items-center justify-center text-[11px] font-bold text-primary hover:underline cursor-pointer"
								>
									Rolar d20 🎲
								</button>
							</div>
						);
					})}
				</div>
			</FormSection>

			<FormSection title="Perícias & Proficiências">
				<div className="space-y-3">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
						<Input
							placeholder="🔍 Buscar perícia..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="sm:max-w-xs text-xs min-h-[44px]"
						/>

						<div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
							<button
								type="button"
								onClick={() => setFilterType("all")}
								className={cn(
									"px-3 min-h-[44px] flex items-center justify-center rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer",
									filterType === "all"
										? "border-primary bg-primary/15 text-primary"
										: "border-border/50 bg-card/40 text-muted-foreground",
								)}
							>
								Todas
							</button>
							<button
								type="button"
								onClick={() => setFilterType("proficient")}
								className={cn(
									"px-3 min-h-[44px] flex items-center justify-center rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer",
									filterType === "proficient"
										? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
										: "border-border/50 bg-card/40 text-muted-foreground",
								)}
							>
								🟢 Proficientes
							</button>
							<button
								type="button"
								onClick={() => setFilterType("expertise")}
								className={cn(
									"px-3 min-h-[44px] flex items-center justify-center rounded-lg text-xs font-bold transition-all border whitespace-nowrap cursor-pointer",
									filterType === "expertise"
										? "border-purple-500 bg-purple-500/15 text-purple-300"
										: "border-border/50 bg-card/40 text-muted-foreground",
								)}
							>
								🟣 Especialista
							</button>
						</div>
					</div>

					<div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
						{filteredSkills.map((skill) => {
							const attrScore = getAttrScore(skill.attributeKey);
							const status = (skillProficiencies[skill.id] || "none") as
								| "none"
								| "proficient"
								| "expertise"
								| "half";
							const totalBonus = calculateSkillModifier({
								attributeScore: attrScore,
								proficiencyBonus,
								proficiencyLevel: status,
							});

							return (
								<div
									key={skill.id}
									className={cn(
										"flex items-center justify-between p-3 rounded-xl border transition-all min-h-[64px]",
										status === "expertise"
											? "border-purple-500/40 bg-purple-950/20 ring-1 ring-purple-500/20"
											: status === "proficient"
												? "border-emerald-500/40 bg-emerald-950/20 ring-1 ring-emerald-500/20"
												: "border-border/50 bg-card/30 hover:bg-card/60",
									)}
								>
									<div className="flex items-center gap-2.5 min-w-0">
										<button
											type="button"
											onClick={() => onCycleSkillProficiency?.(skill.id)}
											className={cn(
												"flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold transition-all",
												onCycleSkillProficiency
													? "cursor-pointer"
													: "cursor-default opacity-80",
												status === "expertise"
													? "border-purple-400 bg-purple-500 text-white shadow-xs"
													: status === "proficient"
														? "border-emerald-400 bg-emerald-500 text-white shadow-xs"
														: "border-white/10 bg-background/50 text-muted-foreground hover:border-white/30",
											)}
											title="Alternar: Sem Proficiência ➔ Proficiente ➔ Especialista"
										>
											{status === "expertise"
												? "2x"
												: status === "proficient"
													? "✓"
													: "—"}
										</button>
										<div className="min-w-0">
											<div className="font-bold text-xs text-foreground truncate">
												{skill.name}
											</div>
											<div className="text-[10px] text-muted-foreground">
												{skill.attributeShort} ({skill.attributeName})
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2 shrink-0">
										<span className="font-display font-extrabold text-sm text-foreground">
											{formatModifier(totalBonus)}
										</span>
										<button
											type="button"
											onClick={() =>
												setRollOverlay({
													name: `Perícia: ${skill.name}`,
													bonus: totalBonus,
												})
											}
											className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-base"
											title="Rolar d20"
										>
											🎲
										</button>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</FormSection>
		</div>
	);
}

export function SkillsFieldsReadOnly({
	character,
	proficiencyBonus = 2,
}: {
	character: Character;
	proficiencyBonus?: number;
}) {
	const skillProficiencies = character.skillProficiencies || {};
	const savingThrowProficiencies = character.savingThrowProficiencies || {};

	return (
		<SkillsFieldsView
			proficiencyBonus={proficiencyBonus}
			strength={character.strength || 10}
			dexterity={character.dexterity || 10}
			constitution={character.constitution || 10}
			intelligence={character.intelligence || 10}
			wisdom={character.wisdom || 10}
			charisma={character.charisma || 10}
			skillProficiencies={skillProficiencies}
			savingThrowProficiencies={savingThrowProficiencies}
		/>
	);
}
