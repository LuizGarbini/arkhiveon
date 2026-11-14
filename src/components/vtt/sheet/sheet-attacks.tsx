import { Crosshair, Shield, Swords } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	calculateProficiencyBonus,
	DAMAGE_TYPE_LABELS,
	type EffectiveStats,
	formatModifier,
	getEquippedWeaponAttacks,
	resolveLinkedInventory,
	weaponUsesAmmunition,
} from "@/core/rules";
import type { Character, Item } from "@/lib/store/types";
import type { SheetRolls } from "./sheet-types";

/**
 * Ataques das armas equipadas, já com os atributos e bônus dos itens. O acerto
 * rola d20 + bônus e o dano rola a fórmula; os dois vão para o chat da mesa.
 */
export function AttacksTab({
	character,
	stats,
	itemsById,
	rolls,
	onOpenEquipment,
}: {
	character: Character;
	stats: EffectiveStats;
	itemsById: ReadonlyMap<string, Item>;
	rolls: SheetRolls;
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

	if (attacks.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/30 px-5 py-9 text-center">
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

	return (
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
							className="min-h-11 min-w-14 cursor-pointer select-none rounded-xl border border-primary/30 bg-primary/10 px-2.5 text-[14px] font-bold text-primary tabular-nums transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-primary/20"
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
							className="min-h-11 min-w-16 cursor-pointer select-none rounded-xl border border-border/70 bg-background/40 px-2.5 text-[13px] font-bold tabular-nums transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/60"
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
	);
}
