import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { visibleHpLabel } from "@/lib/vtt/character-hp";
import { planHpDelta } from "@/lib/vtt/hp-delta";

type Save = Promise<unknown> | unknown;

/**
 * PV da ficha na mesa. O número grande é o destaque; tocar nele abre um editor
 * pequeno (PV atual, máximo e vida temporária juntos), em vez de quatro campos
 * sempre abertos. Os botões −5/−1/+1/+5 seguem a regra de sempre: dano come a
 * vida temporária primeiro, cura não passa do máximo. Um ajuste por vez: os
 * botões travam enquanto a gravação não termina.
 */
export function SheetHp({
	current,
	max,
	showMax,
	temp = 0,
	onChange,
	onChangeMax,
	onChangeHp,
	onChangeTempHp,
}: {
	current: number;
	max: number;
	showMax: boolean;
	temp?: number;
	onChange?: (next: number) => Save;
	onChangeMax?: (next: number) => Save;
	onChangeHp?: (patch: { current?: number; max?: number }) => Save;
	onChangeTempHp?: (next: number) => Save;
}) {
	const ids = useId();
	const [open, setOpen] = useState(false);
	const [saving, setSaving] = useState(false);
	const [currentDraft, setCurrentDraft] = useState<string | null>(null);
	const [maxDraft, setMaxDraft] = useState<string | null>(null);
	const [tempDraft, setTempDraft] = useState<string | null>(null);
	const pendingRef = useRef(false);

	const canEditCurrent = Boolean(onChange || onChangeHp);
	const canEditMax = showMax && Boolean(onChangeMax || onChangeHp);
	const editable = canEditCurrent || canEditMax || Boolean(onChangeTempHp);
	const ratio = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
	const low = max > 0 && current / max <= 0.25;

	const run = (operation: () => Save, trigger?: HTMLElement | null) => {
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
				// Sem o blur o botão segue com o anel de foco e parece selecionado.
				trigger?.blur();
				pendingRef.current = false;
				setSaving(false);
			});
	};

	const delta = (amount: number, button: HTMLElement) => {
		if (!onChange) return;
		run(async () => {
			const plan = planHpDelta(amount, {
				current,
				max,
				temp,
				canTemp: Boolean(onChangeTempHp),
			});
			if (plan.temp !== undefined && onChangeTempHp) {
				await onChangeTempHp(plan.temp);
			}
			if (plan.current !== undefined) await onChange(plan.current);
		}, button);
	};

	const resetDrafts = () => {
		setCurrentDraft(null);
		setMaxDraft(null);
		setTempDraft(null);
	};

	const apply = () => {
		run(async () => {
			const nextCurrent = Number.parseInt(currentDraft ?? String(current), 10);
			const nextMax = canEditMax
				? Number.parseInt(maxDraft ?? String(max), 10)
				: null;
			const hasCurrent =
				canEditCurrent &&
				Number.isFinite(nextCurrent) &&
				nextCurrent >= 0 &&
				nextCurrent !== current;
			const hasMax =
				nextMax !== null &&
				Number.isFinite(nextMax) &&
				nextMax > 0 &&
				nextMax !== max;
			if (onChangeHp && (hasCurrent || hasMax)) {
				await onChangeHp({
					current: hasCurrent ? nextCurrent : undefined,
					max: hasMax ? (nextMax ?? undefined) : undefined,
				});
			} else {
				if (hasCurrent && onChange) await onChange(nextCurrent);
				if (hasMax && onChangeMax && nextMax !== null) {
					await onChangeMax(nextMax);
				}
			}
			if (onChangeTempHp && tempDraft !== null) {
				const nextTemp = Number.parseInt(tempDraft || "0", 10);
				if (Number.isFinite(nextTemp) && nextTemp >= 0 && nextTemp !== temp) {
					await onChangeTempHp(nextTemp);
				}
			}
		});
		setOpen(false);
		resetDrafts();
	};

	const numberClass =
		"font-display text-[2.125rem] leading-none font-semibold tabular-nums";

	return (
		<section aria-label="Pontos de vida" aria-busy={saving}>
			<div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
				{editable ? (
					<Popover
						open={open}
						onOpenChange={(next) => {
							setOpen(next);
							if (!next) resetDrafts();
						}}
					>
						<PopoverTrigger
							render={
								<button
									type="button"
									aria-label={`Editar pontos de vida (${visibleHpLabel(current, max, showMax)})`}
									className={cn(
										numberClass,
										"-mx-1.5 inline-flex min-h-10 cursor-pointer [@media(pointer:coarse)]:min-h-11 select-none items-baseline rounded-lg px-1.5 underline decoration-dotted decoration-1 decoration-muted-foreground/40 underline-offset-[7px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-muted/50 [@media(hover:hover)]:hover:decoration-muted-foreground/70",
										low ? "text-destructive" : "text-foreground",
									)}
								/>
							}
						>
							{current}
						</PopoverTrigger>
						<PopoverContent align="start" className="w-72 gap-3">
							<form
								className="space-y-3"
								onSubmit={(event) => {
									event.preventDefault();
									apply();
								}}
							>
								<div
									className={cn(
										"grid gap-2.5",
										canEditCurrent && canEditMax
											? "grid-cols-2"
											: "grid-cols-1",
									)}
								>
									{canEditCurrent ? (
										<div className="min-w-0 space-y-1">
											<label
												htmlFor={`${ids}-current`}
												className="text-xs font-medium text-muted-foreground"
											>
												PV atual
											</label>
											<Input
												id={`${ids}-current`}
												type="number"
												min={0}
												inputMode="numeric"
												spellCheck={false}
												autoComplete="off"
												disabled={saving}
												aria-label="PV atual"
												value={currentDraft ?? String(current)}
												onChange={(event) =>
													setCurrentDraft(event.target.value)
												}
												className="h-11 text-base tabular-nums"
											/>
										</div>
									) : null}
									{canEditMax ? (
										<div className="min-w-0 space-y-1">
											<label
												htmlFor={`${ids}-max`}
												className="text-xs font-medium text-muted-foreground"
											>
												PV máximo
											</label>
											<Input
												id={`${ids}-max`}
												type="number"
												min={1}
												inputMode="numeric"
												spellCheck={false}
												autoComplete="off"
												disabled={saving}
												aria-label="PV máximo"
												value={maxDraft ?? String(max)}
												onChange={(event) => setMaxDraft(event.target.value)}
												className="h-11 text-base tabular-nums"
											/>
										</div>
									) : null}
								</div>
								{onChangeTempHp ? (
									<div className="space-y-1">
										<label
											htmlFor={`${ids}-temp`}
											className="text-xs font-medium text-muted-foreground"
										>
											Vida temporária
										</label>
										<div className="flex gap-2">
											<Input
												id={`${ids}-temp`}
												type="number"
												min={0}
												inputMode="numeric"
												spellCheck={false}
												autoComplete="off"
												disabled={saving}
												aria-label="Vida temporária"
												placeholder="0"
												value={tempDraft ?? (temp > 0 ? String(temp) : "")}
												onChange={(event) => setTempDraft(event.target.value)}
												className="h-11 min-w-0 flex-1 text-base tabular-nums"
											/>
											{temp > 0 ? (
												<Button
													type="button"
													variant="ghost"
													disabled={saving}
													className="min-h-11 shrink-0 text-muted-foreground"
													onClick={() => setTempDraft("0")}
												>
													Zerar
												</Button>
											) : null}
										</div>
									</div>
								) : null}
								<Button
									type="submit"
									disabled={saving}
									className="min-h-11 w-full select-none font-semibold"
								>
									Aplicar
								</Button>
							</form>
						</PopoverContent>
					</Popover>
				) : (
					<span className={cn(numberClass, "text-foreground")}>{current}</span>
				)}
				{showMax ? (
					<span className="text-base text-muted-foreground tabular-nums">
						/ {max}
					</span>
				) : null}
				{temp > 0 ? (
					<span className="ml-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11.5px] font-semibold text-primary tabular-nums">
						+{temp} temp
					</span>
				) : null}
				<output
					data-testid="vtt-hp-saving"
					aria-hidden={saving ? undefined : true}
					className={cn(
						"ml-auto text-[11px] text-muted-foreground transition-opacity duration-150",
						saving ? "opacity-100" : "opacity-0",
					)}
				>
					Salvando…
				</output>
			</div>

			<div className="mt-2 flex h-1 gap-0.5 overflow-hidden rounded-full bg-muted">
				<div
					data-testid="vtt-hp-bar"
					className={cn(
						"h-full rounded-full transition-[width] duration-150",
						low ? "bg-destructive" : "bg-primary",
					)}
					style={{ width: `${ratio * 100}%` }}
				/>
				{temp > 0 && max > 0 ? (
					<div
						data-testid="vtt-temp-hp-bar"
						className="h-full rounded-full bg-primary/35 transition-[width] duration-150"
						style={{ width: `${Math.min(100, (temp / max) * 100)}%` }}
					/>
				) : null}
			</div>

			{onChange ? (
				<div className="mt-2.5 grid grid-cols-4 overflow-hidden rounded-xl border border-border/60">
					{[-5, -1, 1, 5].map((amount) => (
						<button
							key={amount}
							type="button"
							disabled={saving}
							aria-label={`${amount > 0 ? "Curar" : "Tirar"} ${Math.abs(amount)} PV`}
							onClick={(event) => delta(amount, event.currentTarget)}
							className={cn(
								"min-h-9 cursor-pointer select-none bg-transparent text-[13px] font-semibold tabular-nums [@media(pointer:coarse)]:min-h-11 transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 [@media(hover:hover)]:hover:bg-muted/60",
								"not-first:border-l not-first:border-border/60",
								amount < 0 ? "text-destructive" : "text-foreground",
							)}
						>
							{amount > 0 ? `+${amount}` : `−${Math.abs(amount)}`}
						</button>
					))}
				</div>
			) : null}
		</section>
	);
}
