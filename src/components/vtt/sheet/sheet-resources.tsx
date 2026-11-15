import { Moon, Skull, Sun } from "lucide-react";
import {
	hasSpellSlots,
	hitDiceTotal,
	longRestHitDiceUsed,
	longRestSlots,
	restoreSlot,
	shortRestSlots,
	slotsRemaining,
	spellSlotsOf,
	spendSlot,
} from "@/core/rules";
import type { Character, SpellSlotsState } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import type { SheetResourceApi } from "./use-sheet-resources";

/** Uma bolinha por espaço: cheia = disponível, vazia = gasto. */
function Pips({
	total,
	used,
	label,
	canEdit,
	onSpend,
	onRestore,
}: {
	total: number;
	used: number;
	label: string;
	canEdit: boolean;
	onSpend: () => void;
	onRestore: () => void;
}) {
	return (
		<fieldset className="m-0 flex min-w-0 flex-wrap gap-1.5 border-0 p-0">
			<legend className="sr-only">{label}</legend>
			{Array.from({ length: total }, (_, i) => {
				const available = i < total - used;
				return (
					<button
						// biome-ignore lint/suspicious/noArrayIndexKey: posição fixa na linha
						key={i}
						type="button"
						disabled={!canEdit}
						aria-label={`${label}: ${available ? "disponível" : "gasto"}`}
						aria-pressed={available}
						// A última bolinha cheia gasta; a primeira vazia devolve.
						onClick={() => (available ? onSpend() : onRestore())}
						className={cn(
							"size-6 cursor-pointer select-none rounded-md border-[1.5px] border-primary/60 transition-[background-color,transform] duration-150 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default",
							available ? "bg-primary" : "bg-transparent",
						)}
					/>
				);
			})}
		</fieldset>
	);
}

/**
 * Recursos do Resumo: espaços de magia (com os de Pacto), dados de vida e os
 * descansos. Só aparece o que a ficha tem.
 */
export function SheetResources({
	character,
	resources,
}: {
	character: Character;
	resources: SheetResourceApi;
}) {
	const slots = spellSlotsOf(character);
	const showSlots = hasSpellSlots(slots);
	const diceTotal = hitDiceTotal(character.hitDice);
	const diceUsed = Math.min(character.hitDiceUsed ?? 0, diceTotal);
	const diceLeft = diceTotal - diceUsed;
	if (!showSlots && diceTotal === 0) return null;

	const saveSlots = (next: SpellSlotsState | null) => {
		if (next) resources.save({ spellSlotsState: next });
	};
	const shortRest = () =>
		resources.save({ spellSlotsState: shortRestSlots(slots) });
	const longRest = () =>
		resources.save({
			spellSlotsState: longRestSlots(slots),
			hitDiceUsed: longRestHitDiceUsed(diceUsed, diceTotal),
			deathSaves: { successes: 0, failures: 0 },
		});
	const levels = Object.keys(slots.slots).sort((a, b) => Number(a) - Number(b));

	return (
		<section aria-label="Recursos" className="space-y-2.5">
			<h3 className="text-xs font-semibold text-muted-foreground">Recursos</h3>

			{showSlots ? (
				<div className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-3">
					<div className="flex items-baseline justify-between">
						<span className="text-xs font-semibold text-muted-foreground">
							Espaços de magia
						</span>
						<span className="text-[11px] text-muted-foreground">
							toque para gastar ou devolver
						</span>
					</div>
					{slots.pact ? (
						<div className="space-y-1.5">
							<p className="text-[11.5px] text-muted-foreground tabular-nums">
								Pacto · nível {slots.pact.level} · {slotsRemaining(slots.pact)}{" "}
								de {slots.pact.total}
							</p>
							<Pips
								total={slots.pact.total}
								used={slots.pact.used}
								label={`Espaço de Pacto nível ${slots.pact.level}`}
								canEdit={resources.canEdit}
								onSpend={() => saveSlots(spendSlot(slots, "pact"))}
								onRestore={() => saveSlots(restoreSlot(slots, "pact"))}
							/>
						</div>
					) : null}
					{levels.map((level) => {
						const entry = slots.slots[level];
						if (!entry) return null;
						return (
							<div key={level} className="space-y-1.5">
								<p className="text-[11.5px] text-muted-foreground tabular-nums">
									Nível {level} · {slotsRemaining(entry)} de {entry.total}
								</p>
								<Pips
									total={entry.total}
									used={entry.used}
									label={`Espaço de magia nível ${level}`}
									canEdit={resources.canEdit}
									onSpend={() => saveSlots(spendSlot(slots, Number(level)))}
									onRestore={() => saveSlots(restoreSlot(slots, Number(level)))}
								/>
							</div>
						);
					})}
				</div>
			) : null}

			{diceTotal > 0 ? (
				<div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 px-3 py-2.5">
					<div>
						<p className="text-xs font-semibold text-muted-foreground">
							Dados de vida
						</p>
						<p className="font-display text-xl font-semibold tabular-nums">
							{diceLeft}
							<span className="ml-1 font-sans text-[13px] font-normal text-muted-foreground">
								de {character.hitDice}
							</span>
						</p>
					</div>
					{resources.canEdit ? (
						<div className="flex gap-1.5">
							<button
								type="button"
								disabled={diceLeft <= 0}
								aria-label="Gastar um dado de vida"
								onClick={() => resources.save({ hitDiceUsed: diceUsed + 1 })}
								className="min-h-11 min-w-11 cursor-pointer select-none rounded-xl border border-border/70 text-base font-semibold transition-transform duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
							>
								−
							</button>
							<button
								type="button"
								disabled={diceUsed <= 0}
								aria-label="Recuperar um dado de vida"
								onClick={() => resources.save({ hitDiceUsed: diceUsed - 1 })}
								className="min-h-11 min-w-11 cursor-pointer select-none rounded-xl border border-border/70 text-base font-semibold transition-transform duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
							>
								+
							</button>
						</div>
					) : null}
				</div>
			) : null}

			{resources.canEdit ? (
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={shortRest}
						className="flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-xl border border-border/70 text-[13px] font-semibold transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-muted/40"
					>
						<Sun className="size-4" aria-hidden />
						Descanso curto
					</button>
					<button
						type="button"
						onClick={longRest}
						className="flex min-h-11 cursor-pointer select-none items-center justify-center gap-2 rounded-xl border border-border/70 text-[13px] font-semibold transition-transform duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-muted/40"
					>
						<Moon className="size-4" aria-hidden />
						Descanso longo
					</button>
				</div>
			) : null}
		</section>
	);
}

/** Salvaguardas contra a morte: aparece só com o PV em zero. */
export function DeathSaves({
	character,
	resources,
}: {
	character: Character;
	resources: SheetResourceApi;
}) {
	const saves = character.deathSaves ?? { successes: 0, failures: 0 };
	const set = (kind: "successes" | "failures", index: number) => {
		const current = saves[kind];
		// Tocar na bolinha N marca até N; tocar na última marcada desmarca uma.
		const next = index + 1 === current ? index : index + 1;
		resources.save({ deathSaves: { ...saves, [kind]: next } });
	};
	return (
		<section
			aria-label="Salvaguardas contra a morte"
			className="flex items-center justify-between gap-3 rounded-2xl border border-destructive/35 bg-destructive/10 px-3 py-2.5"
		>
			<span className="flex items-center gap-2 text-xs font-semibold text-destructive">
				<Skull className="size-4" aria-hidden />
				Contra a morte
			</span>
			<div className="flex gap-4">
				{(["successes", "failures"] as const).map((kind) => (
					<div key={kind} className="flex items-center gap-1.5">
						<span className="text-[11px] text-muted-foreground">
							{kind === "successes" ? "Sucessos" : "Falhas"}
						</span>
						<fieldset className="m-0 flex min-w-0 gap-1 border-0 p-0">
							<legend className="sr-only">
								{kind === "successes" ? "Sucessos" : "Falhas"}
							</legend>
							{[0, 1, 2].map((i) => (
								<button
									key={i}
									type="button"
									disabled={!resources.canEdit}
									aria-label={`${kind === "successes" ? "Sucesso" : "Falha"} ${i + 1}`}
									aria-pressed={i < saves[kind]}
									onClick={() => set(kind, i)}
									className={cn(
										"size-6 cursor-pointer select-none rounded-full border-[1.5px] transition-[background-color,transform] duration-150 active:scale-[0.92] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default",
										kind === "successes"
											? "border-primary/70"
											: "border-destructive/70",
										i < saves[kind]
											? kind === "successes"
												? "bg-primary"
												: "bg-destructive"
											: "bg-transparent",
									)}
								/>
							))}
						</fieldset>
					</div>
				))}
			</div>
		</section>
	);
}
