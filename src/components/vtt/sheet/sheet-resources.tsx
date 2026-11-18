import { Skull } from "lucide-react";
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
import {
	bonusDiceDetail,
	bonusDiceTotal,
	canGrantBonusDie,
	grantOneBonusDie,
	normalizeTableResources,
	regainFate,
	removeOneBonusDie,
	spendFate,
	TABLE_INSPIRATION_MAX,
} from "@/lib/table-resources";
import { cn } from "@/lib/utils";
import { CrescentMoonGlyph, SunburstGlyph } from "./sheet-icons";
import type { SheetResourceApi } from "./use-sheet-resources";

const stepper =
	"flex h-8 w-8 cursor-pointer select-none items-center justify-center bg-linear-to-b from-white/[0.03] to-transparent font-mono text-sm font-medium text-muted-foreground transition-colors active:scale-[0.98] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 [@media(hover:hover)]:hover:bg-white/[0.06] [@media(hover:hover)]:hover:text-foreground [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11";

/** Uma linha do bloco Recursos: número e − / +, no mesmo ritmo dos dados de vida. */
function ResourceCount({
	label,
	value,
	detail,
	canEdit,
	canSpend,
	canAdd,
	onSpend,
	onAdd,
	spendLabel,
	addLabel,
}: {
	label: string;
	value: number;
	detail?: string;
	canEdit: boolean;
	canSpend: boolean;
	canAdd: boolean;
	onSpend: () => void;
	onAdd: () => void;
	spendLabel: string;
	addLabel: string;
}) {
	return (
		<fieldset
			aria-label={label}
			className="m-0 flex min-w-0 items-center justify-between gap-3 border-0 px-3 py-2.5"
		>
			<div className="min-w-0">
				<p className="text-[11px] font-medium text-muted-foreground">{label}</p>
				<p className="mt-0.5 font-mono text-lg leading-tight font-semibold text-foreground tabular-nums">
					{value}
					{detail ? (
						<span className="ml-1.5 font-sans text-xs font-normal text-muted-foreground">
							{detail}
						</span>
					) : null}
				</p>
			</div>
			{canEdit ? (
				<div className="inline-flex shrink-0 divide-x divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
					<button
						type="button"
						disabled={!canSpend}
						aria-label={spendLabel}
						onClick={onSpend}
						className={stepper}
					>
						−
					</button>
					<button
						type="button"
						disabled={!canAdd}
						aria-label={addLabel}
						onClick={onAdd}
						className={stepper}
					>
						+
					</button>
				</div>
			) : null}
		</fieldset>
	);
}

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
		<fieldset className="m-0 flex min-w-0 flex-wrap justify-end border-0 p-1">
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
						className="group relative -mx-1.5 -my-2 inline-flex size-11 cursor-pointer select-none items-center justify-center rounded-lg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
					>
						<span
							aria-hidden
							className={cn(
								"relative flex size-5 items-center justify-center rounded-md border transition-[background-color,border-color,box-shadow,transform] duration-200 group-active:scale-[0.9]",
								available
									? "border-primary/60 bg-primary/18 shadow-[0_0_12px_-2px_var(--primary-glow),inset_0_1px_0_oklch(1_0_0/0.16)] group-hover:border-primary/85 group-hover:bg-primary/28"
									: "border-white/[0.08] bg-black/40 opacity-55 group-hover:opacity-80",
							)}
						>
							<span
								className={cn(
									"size-2 rounded-[2px] bg-primary transition-all duration-200 ease-[cubic-bezier(0.34,1.45,0.64,1)]",
									available ? "scale-100 opacity-90" : "scale-0 opacity-0",
								)}
							/>
						</span>
					</button>
				);
			})}
		</fieldset>
	);
}

/**
 * Recursos do Resumo: espaços de magia (com os de Pacto), dados de vida,
 * inspiração, pontos de destino, dados bônus e os descansos.
 * Inspiração, destino e dados bônus aparecem sempre (mesmo em 0) para
 * poder gastar ou somar. O resto só aparece quando a ficha tem.
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
	const table = normalizeTableResources(character.tableResources);
	const inspiration = table.inspiration;
	const diceCount = bonusDiceTotal(table);
	const diceHint = bonusDiceDetail(table);

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

	const rest =
		"group flex min-h-9 cursor-pointer select-none items-center justify-center gap-1.5 bg-linear-to-b from-white/[0.025] to-transparent text-xs font-medium text-muted-foreground transition-[background-color,color,transform] duration-150 active:scale-[0.98] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary [@media(hover:hover)]:hover:bg-white/[0.05] [@media(hover:hover)]:hover:text-foreground [@media(pointer:coarse)]:min-h-11";

	return (
		<section aria-label="Recursos" className="space-y-2">
			<div className="flex items-baseline justify-between gap-2">
				<h3 className="text-xs font-medium text-muted-foreground">Recursos</h3>
				{showSlots && resources.canEdit ? (
					<span className="text-[11px] text-muted-foreground/80">
						toque numa bolinha para gastar ou devolver
					</span>
				) : null}
			</div>
			<div className="divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]">
				{showSlots ? (
					<div className="space-y-2.5 px-3 py-3">
						{slots.pact ? (
							<div className="flex items-center justify-between gap-3">
								<p className="text-xs text-muted-foreground tabular-nums">
									Pacto · nível {slots.pact.level} ·{" "}
									{slotsRemaining(slots.pact)} de {slots.pact.total}
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
								<div
									key={level}
									className="flex items-center justify-between gap-3"
								>
									<p className="text-xs text-muted-foreground tabular-nums">
										Nível {level} · {slotsRemaining(entry)} de {entry.total}
									</p>
									<Pips
										total={entry.total}
										used={entry.used}
										label={`Espaço de magia nível ${level}`}
										canEdit={resources.canEdit}
										onSpend={() => saveSlots(spendSlot(slots, Number(level)))}
										onRestore={() =>
											saveSlots(restoreSlot(slots, Number(level)))
										}
									/>
								</div>
							);
						})}
					</div>
				) : null}

				{diceTotal > 0 ? (
					<ResourceCount
						label="Dados de vida"
						value={diceLeft}
						detail={`de ${character.hitDice}`}
						canEdit={resources.canEdit}
						canSpend={diceLeft > 0}
						canAdd={diceUsed > 0}
						spendLabel="Gastar um dado de vida"
						addLabel="Recuperar um dado de vida"
						onSpend={() => {
							if (diceLeft <= 0) return;
							resources.save({ hitDiceUsed: diceUsed + 1 });
						}}
						onAdd={() => {
							if (diceUsed <= 0) return;
							resources.save({ hitDiceUsed: diceUsed - 1 });
						}}
					/>
				) : null}

				<ResourceCount
					label="Inspiração"
					value={inspiration}
					canEdit={resources.canEdit}
					canSpend={inspiration > 0}
					canAdd={resources.isStaff || inspiration < TABLE_INSPIRATION_MAX}
					spendLabel="Gastar uma inspiração"
					addLabel="Adicionar uma inspiração"
					onSpend={() => {
						const next = Math.max(0, inspiration - 1);
						if (next === inspiration) return;
						resources.save({ inspiration: next });
					}}
					onAdd={() => {
						if (!resources.isStaff && inspiration >= TABLE_INSPIRATION_MAX) {
							return;
						}
						resources.save({ inspiration: inspiration + 1 });
					}}
				/>
				<ResourceCount
					label="Pontos de destino"
					value={table.fate}
					detail={`de ${table.fateTotal}`}
					canEdit={resources.canEdit}
					canSpend={table.fate > 0}
					canAdd={table.fate < table.fateTotal}
					spendLabel="Gastar um ponto de destino"
					addLabel="Adicionar um ponto de destino"
					onSpend={() => {
						const next = spendFate(table).fate;
						if (next === table.fate) return;
						resources.save({ fate: next });
					}}
					onAdd={() => {
						const next = regainFate(table).fate;
						if (next === table.fate) return;
						resources.save({ fate: next });
					}}
				/>
				<ResourceCount
					label="Dados bônus"
					value={diceCount}
					detail={diceHint || undefined}
					canEdit={resources.canEdit}
					canSpend={diceCount > 0}
					canAdd={canGrantBonusDie(table)}
					spendLabel="Gastar um dado bônus"
					addLabel="Adicionar um dado bônus"
					onSpend={() => {
						const next = removeOneBonusDie(table);
						if (next === table) return;
						resources.save({ bonusDice: next.bonusDice });
					}}
					onAdd={() => {
						const next = grantOneBonusDie(table);
						if (next === table) return;
						resources.save({ bonusDice: next.bonusDice });
					}}
				/>

				{resources.canEdit && (showSlots || diceTotal > 0) ? (
					<div className="grid grid-cols-2 divide-x divide-white/[0.06]">
						<button type="button" onClick={shortRest} className={rest}>
							<SunburstGlyph className="t-icon-spring size-3.5 text-amber-300/80" />
							Descanso curto
						</button>
						<button type="button" onClick={longRest} className={rest}>
							<CrescentMoonGlyph className="t-icon-spring size-3.5 text-primary/85" />
							Descanso longo
						</button>
					</div>
				) : null}
			</div>
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
			className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-2.5"
		>
			<span className="flex items-center gap-2 whitespace-nowrap text-xs font-medium text-destructive">
				<Skull className="size-3.5" aria-hidden />
				Morte
			</span>
			<div className="flex gap-4">
				{(["successes", "failures"] as const).map((kind) => (
					<div key={kind} className="flex items-center gap-1.5">
						<span className="text-[11px] text-muted-foreground">
							{kind === "successes" ? "Sucessos" : "Falhas"}
						</span>
						<fieldset className="m-0 flex min-w-0 border-0 p-1">
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
									className="group relative -mx-2 -my-2 inline-flex size-11 cursor-pointer select-none items-center justify-center rounded-full focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-default"
								>
									<span
										aria-hidden
										className={cn(
											"size-5 rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-150 group-active:scale-[0.92]",
											kind === "successes"
												? "border-primary/60"
												: "border-destructive/60",
											i < saves[kind]
												? kind === "successes"
													? "border-primary bg-primary/30 shadow-[inset_0_0_0_2px_var(--card)]"
													: "border-destructive bg-destructive/30 shadow-[inset_0_0_0_2px_var(--card)]"
												: "bg-transparent",
										)}
									/>
								</button>
							))}
						</fieldset>
					</div>
				))}
			</div>
		</section>
	);
}
