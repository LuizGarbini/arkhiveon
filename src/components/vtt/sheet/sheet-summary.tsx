import { Shield } from "lucide-react";
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
import { SheetResources } from "./sheet-resources";
import type { SheetRolls } from "./sheet-types";
import { VisionSection } from "./sheet-vision";
import type { SheetResourceApi } from "./use-sheet-resources";

/** "12m" → número e unidade pequena ao lado ("12ft", "6sq"). */
function splitUnit(value: string): [string, string] {
	const [, number, unit] = /^([+-−]?[\d.]+)(\D.*)?$/.exec(value) ?? [
		"",
		value,
		"",
	];
	return [number ?? value, unit ?? ""];
}

/** A CA é o único número com moldura: é o que mais se consulta no combate. */
function ArmorClass({ value }: { value: number }) {
	return (
		<div className="flex w-[4.75rem] shrink-0 flex-col items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 py-2.5">
			<dd className="font-display text-[1.875rem] leading-none font-semibold tabular-nums">
				{value}
			</dd>
			<dt className="mt-1 text-[11px] font-medium text-muted-foreground">CA</dt>
		</div>
	);
}

/** Os demais números ficam soltos, sem caixa: valor em cima, nome embaixo. */
function Vital({ value, label }: { value: string; label: string }) {
	const [number, unit] = splitUnit(value);
	return (
		<div className="min-w-0">
			<dd className="truncate text-[1.0625rem] leading-tight font-semibold tabular-nums">
				{number}
				{unit ? (
					<span className="ml-0.5 text-xs font-medium text-muted-foreground">
						{unit}
					</span>
				) : null}
			</dd>
			<dt className="mt-0.5 truncate text-[11px] text-muted-foreground">
				{label}
			</dt>
		</div>
	);
}

const touch = "[@media(pointer:coarse)]:min-h-11";

/**
 * Resumo: CA e números de combate, atributos com as salvaguardas na mesma
 * coluna (o modificador é o número grande: é o que se rola) e recursos.
 */
export function SummaryTab({
	character,
	config,
	stats,
	sceneUnit,
	showPassive,
	rolls,
	resources,
}: {
	character: Character;
	config: SystemConfig;
	stats: EffectiveStats;
	/** Unidade da cena ativa (m, ft, sq): o deslocamento aparece nela. */
	sceneUnit?: string | null;
	showPassive: boolean;
	rolls: SheetRolls;
	resources: SheetResourceApi;
}) {
	const proficiency =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);
	const isDnd = character.system.startsWith("dnd");
	const spellDc = character.spellSaveDc > 0 ? character.spellSaveDc : 0;
	const attributes = config.attributes;

	return (
		<div className="space-y-5">
			<dl className="flex items-stretch gap-4">
				<ArmorClass value={stats.ac.total} />
				<div className="grid min-w-0 flex-1 grid-cols-3 content-center gap-x-3 gap-y-3">
					<Vital
						value={formatModifier(stats.initiative.total)}
						label="Iniciativa"
					/>
					<Vital
						value={formatSpeed(
							stats.speed.total,
							speedUnitOf(character, config.speedUnit),
							sceneUnit,
						)}
						label="Desloc."
					/>
					{showPassive ? (
						<Vital
							value={String(
								computePassivePerception(
									character,
									stats.abilities.wisdom.total,
								),
							)}
							label="Passiva"
						/>
					) : null}
					{spellDc > 0 ? (
						<Vital value={String(spellDc)} label="CD de magia" />
					) : null}
					{isDnd ? (
						<Vital value={formatModifier(proficiency)} label="Proficiência" />
					) : null}
				</div>
			</dl>

			<VisionSection
				character={character}
				config={config}
				sceneUnit={sceneUnit}
				resources={resources}
			/>

			<section aria-label="Atributos">
				<div className="mb-2 flex items-baseline justify-between">
					<h3 className="text-xs font-semibold text-muted-foreground">
						Atributos
					</h3>
					<span className="text-[11.5px] text-muted-foreground">
						número rola o teste · escudo, a salvaguarda
					</span>
				</div>
				<div
					className="grid divide-x divide-border/50 overflow-hidden rounded-2xl border border-border/60 bg-background/30"
					style={{
						gridTemplateColumns: `repeat(${Math.min(Math.max(attributes.length, 3), 6)}, minmax(0, 1fr))`,
					}}
				>
					{attributes.map((attr) => {
						const baseScore = characterAttributeScore(character, attr.key);
						const withItems = isWeaponAbilityKey(attr.key)
							? stats.abilities[attr.key]
							: undefined;
						const score = withItems?.total ?? baseScore;
						const mod = abilityModifier(score);
						const fullName = getAttributeFullName(attr.label);
						const hasSave = isDnd && isWeaponAbilityKey(attr.key);
						const proficient = Boolean(
							hasSave && character.savingThrowProficiencies?.[attr.key],
						);
						const saveMod = hasSave
							? calculateSavingThrowModifier({
									abilityScore: score,
									proficiencyBonus: proficiency,
									isProficient: proficient,
									miscBonus: stats.saves.total,
								})
							: 0;
						return (
							<div key={attr.key} className="flex min-w-0 flex-col">
								<button
									type="button"
									disabled={rolls.rolling}
									aria-label={`Rolar ${fullName} (${formatModifier(mod)})`}
									onClick={() => rolls.check(attr.label, mod, fullName)}
									className={cn(
										"flex min-h-[4.5rem] cursor-pointer select-none flex-col items-center gap-0.5 px-1 pt-2.5 pb-1.5 text-center transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/40",
										touch,
									)}
								>
									<span className="text-[10.5px] font-semibold text-muted-foreground">
										{attr.label}
									</span>
									<span className="font-display text-[1.375rem] leading-none font-semibold tabular-nums">
										{formatModifier(mod)}
									</span>
									<span
										title={
											withItems && withItems.delta !== 0
												? `Ficha ${baseScore}, itens ${withItems.delta > 0 ? "+" : ""}${withItems.delta}`
												: undefined
										}
										className={cn(
											"text-[11px] tabular-nums",
											withItems && withItems.delta > 0
												? "font-semibold text-primary"
												: "text-muted-foreground",
										)}
									>
										{score}
									</span>
								</button>
								{hasSave ? (
									<button
										type="button"
										disabled={rolls.rolling}
										aria-label={`Rolar salvaguarda de ${fullName} (${formatModifier(saveMod)})`}
										onClick={() =>
											rolls.check(`Salvaguarda de ${fullName}`, saveMod)
										}
										className={cn(
											"flex min-h-9 cursor-pointer select-none items-center justify-center gap-1 border-t border-border/50 text-[11px] transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/40",
											touch,
											proficient ? "text-foreground" : "text-muted-foreground",
										)}
									>
										{proficient ? (
											<span
												role="img"
												aria-label="Salvaguarda proficiente"
												className="flex"
											>
												<Shield
													className="size-3 fill-primary text-primary"
													aria-hidden
												/>
											</span>
										) : (
											<Shield className="size-3" aria-hidden />
										)}
										<span className="font-semibold tabular-nums">
											{formatModifier(saveMod)}
										</span>
									</button>
								) : null}
							</div>
						);
					})}
				</div>
			</section>

			{isDnd ? (
				<SheetResources character={character} resources={resources} />
			) : null}
		</div>
	);
}
