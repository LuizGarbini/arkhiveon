import { Crosshair, Shield, Sparkles, Swords } from "lucide-react";
import { useMemo } from "react";
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
import type { SheetRolls } from "./sheet-types";
import type { SheetResourceApi } from "./use-sheet-resources";

const pill =
	"min-h-11 cursor-pointer select-none rounded-xl border px-2.5 text-[14px] font-bold tabular-nums transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50";

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
		<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/30 px-5 py-7 text-center">
			<Swords className="size-6 text-primary" aria-hidden />
			<div>
				<p className="text-sm font-semibold">Nenhuma arma equipada</p>
				<p className="mx-auto mt-1 max-w-[16rem] text-xs text-muted-foreground">
					Equipe uma arma com dano cadastrado para ver acerto e dano aqui.
				</p>
			</div>
			<Button
				type="button"
				variant="outline"
				className="min-h-11 gap-2"
				onClick={onOpenEquipment}
			>
				<Shield className="size-4" aria-hidden />
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
						<ul className="divide-y divide-border/60">
							{attacks.map(({ attack, ranged }) => (
								<li
									key={attack.itemId}
									className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-2.5 py-3 first:pt-0"
								>
									<span className="flex size-10 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-primary">
										{ranged ? (
											<Crosshair className="size-[1.125rem]" aria-hidden />
										) : (
											<Swords className="size-[1.125rem]" aria-hidden />
										)}
									</span>
									<div className="min-w-0">
										<h4 className="truncate text-[13.5px] font-semibold">
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
											"min-w-14 border-primary/30 bg-primary/10 text-primary [@media(hover:hover)]:hover:bg-primary/20",
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
											"min-w-16 border-border/70 bg-background/40 text-[13px] [@media(hover:hover)]:hover:bg-muted/60",
										)}
									>
										{attack.formula}
									</button>
								</li>
							))}
						</ul>
						<p className="mt-2 text-right text-[11.5px] text-muted-foreground">
							acerto e dano vão para o chat da mesa
						</p>
					</div>
				)}
			</section>

			{hasCasting ? (
				<section aria-label="Magias" className="space-y-3">
					{spellAttack !== 0 || spellDc > 0 ? (
						<dl className="grid grid-cols-2 gap-2">
							<button
								type="button"
								disabled={rolls.rolling || spellAttack === 0}
								aria-label={`Rolar ataque de magia (${formatModifier(spellAttack)})`}
								onClick={() => rolls.check("Ataque de magia", spellAttack)}
								className="cursor-pointer select-none rounded-2xl border border-primary/35 bg-gradient-to-b from-primary/15 to-primary/5 px-2 py-2.5 text-center transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
							>
								<dd className="font-display text-[1.5rem] leading-tight font-semibold tabular-nums">
									{formatModifier(spellAttack)}
								</dd>
								<dt className="mt-0.5 text-[11px] text-muted-foreground">
									Ataque de magia
								</dt>
							</button>
							<div className="rounded-2xl border border-border/70 bg-background/40 px-2 py-2.5 text-center">
								<dd className="font-display text-[1.5rem] leading-tight font-semibold tabular-nums">
									{spellDc || "—"}
								</dd>
								<dt className="mt-0.5 text-[11px] text-muted-foreground">
									CD de salvaguarda
								</dt>
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
								<div key={level}>
									<div className="mt-1 mb-1 flex items-baseline justify-between">
										<h3 className="text-xs font-semibold text-muted-foreground">
											{spellLevelTitle(level)}
										</h3>
										<span className="text-[11.5px] text-muted-foreground tabular-nums">
											{levelHint(level, slots)}
										</span>
									</div>
									<ul className="divide-y divide-border/50">
										{list.map((spell) => {
											const target =
												level > 0 ? pickSlotFor(slots, level) : null;
											return (
												<li
													key={spell.id}
													className="flex items-center gap-3 py-2.5"
												>
													<span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/50 text-primary">
														<Sparkles className="size-4" aria-hidden />
													</span>
													<div className="min-w-0 flex-1">
														<p className="truncate text-[13.5px] font-semibold">
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
																"border-border/70 bg-background/40 px-3 text-[13px] font-semibold [@media(hover:hover)]:hover:bg-muted/60",
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
