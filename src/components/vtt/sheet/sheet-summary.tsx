import {
	calculateProficiencyBonus,
	calculateSavingThrowModifier,
	characterAttributeScore,
	computePassivePerception,
	type EffectiveStats,
	formatModifier,
	formatSpeed,
	isWeaponAbilityKey,
	speedUnitOf,
} from "@/core/rules";
import { type Character, getAttributeFullName } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { abilityModifier } from "@/lib/vtt/combat";
import type { SheetRolls } from "./sheet-types";

/** Número da faixa de estatísticas: sem caixa, sem cor decorativa. */
function Stat({ value, label }: { value: string; label: string }) {
	// "12m" → número em destaque e unidade pequena ao lado ("12ft", "6sq").
	const [, number, unit] = /^([+-−]?[\d.]+)(\D.*)?$/.exec(value) ?? [
		"",
		value,
		"",
	];
	return (
		<div className="min-w-0 px-1 text-center not-first:border-l not-first:border-border/60">
			<dd className="truncate font-display text-[1.5rem] leading-tight font-semibold tabular-nums">
				{number}
				{unit ? (
					<span className="ml-0.5 font-sans text-[0.8125rem] font-medium text-muted-foreground">
						{unit}
					</span>
				) : null}
			</dd>
			<dt className="mt-0.5 text-[11.5px] text-muted-foreground">{label}</dt>
		</div>
	);
}

const SAVE_LABELS: Record<string, string> = {
	strength: "FOR",
	dexterity: "DES",
	constitution: "CON",
	intelligence: "INT",
	wisdom: "SAB",
	charisma: "CAR",
};

/**
 * Resumo: CA, iniciativa, deslocamento e passiva em linha; atributos em grade
 * (o modificador é o número grande: é o que se rola); salvaguardas.
 */
export function SummaryTab({
	character,
	config,
	stats,
	sceneUnit,
	showPassive,
	rolls,
}: {
	character: Character;
	config: SystemConfig;
	stats: EffectiveStats;
	/** Unidade da cena ativa (m, ft, sq): o deslocamento aparece nela. */
	sceneUnit?: string | null;
	showPassive: boolean;
	rolls: SheetRolls;
}) {
	const proficiency =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);
	const hasSaves = character.system.startsWith("dnd");
	const columns = showPassive ? 4 : 3;

	return (
		<div className="space-y-5">
			<dl className={cn("grid", columns === 4 ? "grid-cols-4" : "grid-cols-3")}>
				<Stat value={String(stats.ac.total)} label="CA" />
				<Stat
					value={formatModifier(stats.initiative.total)}
					label="Iniciativa"
				/>
				<Stat
					value={formatSpeed(
						stats.speed.total,
						speedUnitOf(character, config.speedUnit),
						sceneUnit,
					)}
					label="Desloc."
				/>
				{showPassive ? (
					<Stat
						value={String(
							computePassivePerception(character, stats.abilities.wisdom.total),
						)}
						label="Passiva"
					/>
				) : null}
			</dl>

			<section aria-label="Atributos">
				<div className="mb-2.5 flex items-baseline justify-between">
					<h3 className="text-xs font-semibold text-muted-foreground">
						Atributos
					</h3>
					<span className="text-[11.5px] text-muted-foreground">
						toque para rolar no chat
					</span>
				</div>
				<div className="grid grid-cols-3 gap-2 @[44rem]:grid-cols-6">
					{config.attributes.map((attr) => {
						const baseScore = characterAttributeScore(character, attr.key);
						const withItems = isWeaponAbilityKey(attr.key)
							? stats.abilities[attr.key]
							: undefined;
						const score = withItems?.total ?? baseScore;
						const mod = abilityModifier(score);
						const fullName = getAttributeFullName(attr.label);
						const proficient =
							hasSaves && character.savingThrowProficiencies?.[attr.key];
						return (
							<button
								key={attr.key}
								type="button"
								disabled={rolls.rolling}
								aria-label={`Rolar ${fullName} (${formatModifier(mod)})`}
								onClick={() => rolls.check(attr.label, mod, fullName)}
								className={cn(
									"relative flex min-h-[4.25rem] cursor-pointer select-none flex-col gap-0.5 rounded-2xl border px-2.5 py-2 text-left transition-[background-color,transform,border-color] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
									proficient
										? "border-primary/35 bg-primary/10 [@media(hover:hover)]:hover:bg-primary/15"
										: "border-border/70 bg-background/40 [@media(hover:hover)]:hover:border-primary/35 [@media(hover:hover)]:hover:bg-muted/40",
								)}
							>
								<span className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
									{attr.label}
									{proficient ? (
										<span
											role="img"
											aria-label="Salvaguarda proficiente"
											className="size-1.5 rounded-full bg-primary"
										/>
									) : null}
								</span>
								<span className="font-display text-[1.625rem] leading-none font-semibold tabular-nums">
									{formatModifier(mod)}
								</span>
								<span
									title={
										withItems && withItems.delta !== 0
											? `Ficha ${baseScore}, itens ${withItems.delta > 0 ? "+" : ""}${withItems.delta}`
											: undefined
									}
									className={cn(
										"text-[11.5px] tabular-nums",
										withItems && withItems.delta > 0
											? "font-semibold text-primary"
											: "text-muted-foreground",
									)}
								>
									{score}
								</span>
							</button>
						);
					})}
				</div>
			</section>

			{hasSaves ? (
				<section aria-label="Salvaguardas">
					<div className="mb-2.5 flex items-baseline justify-between">
						<h3 className="text-xs font-semibold text-muted-foreground">
							Salvaguardas
						</h3>
						{stats.saves.total !== 0 ? (
							<span className="text-[11.5px] text-muted-foreground tabular-nums">
								itens {formatModifier(stats.saves.total)}
							</span>
						) : null}
					</div>
					<div className="grid grid-cols-6 gap-1.5">
						{Object.entries(SAVE_LABELS).map(([key, short]) => {
							const proficient = Boolean(
								character.savingThrowProficiencies?.[key],
							);
							const score = isWeaponAbilityKey(key)
								? stats.abilities[key].total
								: 10;
							const mod = calculateSavingThrowModifier({
								abilityScore: score,
								proficiencyBonus: proficiency,
								isProficient: proficient,
								miscBonus: stats.saves.total,
							});
							const fullName = getAttributeFullName(short);
							return (
								<button
									key={key}
									type="button"
									disabled={rolls.rolling}
									aria-label={`Rolar salvaguarda de ${fullName} (${formatModifier(mod)})`}
									onClick={() => rolls.check(`Salvaguarda de ${fullName}`, mod)}
									className={cn(
										"flex min-h-11 cursor-pointer select-none flex-col items-center justify-center rounded-xl border py-1 text-[11px] text-muted-foreground transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/40",
										proficient ? "border-primary/35" : "border-border/60",
									)}
								>
									{short}
									<span className="text-[14px] leading-tight font-semibold text-foreground tabular-nums">
										{formatModifier(mod)}
									</span>
								</button>
							);
						})}
					</div>
				</section>
			) : null}
		</div>
	);
}
