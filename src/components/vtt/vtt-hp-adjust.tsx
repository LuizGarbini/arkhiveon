import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	VitalityHeartGlyph,
	WardShieldGlyph,
} from "@/components/vtt/sheet/sheet-icons";
import { cn } from "@/lib/utils";
import { visibleHpLabel } from "@/lib/vtt/character-hp";
import { planHpDelta } from "@/lib/vtt/hp-delta";

/**
 * PV do menu do token e da ficha na mesa: os mesmos botões, a mesma barra
 * (`bg-primary`), vida temporária e o mesmo travamento enquanto a gravação não termina.
 */
export function VttHpAdjust({
	hpCurrent,
	hpMax,
	showMax,
	tempHp = 0,
	onChange,
	onChangeMax,
	onChangeHp,
	onChangeTempHp,
}: {
	hpCurrent: number;
	hpMax: number;
	showMax: boolean;
	tempHp?: number;
	onChange?: (next: number) => Promise<unknown> | unknown;
	onChangeMax?: (next: number) => Promise<unknown> | unknown;
	onChangeHp?: (patch: {
		current?: number;
		max?: number;
	}) => Promise<unknown> | unknown;
	onChangeTempHp?: (next: number) => Promise<unknown> | unknown;
}) {
	const maxFieldId = useId();
	const currentFieldId = useId();
	const tempFieldId = useId();
	const [maxDraft, setMaxDraft] = useState<string | null>(null);
	const [currentDraft, setCurrentDraft] = useState<string | null>(null);
	const [tempDraft, setTempDraft] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const pendingRef = useRef(false);
	const ratio = hpMax > 0 ? Math.max(0, Math.min(1, hpCurrent / hpMax)) : 0;

	const run = (
		operation: () => Promise<unknown> | unknown,
		trigger?: HTMLElement | null,
	) => {
		if (pendingRef.current) return;
		pendingRef.current = true;
		setSaving(true);
		let pending: Promise<unknown>;
		try {
			pending = Promise.resolve(operation());
		} catch (error) {
			pending = Promise.reject(error);
		}
		void pending
			.catch(() => undefined)
			.finally(() => {
				// Falha ou reversão reabilita o mesmo botão. Sem blur ele segue
				// com o anel de foco e parece que o ajuste ficou selecionado.
				trigger?.blur();
				pendingRef.current = false;
				setSaving(false);
			});
	};

	const handleDelta = (delta: number, button: HTMLElement) => {
		if (!onChange) return;
		button.blur();
		run(async () => {
			const plan = planHpDelta(delta, {
				current: hpCurrent,
				max: hpMax,
				temp: tempHp,
				canTemp: Boolean(onChangeTempHp),
			});
			if (plan.temp !== undefined && onChangeTempHp) {
				await onChangeTempHp(plan.temp);
			}
			if (plan.current !== undefined) await onChange(plan.current);
		}, button);
	};

	const numberInputClass =
		"h-11 border-0 bg-transparent px-2.5 pt-4 pb-0.5 font-mono text-[16px] md:text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

	return (
		<div
			className="space-y-2 rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 p-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
			aria-busy={saving}
		>
			<output
				data-testid="vtt-hp-saving"
				aria-hidden={saving ? undefined : true}
				className={cn(
					"pointer-events-none -mt-2 block h-[18px] overflow-hidden text-[11px] font-medium leading-[18px] text-muted-foreground transition-opacity duration-150",
					saving ? "opacity-100" : "opacity-0",
				)}
			>
				Salvando…
			</output>
			<div className="flex items-center justify-between gap-1.5 whitespace-nowrap">
				<span className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-muted-foreground">
					<VitalityHeartGlyph className="size-3.5 text-primary/85" />
					Pontos de vida
				</span>
				<div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap font-mono text-xs font-semibold text-foreground tabular-nums">
					<span
						key={hpCurrent}
						className="inline-block whitespace-nowrap animate-[t-digit-pop-in_320ms_cubic-bezier(0.34,1.45,0.64,1)_both] motion-reduce:animate-none"
					>
						{visibleHpLabel(hpCurrent, hpMax, showMax)}
					</span>
					{tempHp > 0 && (
						<span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-primary/30 bg-primary/12 px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]">
							<WardShieldGlyph className="size-3" />+{tempHp} temp
						</span>
					)}
				</div>
			</div>
			<div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-black/45 p-0.5 ring-1 ring-inset ring-white/[0.07]">
				<div
					data-testid="vtt-hp-bar"
					className="h-full rounded-full bg-primary bg-linear-to-r from-primary-dark via-primary to-[oklch(0.74_0.19_295)] shadow-[0_0_10px_var(--primary-glow)] transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
					style={{ width: `${ratio * 100}%` }}
				/>
				{tempHp > 0 && hpMax > 0 && (
					<div
						data-testid="vtt-temp-hp-bar"
						className="h-full rounded-full bg-primary/45 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
						style={{ width: `${Math.min(100, (tempHp / hpMax) * 100)}%` }}
					/>
				)}
			</div>
			{onChange && (
				<div className="grid grid-cols-4 divide-x divide-white/[0.09] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
					{[-5, -1, 1, 5].map((delta) => (
						<Button
							type="button"
							key={delta}
							variant="ghost"
							size="sm"
							disabled={saving}
							className={cn(
								"h-9 rounded-none border-0 bg-linear-to-b from-white/[0.03] to-transparent font-mono text-xs font-medium tabular-nums focus-visible:z-10 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary [@media(pointer:coarse)]:min-h-11",
								delta < 0
									? "text-destructive/85 hover:bg-destructive/15 hover:text-destructive"
									: "text-primary/90 hover:bg-primary/15 hover:text-primary",
							)}
							onClick={(event) => handleDelta(delta, event.currentTarget)}
						>
							{delta > 0 ? `+${delta}` : delta}
						</Button>
					))}
				</div>
			)}

			{onChangeTempHp && (
				<form
					className="flex items-stretch divide-x divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.03)] transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
					onSubmit={(event) => {
						event.preventDefault();
						if (pendingRef.current) return;
						const nextTemp = Number.parseInt(tempDraft ?? String(tempHp), 10);
						if (!Number.isFinite(nextTemp) || nextTemp < 0) return;
						const submitter = event.currentTarget.querySelector(
							"button[type='submit']",
						);
						if (submitter instanceof HTMLButtonElement) submitter.blur();
						run(
							() => onChangeTempHp(nextTemp),
							submitter instanceof HTMLButtonElement ? submitter : null,
						);
						setTempDraft(null);
					}}
				>
					<div className="relative min-w-0 flex-1">
						<label
							htmlFor={tempFieldId}
							className="pointer-events-none absolute top-1 left-2.5 flex items-center gap-1 text-[10px] font-medium text-muted-foreground"
						>
							<WardShieldGlyph className="size-3 text-primary/80" />
							Vida temporária
						</label>
						<Input
							id={tempFieldId}
							type="number"
							min={0}
							inputMode="numeric"
							spellCheck={false}
							autoComplete="off"
							disabled={saving}
							aria-label="Vida temporária"
							placeholder="0"
							value={tempDraft ?? (tempHp > 0 ? String(tempHp) : "")}
							onChange={(event) => setTempDraft(event.target.value)}
							className={numberInputClass}
						/>
					</div>
					<Button
						type="submit"
						variant="ghost"
						disabled={saving}
						className="h-11 min-h-11 shrink-0 select-none rounded-none border-0 bg-white/[0.025] px-3 text-xs font-medium text-foreground hover:bg-primary/12 hover:text-primary focus-visible:z-10"
					>
						Definir
					</Button>
					{tempHp > 0 && (
						<Button
							type="button"
							variant="ghost"
							disabled={saving}
							onClick={(e) => {
								const btn = e.currentTarget;
								btn.blur();
								run(() => onChangeTempHp(0), btn);
							}}
							className="h-11 min-h-11 shrink-0 select-none rounded-none border-0 px-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/12 hover:text-destructive focus-visible:z-10"
						>
							Zerar
						</Button>
					)}
				</form>
			)}

			{(onChange || onChangeHp || onChangeMax) && (
				<form
					className="flex items-stretch divide-x divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.03)] transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15"
					onSubmit={(event) => {
						event.preventDefault();
						if (pendingRef.current) return;
						const submitter = event.currentTarget.querySelector(
							"button[type='submit']",
						);
						if (submitter instanceof HTMLButtonElement) submitter.blur();
						run(
							async () => {
								const nextCurrent = Number.parseInt(
									currentDraft ?? String(hpCurrent),
									10,
								);
								const canEditMax =
									showMax && (Boolean(onChangeMax) || Boolean(onChangeHp));
								const nextMax = canEditMax
									? Number.parseInt(maxDraft ?? String(hpMax), 10)
									: null;
								const hasCurrentChange =
									Number.isFinite(nextCurrent) &&
									nextCurrent >= 0 &&
									nextCurrent !== hpCurrent;
								const hasMaxChange =
									nextMax !== null &&
									Number.isFinite(nextMax) &&
									nextMax > 0 &&
									nextMax !== hpMax;

								if (onChangeHp && (hasCurrentChange || hasMaxChange)) {
									await onChangeHp({
										current: hasCurrentChange ? nextCurrent : undefined,
										max: hasMaxChange ? nextMax : undefined,
									});
								} else {
									if (hasCurrentChange && onChange) {
										await onChange(nextCurrent);
									}
									if (hasMaxChange && onChangeMax) {
										await onChangeMax(nextMax);
									}
								}
								setCurrentDraft(null);
								setMaxDraft(null);
							},
							submitter instanceof HTMLButtonElement ? submitter : null,
						);
					}}
				>
					<div className="relative min-w-0 flex-1">
						<label
							htmlFor={currentFieldId}
							className="pointer-events-none absolute top-1 left-2.5 text-[10px] font-medium text-muted-foreground"
						>
							PV atual
						</label>
						<Input
							id={currentFieldId}
							type="number"
							min={0}
							inputMode="numeric"
							spellCheck={false}
							autoComplete="off"
							disabled={saving}
							aria-label="PV atual"
							value={currentDraft ?? String(hpCurrent)}
							onChange={(event) => setCurrentDraft(event.target.value)}
							className={numberInputClass}
						/>
					</div>
					{showMax && (onChangeMax || onChangeHp) ? (
						<div className="relative min-w-0 flex-1">
							<label
								htmlFor={maxFieldId}
								className="pointer-events-none absolute top-1 left-2.5 text-[10px] font-medium text-muted-foreground"
							>
								PV máximo
							</label>
							<Input
								id={maxFieldId}
								type="number"
								min={1}
								inputMode="numeric"
								spellCheck={false}
								autoComplete="off"
								disabled={saving}
								aria-label="PV máximo"
								value={maxDraft ?? String(hpMax)}
								onChange={(event) => setMaxDraft(event.target.value)}
								className={numberInputClass}
							/>
						</div>
					) : null}
					<Button
						type="submit"
						variant="ghost"
						disabled={saving}
						className="h-11 min-h-11 shrink-0 select-none rounded-none border-0 bg-white/[0.025] px-3 text-xs font-medium text-foreground hover:bg-primary/12 hover:text-primary focus-visible:z-10"
					>
						Aplicar
					</Button>
				</form>
			)}
		</div>
	);
}
