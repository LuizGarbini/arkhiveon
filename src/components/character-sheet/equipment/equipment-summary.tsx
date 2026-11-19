import { Crosshair, Heart } from "lucide-react";
import { useMemo } from "react";
import {
	calculateProficiencyBonus,
	describeItemEffects,
	describeSpellOrigin,
	type EffectiveStats,
	estimateHealthMax,
	formatModifier,
	formatSpeed,
	formatStatPart,
	getEquippedWeaponAttacks,
	resolveLinkedInventory,
} from "@/core/rules";
import type { Character, Item } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { MissingNumberNotice } from "./equipment-slot-tile";

function chipKeys(chips: readonly string[]) {
	const seen = new Map<string, number>();
	return chips.map((text) => {
		const count = (seen.get(text) ?? 0) + 1;
		seen.set(text, count);
		return { key: count === 1 ? text : `${text}#${count}`, text };
	});
}

function StatCard({
	label,
	to,
	from,
	chips,
	featured = false,
	className,
}: {
	label: string;
	to: string;
	/** Sem itens. Só aparece riscado quando é diferente do valor atual. */
	from?: string;
	chips?: string[];
	featured?: boolean;
	className?: string;
}) {
	const changed = from !== undefined && from !== to;
	return (
		<div
			className={cn(
				"min-w-0 rounded-xl border p-3",
				featured
					? "border-primary/30 bg-gradient-to-br from-primary/15 to-transparent"
					: "border-border/70 bg-background/40",
				className,
			)}
		>
			<div className="flex items-baseline justify-between gap-2">
				<span className="truncate text-xs font-medium text-muted-foreground">
					{label}
				</span>
				<span className="flex items-baseline gap-2 whitespace-nowrap tabular-nums">
					{changed ? (
						<span className="text-xs text-muted-foreground line-through decoration-muted-foreground/40">
							{from}
						</span>
					) : null}
					<span
						className={cn(
							"font-display text-2xl font-bold",
							changed ? "text-emerald-300" : "text-foreground",
						)}
					>
						{to}
					</span>
				</span>
			</div>
			{chips && chips.length > 0 ? (
				<ul className="mt-2 flex w-full min-w-0 flex-wrap gap-1">
					{chipKeys(chips).map((chip) => (
						<li
							key={chip.key}
							title={chip.text}
							aria-label={chip.text}
							className="max-w-full min-w-0 truncate rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10.5px] font-semibold text-muted-foreground tabular-nums"
						>
							{chip.text}
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

/**
 * Coluna "Com este equipamento": CA, iniciativa, deslocamento, PV estimado e
 * o acerto das armas — cada número ao lado do que seria sem os itens.
 */
export function EquipmentSummary({
	character,
	stats,
	bare,
	itemsById,
	speedUnit,
	sceneUnit,
}: {
	character: Character;
	stats: EffectiveStats;
	/** Os mesmos números com tudo na mochila (o "sem itens"). */
	bare: EffectiveStats;
	itemsById: ReadonlyMap<string, Item>;
	speedUnit: string;
	/** Unidade da cena (na mesa): o deslocamento aparece nela. */
	sceneUnit?: string | null;
}) {
	const proficiency =
		character.proficiencyBonus ||
		calculateProficiencyBonus(character.level || 1);
	const attacks = useMemo(() => {
		const blocked = new Set(stats.blockedByTwoHanded.map((l) => l.entry.id));
		return getEquippedWeaponAttacks(
			resolveLinkedInventory(character.inventoryList, itemsById).filter(
				(entry) => !blocked.has(entry.id),
			),
			stats.scores,
			proficiency,
			stats.weaponBonuses,
		);
	}, [character.inventoryList, itemsById, stats, proficiency]);
	const bareAttacks = useMemo(() => {
		const blocked = new Set(stats.blockedByTwoHanded.map((l) => l.entry.id));
		return getEquippedWeaponAttacks(
			resolveLinkedInventory(character.inventoryList, itemsById).filter(
				(entry) => !blocked.has(entry.id),
			),
			bare.scores,
			proficiency,
			bare.weaponBonuses,
		);
	}, [character.inventoryList, itemsById, stats, bare, proficiency]);
	const health = estimateHealthMax({
		healthMax: character.healthMax || 0,
		level: character.level || 1,
		baseCon: stats.abilities.constitution.base,
		effectiveCon: stats.abilities.constitution.total,
	});
	const speed = (value: number, signed = false) =>
		formatSpeed(value, speedUnit, sceneUnit, { signed });
	const speedChips = stats.speed.parts.map(
		(p) => `${p.label} ${speed(p.value, true)}`,
	);
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
		<div className="flex min-h-0 w-full min-w-0 flex-col gap-3">
			<p className="text-[10.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
				Com este equipamento
			</p>
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
			<StatCard
				featured
				label="Classe de Armadura"
				to={String(stats.ac.total)}
				from={String(bare.ac.total)}
				chips={
					stats.ac.source === "items" ? stats.ac.parts.map(formatStatPart) : []
				}
			/>
			<div className="grid grid-cols-2 gap-3">
				<StatCard
					label="Iniciativa"
					to={formatModifier(stats.initiative.total)}
					from={formatModifier(bare.initiative.total)}
					chips={stats.initiative.parts
						.filter((p) => p.kind !== "sheet")
						.map(formatStatPart)}
				/>
				<StatCard
					label="Desloc."
					to={speed(stats.speed.total)}
					from={speed(bare.speed.total)}
					chips={speedChips}
				/>
			</div>
			{stats.saves.total !== 0 ? (
				<StatCard
					label="Salvaguardas (todas)"
					to={formatModifier(stats.saves.total)}
					from="+0"
					chips={stats.saves.parts.map(
						(p) => `${p.label} ${formatModifier(p.value)}`,
					)}
				/>
			) : null}
			{stats.spellDc.parts.length > 0 ? (
				<StatCard
					label="CD de magia"
					to={String(stats.spellDc.total)}
					from={String(stats.spellDc.base)}
					chips={stats.spellDc.parts.map((part) =>
						describeSpellOrigin("dc", part),
					)}
				/>
			) : null}
			{stats.spellAttack.parts.length > 0 ? (
				<StatCard
					label="Ataque de magia"
					to={formatModifier(stats.spellAttack.total)}
					from={formatModifier(stats.spellAttack.base)}
					chips={stats.spellAttack.parts.map((part) =>
						describeSpellOrigin("attack", part),
					)}
				/>
			) : null}
			{health ? (
				<StatCard
					label="PV máximo (estimado)"
					to={String(health.to)}
					from={String(health.from)}
					chips={[
						`CON ${formatModifier(health.perLevel)} por nível (${character.level || 1})`,
					]}
				/>
			) : null}

			<div className="rounded-xl border border-border/70 bg-background/40 p-3">
				<p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
					<Crosshair className="size-3.5" aria-hidden />
					Acerto com as armas
				</p>
				{attacks.length === 0 ? (
					<p className="mt-2 text-xs text-muted-foreground">
						Equipe uma arma para ver acerto e dano.
					</p>
				) : (
					<ul className="mt-2 divide-y divide-border/50">
						{attacks.map((attack, index) => {
							const before = bareAttacks[index];
							const changed =
								before && before.attackBonus !== attack.attackBonus;
							return (
								<li
									key={attack.itemId}
									className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0"
								>
									<div className="min-w-0">
										<p className="truncate text-[13px] font-semibold">
											{attack.name}
										</p>
										{changed ? (
											<p className="text-[11px] text-muted-foreground tabular-nums">
												<span className="line-through">
													{formatModifier(before.attackBonus)} ·{" "}
													{before.formula}
												</span>{" "}
												sem bônus dos itens
											</p>
										) : null}
									</div>
									<div className="text-right tabular-nums">
										<p
											className={cn(
												"font-display text-xl leading-none font-bold",
												changed ? "text-emerald-300" : "text-foreground",
											)}
										>
											{formatModifier(attack.attackBonus)}
										</p>
										<p className="mt-1 text-[11px] font-semibold text-muted-foreground">
											{attack.formula}
										</p>
									</div>
								</li>
							);
						})}
					</ul>
				)}
			</div>
			{health === null && stats.abilities.constitution.delta === 0 ? null : (
				<p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
					<Heart className="size-3 text-rose-400" aria-hidden />O PV máximo
					salvo na ficha não muda: é só uma estimativa.
				</p>
			)}
		</div>
	);
}
