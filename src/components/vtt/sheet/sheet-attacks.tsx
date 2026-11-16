import { type CSSProperties, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	calculateProficiencyBonus,
	DAMAGE_TYPE_LABELS,
	type EffectiveStats,
	formatModifier,
	getEquippedWeaponAttacks,
	hasSpellSlots,
	pickSlotFor,
	resolveLinkedInventory,
	slotsRemaining,
	spellSlotsOf,
	spendSlot,
	weaponUsesAmmunition,
} from "@/core/rules";
import type {
	Character,
	Item,
	Spell,
	SpellSlotsState,
} from "@/lib/store/types";
import { cn } from "@/lib/utils";
import {
	ArcaneShieldGlyph,
	BowTargetGlyph,
	CrossedBladesGlyph,
	SpellRuneGlyph,
} from "./sheet-icons";
import type { SheetRolls } from "./sheet-types";
import type { SheetResourceApi } from "./use-sheet-resources";

const pill =
	"min-h-9 [@media(pointer:coarse)]:min-h-11 cursor-pointer select-none rounded-lg border px-2.5 font-mono text-xs font-semibold tabular-nums shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

function spellLevelTitle(level: number) {
	return level === 0 ? "Truques" : `Nível ${level}`;
}

/** "Ação · 36 m · evocação": o que a ficha sabe sobre a magia. */
function spellSubtitle(spell: Spell) {
	return [spell.casting_time, spell.range, spell.school]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(" · ");
}

/** O que o cabeçalho do nível diz sobre os espaços: restam, ou de onde sai o espaço. */
function levelHint(level: number, slots: SpellSlotsState): string {
	if (level === 0) return "à vontade";
	const entry = slots.slots[String(level)];
	if (entry && slotsRemaining(entry) > 0) {
		return `${slotsRemaining(entry)} de ${entry.total} espaços`;
	}
	const pick = pickSlotFor(slots, level);
	if (pick === "pact" && slots.pact) {
		return `usa espaço de Pacto (nível ${slots.pact.level})`;
	}
	if (typeof pick === "number") return `usa espaço de nível ${pick}`;
	if (entry) return `0 de ${entry.total} espaços`;
	return hasSpellSlots(slots) ? "sem espaços" : "";
}

function EmptyWeapons({ onOpenEquipment }: { onOpenEquipment: () => void }) {
	return (
		<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/[0.1] bg-black/25 px-5 py-7 text-center shadow-[inset_0_1px_0_oklch(1_0_0/0.03)]">
			<span className="flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-primary/85 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)]">
				<CrossedBladesGlyph className="size-5" />
			</span>
			<div>
				<p className="text-sm font-semibold">Nenhuma arma equipada</p>
				<p className="mx-auto mt-1 max-w-[16rem] text-xs text-muted-foreground">
					Equipe uma arma com dano cadastrado para ver acerto e dano aqui.
				</p>
			</div>
			<Button
				type="button"
				variant="outline"
				className="group min-h-10 gap-2 rounded-lg border-white/[0.09] bg-linear-to-b from-white/[0.04] to-black/30 text-xs font-medium shadow-[inset_0_1px_0_oklch(1_0_0/0.07)] hover:border-primary/40 hover:bg-primary/10 hover:text-primary [@media(pointer:coarse)]:min-h-11"
				onClick={onOpenEquipment}
			>
				<ArcaneShieldGlyph className="t-icon-spring size-3.5" />
				Abrir equipamento
			</Button>
		</div>
	);
}

/**
 * Ataques das armas equipadas (acerto e dano vão para o chat da mesa), o ataque
 * e a CD de magia, e as magias da ficha por nível. Lançar uma magia gasta o
 * espaço certo (o do nível; sem ele, o de Pacto ou o mais próximo acima).
 */
export function AttacksTab({
	character,
	stats,
	itemsById,
	rolls,
	resources,
	onOpenEquipment,
}: {
	character: Character;
	stats: EffectiveStats;
	itemsById: ReadonlyMap<string, Item>;
	rolls: SheetRolls;
	resources: SheetResourceApi;
	onOpenEquipment: () => void;
}) {
	const proficiency =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);
	const attacks = useMemo(() => {
		const blocked = new Set(stats.blockedByTwoHanded.map((l) => l.entry.id));
		const resolved = resolveLinkedInventory(
			character.inventoryList,
			itemsById,
		).filter((entry) => !blocked.has(entry.id));
		return getEquippedWeaponAttacks(
			resolved,
			stats.scores,
			proficiency,
			stats.weaponBonuses,
		).map((attack) => {
			const entry = resolved.find((e) => e.id === attack.itemId);
			const item = entry?.campaignItemId
				? itemsById.get(entry.campaignItemId)
				: undefined;
			return {
				attack,
				// Arco, besta…: o acerto rola igual, mas a munição se gasta na ficha.
				ranged: weaponUsesAmmunition(item?.weapon?.properties),
			};
		});
	}, [character.inventoryList, itemsById, stats, proficiency]);

	const slots = spellSlotsOf(character);
	const spells = useMemo(() => {
		const byLevel = new Map<number, Spell[]>();
		for (const spell of character.spellsList ?? []) {
			const level = Math.max(0, Math.min(9, Math.trunc(spell.level) || 0));
			byLevel.set(level, [...(byLevel.get(level) ?? []), spell]);
		}
		return [...byLevel.entries()].sort((a, b) => a[0] - b[0]);
	}, [character.spellsList]);
	const spellAttack = character.spellAttackBonus ?? 0;
	const spellDc = character.spellSaveDc ?? 0;
	const hasCasting = spellAttack !== 0 || spellDc > 0 || spells.length > 0;

	const cast = (spell: Spell) => {
		const target = pickSlotFor(slots, spell.level);
		if (target === null) return;
		const next = spendSlot(slots, target);
		if (next) resources.save({ spellSlotsState: next });
	};

	return (
		<div className="space-y-5">
			<section aria-label="Armas">
				{attacks.length === 0 ? (
					<EmptyWeapons onOpenEquipment={onOpenEquipment} />
				) : (
					<div>
						<ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 px-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
							{attacks.map(({ attack, ranged }, index) => (
								<li
									key={attack.itemId}
									style={
										{ "--stagger-index": Math.min(index, 7) } as CSSProperties
									}
									className="group t-stagger-item grid grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] items-center gap-2.5 py-2.5"
								>
									<span className="flex size-9 items-center justify-center rounded-lg border border-white/[0.08] bg-black/35 text-primary/85 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] transition-colors duration-150 group-hover:border-primary/25">
										{ranged ? (
											<BowTargetGlyph className="t-icon-spring size-4" />
										) : (
											<CrossedBladesGlyph className="t-icon-spring size-4" />
										)}
									</span>
									<div className="min-w-0">
										<h4 className="truncate text-[13px] font-semibold">
											{attack.name}
										</h4>
										<p className="truncate text-xs text-muted-foreground">
											{attack.types
												.map((t) => DAMAGE_TYPE_LABELS[t].toLowerCase())
												.join(" / ")}
											{ranged ? " · usa munição" : ""}
										</p>
									</div>
									<button
										type="button"
										disabled={rolls.rolling}
										aria-label={`Rolar acerto de ${attack.name} (${formatModifier(attack.attackBonus)})`}
										onClick={() =>
											rolls.check(`${attack.name} · Ataque`, attack.attackBonus)
										}
										className={cn(
											pill,
											"min-w-13 border-primary/35 bg-linear-to-b from-primary/18 to-primary/8 text-primary [@media(hover:hover)]:hover:border-primary/50 [@media(hover:hover)]:hover:bg-primary/20",
										)}
									>
										{formatModifier(attack.attackBonus)}
									</button>
									<button
										type="button"
										disabled={rolls.rolling}
										aria-label={`Rolar dano de ${attack.name} (${attack.formula})`}
										onClick={() =>
											rolls.formula(`${attack.name} · Dano`, attack.formula)
										}
										className={cn(
											pill,
											"min-w-16 border-white/[0.08] bg-linear-to-b from-white/[0.04] to-black/30 text-foreground [@media(hover:hover)]:hover:border-white/[0.15] [@media(hover:hover)]:hover:bg-white/[0.06]",
										)}
									>
										{attack.formula}
									</button>
								</li>
							))}
						</ul>
						<p className="mt-2 text-right text-[11px] text-muted-foreground/80">
							acerto e dano vão para o chat da mesa
						</p>
					</div>
				)}
			</section>

			{hasCasting ? (
				<section aria-label="Magias" className="space-y-3.5">
					{spellAttack !== 0 || spellDc > 0 ? (
						<dl className="flex items-stretch gap-3 rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 p-2.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
							<button
								type="button"
								disabled={rolls.rolling || spellAttack === 0}
								aria-label={`Rolar ataque de magia (${formatModifier(spellAttack)})`}
								onClick={() => rolls.check("Ataque de magia", spellAttack)}
								className="relative flex w-[4.75rem] shrink-0 cursor-pointer select-none flex-col items-center justify-center overflow-hidden rounded-lg border border-primary/35 bg-linear-to-b from-primary/16 to-primary/8 py-2 shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default [@media(hover:hover)]:hover:border-primary/50 [@media(hover:hover)]:hover:bg-primary/20"
							>
								<SpellRuneGlyph className="pointer-events-none absolute -top-2 -right-2 size-12 text-primary/[0.09]" />
								<dd className="relative font-mono text-[1.5rem] leading-none font-semibold text-foreground tabular-nums">
									{formatModifier(spellAttack)}
								</dd>
								<dt className="relative mt-1 text-[10.5px] font-medium text-primary/90">
									Ataque
								</dt>
							</button>
							<div className="flex min-w-0 flex-1 items-center gap-6 rounded-lg bg-black/25 px-3.5 py-2 ring-1 ring-white/[0.06]">
								<div>
									<dd className="font-mono text-[1.05rem] leading-tight font-semibold text-foreground tabular-nums">
										{spellDc || "—"}
									</dd>
									<dt className="mt-0.5 text-[11px] text-muted-foreground">
										CD de salvaguarda
									</dt>
								</div>
							</div>
						</dl>
					) : null}

					{spells.length === 0 ? (
						<p className="text-xs text-muted-foreground">
							Nenhuma magia cadastrada na ficha.
						</p>
					) : (
						spells.map(([level, list]) => {
							return (
								<div key={level} className="space-y-1.5">
									<div className="flex items-baseline justify-between gap-2">
										<h3 className="text-[11px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
											{spellLevelTitle(level)}
										</h3>
										<span className="text-[11px] text-muted-foreground/80 tabular-nums">
											{levelHint(level, slots)}
										</span>
									</div>
									<ul className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 px-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
										{list.map((spell, index) => {
											const target =
												level > 0 ? pickSlotFor(slots, level) : null;
											return (
												<li
													key={spell.id}
													style={
														{
															"--stagger-index": Math.min(index, 7),
														} as CSSProperties
													}
													className="group t-stagger-item flex items-center gap-3 py-2.5"
												>
													<span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-black/35 text-primary/85 shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] transition-colors duration-150 group-hover:border-primary/25">
														<SpellRuneGlyph className="t-icon-spring size-3.5" />
													</span>
													<div className="min-w-0 flex-1">
														<p className="truncate text-[13px] font-semibold">
															{spell.name}
														</p>
														<p className="truncate text-xs text-muted-foreground">
															{spellSubtitle(spell)}
														</p>
													</div>
													{level > 0 && resources.canEdit ? (
														<button
															type="button"
															disabled={target === null}
															aria-label={`Lançar ${spell.name} (gasta um espaço)`}
															onClick={() => cast(spell)}
															className={cn(
																pill,
																"border-white/[0.08] bg-linear-to-b from-white/[0.04] to-black/30 px-3 font-sans text-xs font-medium text-foreground [@media(hover:hover)]:hover:border-primary/40 [@media(hover:hover)]:hover:bg-primary/10 [@media(hover:hover)]:hover:text-primary",
															)}
														>
															Lançar
														</button>
													) : null}
												</li>
											);
										})}
									</ul>
								</div>
							);
						})
					)}
				</section>
			) : null}
		</div>
	);
}
