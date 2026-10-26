import { Heart } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { visibleHpLabel } from "@/lib/vtt/character-hp";

/**
 * PV do menu do token e da ficha na mesa: os mesmos botões, a mesma barra
 * (`bg-primary`) e o mesmo travamento enquanto a gravação não termina.
 */
export function VttHpAdjust({
	hpCurrent,
	hpMax,
	showMax,
	onChange,
	onChangeMax,
}: {
	hpCurrent: number;
	hpMax: number;
	showMax: boolean;
	onChange: (next: number) => Promise<unknown> | unknown;
	onChangeMax?: (next: number) => Promise<unknown> | unknown;
}) {
	const maxFieldId = useId();
	const [maxDraft, setMaxDraft] = useState<string | null>(null);
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
				<span className="font-mono text-foreground tabular-nums">
					{visibleHpLabel(hpCurrent, hpMax, showMax)}
				</span>
			</div>
			<div className="h-2 overflow-hidden rounded-full bg-muted">
				<div
					data-testid="vtt-hp-bar"
					className="h-full rounded-full bg-primary transition-[width] duration-150"
					style={{ width: `${ratio * 100}%` }}
				/>
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
						onClick={(event) => {
							const button = event.currentTarget;
							button.blur();
							run(
								() =>
									onChange(
										Math.max(
											0,
											Math.min(hpCurrent + delta, hpMax || hpCurrent + delta),
										),
									),
								button,
							);
						}}
					>
						{delta > 0 ? `+${delta}` : delta}
					</Button>
				))}
			</div>
			{showMax && onChangeMax ? (
				<form
					className="flex items-end gap-1.5"
					onSubmit={(event) => {
						event.preventDefault();
						if (pendingRef.current) return;
						const nextMax = Number.parseInt(maxDraft ?? String(hpMax), 10);
						if (!Number.isFinite(nextMax) || nextMax <= 0) return;
						const submitter = event.currentTarget.querySelector(
							"button[type='submit']",
						);
						if (submitter instanceof HTMLButtonElement) submitter.blur();
						run(
							() => onChangeMax(nextMax),
							submitter instanceof HTMLButtonElement ? submitter : null,
						);
						setMaxDraft(null);
					}}
				>
					<div className="min-w-0 flex-1 space-y-1">
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
					<Button
						type="submit"
						variant="outline"
						disabled={saving}
						className="h-11 min-h-11 select-none"
					>
						Aplicar
					</Button>
				</form>
			) : null}
		</div>
	);
}
