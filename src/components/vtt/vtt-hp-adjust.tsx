import { Heart, ShieldPlus } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { visibleHpLabel } from "@/lib/vtt/character-hp";

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
	onChange: (next: number) => Promise<unknown> | unknown;
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
		button.blur();
		run(async () => {
			if (delta < 0 && tempHp > 0 && onChangeTempHp) {
				const damage = -delta;
				if (damage <= tempHp) {
					const nextTemp = tempHp - damage;
					await onChangeTempHp(nextTemp);
					return;
				}
				const leftover = damage - tempHp;
				await onChangeTempHp(0);
				await onChange(Math.max(0, hpCurrent - leftover));
				return;
			}

			if (delta > 0) {
				const nextHp = Math.min(hpMax || hpCurrent + delta, hpCurrent + delta);
				await onChange(nextHp);
				return;
			}

			await onChange(Math.max(0, hpCurrent + delta));
		}, button);
	};

	return (
		<div className="space-y-2" aria-busy={saving}>
			<output
				data-testid="vtt-hp-saving"
				aria-hidden={saving ? undefined : true}
				className={cn(
					"pointer-events-none block h-[18px] overflow-hidden text-xs font-semibold leading-[18px] text-muted-foreground",
					saving ? "opacity-100" : "opacity-0",
				)}
			>
				Salvando…
			</output>
			<div className="flex items-center justify-between text-xs font-bold">
				<span className="flex items-center gap-1.5 text-primary">
					<Heart className="h-3.5 w-3.5" />
					Pontos de vida
				</span>
				<div className="flex items-center gap-1.5 font-mono text-foreground tabular-nums">
					<span>{visibleHpLabel(hpCurrent, hpMax, showMax)}</span>
					{tempHp > 0 && (
						<span className="rounded-md border border-cyan-500/30 bg-cyan-500/15 px-1.5 py-0.5 text-[11px] font-bold text-cyan-300">
							+{tempHp} temp
						</span>
					)}
				</div>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-muted flex">
				<div
					data-testid="vtt-hp-bar"
					className="h-full rounded-full bg-primary transition-[width] duration-150"
					style={{ width: `${ratio * 100}%` }}
				/>
				{tempHp > 0 && hpMax > 0 && (
					<div
						data-testid="vtt-temp-hp-bar"
						className="h-full rounded-full bg-cyan-400 transition-[width] duration-150 ml-0.5"
						style={{ width: `${Math.min(100, (tempHp / hpMax) * 100)}%` }}
					/>
				)}
			</div>
			<div className="grid grid-cols-4 gap-1.5">
				{[-5, -1, 1, 5].map((delta) => (
					<Button
						type="button"
						key={delta}
						variant="outline"
						size="sm"
						disabled={saving}
						className={cn(
							"min-h-11 font-mono tabular-nums",
							delta < 0 ? "text-destructive" : "text-primary",
						)}
						onClick={(event) => handleDelta(delta, event.currentTarget)}
					>
						{delta > 0 ? `+${delta}` : delta}
					</Button>
				))}
			</div>

			{onChangeTempHp && (
				<form
					className="flex items-end gap-1.5 pt-1"
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
					<div className="min-w-0 flex-1 space-y-1">
						<label
							htmlFor={tempFieldId}
							className="text-xs font-bold text-cyan-400 flex items-center gap-1"
						>
							<ShieldPlus className="h-3.5 w-3.5" />
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
							className="h-11 text-base tabular-nums border-cyan-500/30 focus-visible:ring-cyan-500"
						/>
					</div>
					<Button
						type="submit"
						variant="outline"
						disabled={saving}
						className="h-11 min-h-11 select-none border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
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
							className="h-11 min-h-11 select-none text-muted-foreground hover:text-destructive px-2 cursor-pointer"
						>
							Zerar
						</Button>
					)}
				</form>
			)}

			<form
				className="space-y-2 pt-1"
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
								if (hasCurrentChange) {
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
				<div
					className={cn(
						"grid gap-2",
						showMax && (onChangeMax || onChangeHp)
							? "grid-cols-2"
							: "grid-cols-1",
					)}
				>
					<div className="min-w-0 space-y-1">
						<label htmlFor={currentFieldId} className="text-xs font-bold">
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
							className="h-11 text-base tabular-nums"
						/>
					</div>
					{showMax && (onChangeMax || onChangeHp) ? (
						<div className="min-w-0 space-y-1">
							<label htmlFor={maxFieldId} className="text-xs font-bold">
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
								className="h-11 text-base tabular-nums"
							/>
						</div>
					) : null}
				</div>
				<Button
					type="submit"
					variant="outline"
					disabled={saving}
					className="h-11 min-h-11 w-full select-none cursor-pointer font-semibold"
				>
					Aplicar
				</Button>
			</form>
		</div>
	);
}
