import { Info, Swords } from "lucide-react";
import { useMemo } from "react";
import {
	calculateProficiencyBonus,
	DAMAGE_TYPE_LABELS,
	explainAttack,
	explainDamage,
	formatDamageFormula,
	formatModifier,
	getEquippedWeaponAttacks,
	parseDamageFormula,
	resolveLinkedInventory,
	type WeaponAttack,
} from "@/core/rules";
import { WEAPON_PROPERTY_LABELS } from "@/core/rules/item-mechanics";
import type { Character } from "@/lib/store";
import type { DamageType, Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { ExplanationView, NumberDetail } from "./number-detail";

const NO_ITEMS: ReadonlyMap<string, Item> = new Map();

/** Mapa tipo → cor do mock aprovado (Designer, shadcn 2026-10-10). Demais tipos ficam neutros. */
const TYPE_TONE: Partial<Record<DamageType, string>> = {
	lightning: "border-sky-500/20 bg-sky-500/10 text-sky-300",
	poison: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
};
const NEUTRAL_TONE = "border-border/60 bg-muted text-muted-foreground";

function DamageTypeTag({ type }: { type: DamageType }) {
	return (
		<span
			className={cn(
				"rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
				TYPE_TONE[type] ?? NEUTRAL_TONE,
			)}
		>
			{DAMAGE_TYPE_LABELS[type]}
		</span>
	);
}

function AttackBreakdown({ attack }: { attack: WeaponAttack }) {
	return (
		<NumberDetail
			triggerText={formatModifier(attack.attackBonus)}
			triggerLabel={`Acerto ${formatModifier(attack.attackBonus)}: ver a conta`}
			title={`Acerto ${formatModifier(attack.attackBonus)}`}
			subtitle={attack.name}
		>
			<ExplanationView explanation={explainAttack(attack)} />
		</NumberDetail>
	);
}

/** Com as duas mãos: troca o dado da arma pelo versátil, mantém o resto. */
function versatileFormula(
	attack: WeaponAttack,
	versatileDice: string | undefined,
): string | null {
	const parsed = parseDamageFormula(versatileDice);
	if (!parsed || parsed.dice.length === 0) return null;
	const counted = attack.damageParts.filter((p) => !p.excluded);
	const dice = [
		...parsed.dice,
		...counted.filter((p) => p.origin !== "weapon").flatMap((p) => p.dice),
	];
	const flat = counted.reduce((sum, p) => sum + p.flat, 0);
	return formatDamageFormula(dice, flat);
}

function DamageBreakdown({
	attack,
	versatileDice,
}: {
	attack: WeaponAttack;
	versatileDice?: string;
}) {
	const excluded = attack.damageParts.filter(
		(p) => p.excluded && p.origin === "extra",
	);
	const twoHanded = versatileFormula(attack, versatileDice);
	return (
		<NumberDetail
			triggerText={attack.formula}
			triggerLabel={`Dano ${attack.formula}: ver a conta`}
			title={
				<span className="flex items-center gap-2">
					Dano {attack.formula}
					{attack.types.length === 1 && (
						<DamageTypeTag type={attack.types[0]} />
					)}
				</span>
			}
			subtitle={`${attack.name} · média ${attack.average.toLocaleString("pt-BR")}`}
		>
			<ExplanationView
				explanation={explainDamage(attack)}
				footer={
					<>
						{twoHanded && (
							<p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
								<Info className="mt-0.5 h-3 w-3 shrink-0" />
								<span>
									Com as duas mãos (versátil), vira{" "}
									<strong className="text-foreground">{twoHanded}</strong>.
								</span>
							</p>
						)}
						{excluded.length > 0 && (
							<p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
								<Info className="mt-0.5 h-3 w-3 shrink-0" />
								{excluded.map((p) => p.label).join(", ")} está em +0, não entra
								no total.
							</p>
						)}
						{attack.byType.length > 1 && (
							<div className="flex items-center justify-between gap-3 rounded-lg bg-background/60 px-3 py-2 text-xs">
								<span className="text-muted-foreground">Por tipo</span>
								<span className="text-right font-semibold tabular-nums text-foreground">
									{attack.byType
										.map((t) => `${DAMAGE_TYPE_LABELS[t.type]} ${t.formula}`)
										.join(" · ")}
								</span>
							</div>
						)}
					</>
				}
			/>
		</NumberDetail>
	);
}

/** "Corpo a corpo · 1,5 m · Versátil" a partir do Item vinculado. */
function attackCaption(item: Item | undefined): string | undefined {
	const w = item?.weapon;
	if (!w) return undefined;
	const props = w.properties ?? [];
	const ranged = props.includes("ammunition") || props.includes("loading");
	return [
		ranged ? "Distância" : "Corpo a corpo",
		w.range?.trim(),
		...props
			.filter((p) => p !== "finesse")
			.map((p) => WEAPON_PROPERTY_LABELS[p]),
	]
		.filter(Boolean)
		.join(" · ");
}

/**
 * D&D 5e: ataques derivados das armas equipadas no inventário.
 * Sem arma equipada com dano cadastrado, não mostra número nenhum.
 */
export function WeaponAttacksSection({
	character,
	itemsById = NO_ITEMS,
}: {
	character: Character;
	/** Itens da campanha visíveis: armas vinculadas são lidas daqui (vínculo vivo). */
	itemsById?: ReadonlyMap<string, Item>;
}) {
	const proficiencyBonus =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);
	const resolved = useMemo(
		() => resolveLinkedInventory(character.inventoryList, itemsById),
		[character.inventoryList, itemsById],
	);
	const attacks = useMemo(
		() =>
			getEquippedWeaponAttacks(
				resolved,
				{
					strength: Number(character.strength) || 10,
					dexterity: Number(character.dexterity) || 10,
				},
				proficiencyBonus,
			),
		[resolved, character.strength, character.dexterity, proficiencyBonus],
	);
	const entryById = useMemo(
		() => new Map(resolved.map((e) => [e.id, e])),
		[resolved],
	);

	return (
		<div className="space-y-3 border-t border-border/40 pt-4">
			<h4 className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
				<Swords className="h-4 w-4 text-primary" />
				Ataques
				{attacks.length > 0 && (
					<span className="font-sans text-xs font-normal text-muted-foreground">
						({attacks.length})
					</span>
				)}
			</h4>

			{attacks.length === 0 ? (
				<p className="text-xs italic text-muted-foreground">
					Nenhuma arma equipada com dano cadastrado. No inventário, marque o
					item como Arma, preencha o dano e deixe-o "No Corpo".
				</p>
			) : (
				<div className="grid gap-2">
					{attacks.map((attack) => {
						const entry = entryById.get(attack.itemId);
						const caption = attackCaption(
							entry?.campaignItemId
								? itemsById.get(entry.campaignItemId)
								: undefined,
						);
						return (
							<div
								key={attack.itemId}
								className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-background/40 p-3 sm:grid-cols-[1fr_auto_minmax(9rem,auto)] sm:items-center"
							>
								<div className="col-span-2 min-w-0 sm:col-span-1">
									<p className="truncate text-sm font-semibold text-foreground">
										{attack.name}
									</p>
									{caption && (
										<p className="truncate text-[11px] text-muted-foreground">
											{caption}
										</p>
									)}
								</div>
								<div>
									<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
										Acerto
									</p>
									<AttackBreakdown attack={attack} />
								</div>
								<div>
									<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
										Dano
									</p>
									<DamageBreakdown
										attack={attack}
										versatileDice={entry?.weapon?.versatileDice}
									/>
									<div className="mt-1 flex flex-wrap gap-1">
										{attack.types.map((type) => (
											<DamageTypeTag key={type} type={type} />
										))}
									</div>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
