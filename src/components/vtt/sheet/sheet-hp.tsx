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
import { WardShieldGlyph } from "./sheet-icons";

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
		"font-display text-[2rem] leading-none font-semibold tabular-nums";
	const slotInputClass =
		"h-11 border-0 bg-transparent px-2.5 pt-4 pb-0.5 font-mono text-[16px] md:text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

	return (
		<section
			aria-label="Pontos de vida"
			aria-busy={saving}
			className="relative rounded-xl border border-white/[0.07] bg-linear-to-b from-white/[0.025] to-black/25 p-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.05)]"
		>
			<output
				data-testid="vtt-hp-saving"
				aria-hidden={saving ? undefined : true}
				className={cn(
					"pointer-events-none absolute top-2.5 right-3 text-[11px] text-muted-foreground transition-opacity duration-150",
					saving ? "opacity-100" : "opacity-0",
				)}
			>
				Salvando…
			</output>
			<div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
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
										"-mx-1.5 inline-flex min-h-9 cursor-pointer [@media(pointer:coarse)]:min-h-11 select-none items-center justify-center rounded-lg px-1.5 underline decoration-dotted decoration-1 decoration-muted-foreground/40 underline-offset-[4px] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-white/[0.05] [@media(hover:hover)]:hover:decoration-muted-foreground/70",
										low ? "text-destructive" : "text-foreground",
									)}
								/>
							}
						>
							<span
								key={current}
								className="inline-block animate-[t-digit-pop-in_320ms_cubic-bezier(0.34,1.45,0.64,1)_both] motion-reduce:animate-none"
							>
								{current}
							</span>
						</PopoverTrigger>
						<PopoverContent
							align="start"
							className="w-72 gap-3 rounded-xl border-white/[0.1] bg-card/95 backdrop-blur-xl shadow-2xl"
						>
							<form
								className="space-y-2.5"
								onSubmit={(event) => {
									event.preventDefault();
									apply();
								}}
							>
								{(canEditCurrent || canEditMax) && (
									<div
										className={cn(
											"grid divide-x divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.03)] transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
											canEditCurrent && canEditMax
												? "grid-cols-2"
												: "grid-cols-1",
										)}
									>
										{canEditCurrent ? (
											<div className="relative min-w-0">
												<label
													htmlFor={`${ids}-current`}
													className="pointer-events-none absolute top-1 left-2.5 text-[10px] font-medium text-muted-foreground"
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
													className={slotInputClass}
												/>
											</div>
										) : null}
										{canEditMax ? (
											<div className="relative min-w-0">
												<label
													htmlFor={`${ids}-max`}
													className="pointer-events-none absolute top-1 left-2.5 text-[10px] font-medium text-muted-foreground"
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
													className={slotInputClass}
												/>
											</div>
										) : null}
									</div>
								)}
								{onChangeTempHp ? (
									<div className="flex items-stretch divide-x divide-white/[0.07] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.03)] transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
										<div className="relative min-w-0 flex-1">
											<label
												htmlFor={`${ids}-temp`}
												className="pointer-events-none absolute top-1 left-2.5 text-[10px] font-medium text-muted-foreground"
											>
												Vida temporária
											</label>
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
												className={slotInputClass}
											/>
										</div>
										{temp > 0 ? (
											<Button
												type="button"
												variant="ghost"
												disabled={saving}
												className="h-11 min-h-11 shrink-0 rounded-none border-0 px-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/12 hover:text-destructive focus-visible:z-10"
												onClick={() => setTempDraft("0")}
											>
												Zerar
											</Button>
										) : null}
									</div>
								) : null}
								<Button
									type="submit"
									variant="outline"
									disabled={saving}
									className="min-h-10 w-full select-none rounded-lg border-white/[0.09] bg-linear-to-b from-white/[0.06] to-white/[0.02] text-xs font-medium text-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.06)] hover:border-primary/40 hover:from-primary/15 hover:to-primary/5 hover:text-primary [@media(pointer:coarse)]:min-h-11"
								>
									Aplicar
								</Button>
							</form>
						</PopoverContent>
					</Popover>
				) : (
					<span className={cn(numberClass, "text-foreground")}>
						<span
							key={current}
							className="inline-block animate-[t-digit-pop-in_320ms_cubic-bezier(0.34,1.45,0.64,1)_both] motion-reduce:animate-none"
						>
							{current}
						</span>
					</span>
				)}
				{showMax ? (
					<span className="font-mono text-sm text-muted-foreground tabular-nums">
						/ {max}
					</span>
				) : null}
				{temp > 0 ? (
					<span className="ml-1 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/12 px-1.5 py-0.5 font-mono text-[11px] font-medium text-primary shadow-[inset_0_1px_0_oklch(1_0_0/0.08)] tabular-nums">
						<WardShieldGlyph className="size-3" />+{temp} temp
					</span>
				) : null}
			</div>

			<div className="relative mt-2 flex h-2 gap-0.5 overflow-hidden rounded-full bg-black/45 p-0.5 ring-1 ring-inset ring-white/[0.07]">
				<div
					data-testid="vtt-hp-bar"
					className={cn(
						"h-full rounded-full transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
						low
							? "bg-destructive"
							: "bg-primary bg-linear-to-r from-primary-dark via-primary to-[oklch(0.74_0.19_295)] shadow-[0_0_10px_var(--primary-glow)]",
					)}
					style={{ width: `${ratio * 100}%` }}
				/>
				{temp > 0 && max > 0 ? (
					<div
						data-testid="vtt-temp-hp-bar"
						className="h-full rounded-full bg-primary/45 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
						style={{ width: `${Math.min(100, (temp / max) * 100)}%` }}
					/>
				) : null}
				<span
					aria-hidden
					className="pointer-events-none absolute inset-y-0 left-1/4 w-px bg-black/40"
				/>
				<span
					aria-hidden
					className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-black/40"
				/>
				<span
					aria-hidden
					className="pointer-events-none absolute inset-y-0 left-3/4 w-px bg-black/40"
				/>
			</div>

			{onChange ? (
				<div className="mt-2.5 grid grid-cols-4 divide-x divide-white/[0.06] overflow-hidden rounded-lg border border-white/[0.08] bg-black/30 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]">
					{[-5, -1, 1, 5].map((amount) => (
						<button
							key={amount}
							type="button"
							disabled={saving}
							aria-label={`${amount > 0 ? "Curar" : "Tirar"} ${Math.abs(amount)} PV`}
							onClick={(event) => delta(amount, event.currentTarget)}
							className={cn(
								"min-h-8 cursor-pointer select-none bg-linear-to-b from-white/[0.03] to-transparent font-mono text-xs font-medium tabular-nums [@media(pointer:coarse)]:min-h-11 transition-[background-color,color,transform] duration-150 active:scale-[0.97] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
								amount < 0
									? "text-destructive/85 [@media(hover:hover)]:hover:bg-destructive/15 [@media(hover:hover)]:hover:text-destructive"
									: "text-primary/90 [@media(hover:hover)]:hover:bg-primary/15 [@media(hover:hover)]:hover:text-primary",
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
