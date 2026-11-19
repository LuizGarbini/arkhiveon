import { useMemo } from "react";
import { MissingNumberNotice } from "@/components/character-sheet/equipment/equipment-slot-tile";
import {
	calculateProficiencyBonus,
	calculateSavingThrowModifier,
	characterAttributeScore,
	computePassivePerception,
	describeItemEffects,
	describeSpellOrigin,
	type EffectiveStats,
	formatModifier,
	formatSpeed,
	formatStatPart,
	isWeaponAbilityKey,
	speedUnitOf,
} from "@/core/rules";
import { type Character, getAttributeFullName } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import { cn } from "@/lib/utils";
import { abilityModifier } from "@/lib/vtt/combat";
import { ArcaneShieldGlyph } from "./sheet-icons";
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
		<div className="relative flex w-[4.75rem] shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-primary/35 bg-linear-to-b from-primary/20 to-primary/5 py-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.12),0_8px_20px_-8px_var(--primary-glow)]">
			<ArcaneShieldGlyph className="pointer-events-none absolute -right-2 -bottom-2 size-11 text-primary/20" />
			<dd className="relative z-10 font-display text-[1.75rem] leading-none font-semibold text-foreground tabular-nums">
				{value}
			</dd>
			<dt className="relative z-10 mt-1 text-[10.5px] font-medium text-primary/90">
				CA
			</dt>
		</div>
	);
}

/** Os demais números ficam soltos, sem caixa: valor em cima, nome embaixo. */
function Vital({ value, label }: { value: string; label: string }) {
	const [number, unit] = splitUnit(value);
	return (
		<div className="min-w-0 rounded-lg bg-black/25 px-2.5 py-1.5 ring-1 ring-white/[0.06] shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] transition-colors hover:bg-white/[0.04] hover:ring-white/[0.12]">
			<dd className="truncate font-mono text-[1rem] leading-tight font-semibold text-foreground tabular-nums">
				{number}
				{unit ? (
					<span className="ml-0.5 text-xs font-medium text-muted-foreground">
						{unit}
					</span>
				) : null}
			</dd>
			<dt className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
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
	const showSpellDc = stats.spellDc.total > 0 || stats.spellDc.parts.length > 0;
	const attributes = config.attributes;
	const distanceUnit = speedUnitOf(character, config.speedUnit);
	const origins = useMemo(() => {
		const chips: { key: string; text: string }[] = [];
		const seen = new Map<string, number>();
		const push = (text: string) => {
			const count = (seen.get(text) ?? 0) + 1;
			seen.set(text, count);
			chips.push({ key: count === 1 ? text : `${text}#${count}`, text });
		};
		if (stats.ac.source === "items") {
			for (const part of stats.ac.parts) {
				if (part.kind !== "sheet") push(`CA ${formatStatPart(part)}`);
			}
		}
		if (stats.initiative.source === "items") {
			for (const part of stats.initiative.parts) {
				if (part.kind !== "sheet") push(`Init. ${formatStatPart(part)}`);
			}
		}
		for (const part of stats.speed.parts) {
			push(
				`Desloc. ${part.label} ${formatSpeed(part.value, distanceUnit, sceneUnit, { signed: true })}`,
			);
		}
		for (const part of stats.spellDc.parts) {
			push(describeSpellOrigin("dc", part));
		}
		return chips;
	}, [stats, distanceUnit, sceneUnit]);
	const silentEquipped = useMemo(
		() =>
			stats.linked.filter(
				(link) =>
					link.entry.location === "equipped" &&
					describeItemEffects(link.item).length === 0,
			),
		[stats.linked],
	);

	return (
		<div className="space-y-4">
			<dl className="flex items-stretch gap-3 rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 p-2.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]">
				<ArmorClass value={stats.ac.total} />
				<div className="grid min-w-0 flex-1 grid-cols-3 content-center gap-2">
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
					{showSpellDc ? (
						<Vital value={String(stats.spellDc.total)} label="CD de magia" />
					) : null}
					{isDnd ? (
						<Vital value={formatModifier(proficiency)} label="Proficiência" />
					) : null}
				</div>
			</dl>
			{origins.length > 0 ? (
				<ul
					aria-label="Origem dos números"
					className="flex w-full min-w-0 max-w-full flex-wrap gap-1.5"
				>
					{origins.map((chip) => (
						<li
							key={chip.key}
							title={chip.text}
							aria-label={chip.text}
							className="max-w-full min-w-0 truncate rounded-full border border-border/70 bg-card/60 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums"
						>
							{chip.text}
						</li>
					))}
				</ul>
			) : null}
			{silentEquipped.length > 0 ? (
				<ul
					aria-label="Itens sem número na ficha"
					className="flex flex-col gap-2"
				>
					{silentEquipped.map((link) => (
						<li key={link.entry.id}>
							<MissingNumberNotice item={link.item} />
						</li>
					))}
				</ul>
			) : null}

			<VisionSection
				character={character}
				config={config}
				sceneUnit={sceneUnit}
				resources={resources}
			/>

			<section aria-label="Atributos">
				<div className="mb-2 flex items-baseline justify-between gap-2">
					<h3 className="text-xs font-medium text-muted-foreground">
						Atributos
					</h3>
					<span className="text-[11px] text-muted-foreground/80">
						número rola o teste · escudo, a salvaguarda
					</span>
				</div>
				<div
					className="grid divide-x divide-white/[0.07] overflow-hidden rounded-xl border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]"
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
										"group flex min-h-[4.75rem] cursor-pointer select-none flex-col items-center justify-center gap-1 bg-linear-to-b from-white/[0.035] to-transparent px-1 pt-2.5 pb-2 text-center transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:from-primary/[0.14] [@media(hover:hover)]:hover:to-transparent",
										touch,
									)}
								>
									<span className="text-[10.5px] font-medium tracking-wide text-muted-foreground transition-colors group-hover:text-primary/90">
										{attr.label}
									</span>
									<span className="font-mono text-[1.25rem] leading-none font-semibold text-foreground tabular-nums">
										{formatModifier(mod)}
									</span>
									<span
										title={
											withItems && withItems.delta !== 0
												? `Ficha ${baseScore}, itens ${withItems.delta > 0 ? "+" : ""}${withItems.delta}`
												: undefined
										}
										className={cn(
											"rounded px-1.5 py-px font-mono text-[10px] tabular-nums",
											withItems && withItems.delta > 0
												? "bg-primary/15 font-semibold text-primary ring-1 ring-primary/25"
												: "bg-white/[0.05] text-muted-foreground",
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
											"group flex min-h-9 cursor-pointer select-none items-center justify-center gap-1 border-t border-white/[0.06] font-mono text-[11px] font-medium transition-[background-color,transform] duration-150 active:scale-[0.97] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-white/[0.05]",
											touch,
											proficient
												? "bg-primary/12 text-foreground shadow-[inset_0_1px_0_var(--primary-muted)]"
												: "text-muted-foreground",
										)}
									>
										{proficient ? (
											<span
												role="img"
												aria-label="Salvaguarda proficiente"
												className="flex"
											>
												<ArcaneShieldGlyph
													filled
													className="t-icon-spring size-3.5 text-primary"
												/>
											</span>
										) : (
											<ArcaneShieldGlyph className="t-icon-spring size-3.5 text-muted-foreground/60" />
										)}
										<span className="tabular-nums">
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
