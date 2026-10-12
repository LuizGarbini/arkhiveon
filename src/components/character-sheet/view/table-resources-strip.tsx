import { Dices, Minus, Plus, Star } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
	addBonusDie,
	BONUS_DIE_ORIGIN_MAX,
	BONUS_DIE_QUANTITY_MAX,
	BONUS_DIE_SIDES,
	type BonusDieSides,
	normalizeTableResources,
	setFate,
	spendBonusDie,
	type TableResources,
	toggleInspiration,
} from "@/lib/table-resources";
import { cn } from "@/lib/utils";
import { NumberDetail, useIsMobile } from "./number-detail";

const ORIGIN_SUGGESTIONS = ["descanso longo", "bênção", "ideia boa", "mestre"];

const labelClass =
	"text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground select-none";

const chipBase =
	"inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold transition-colors select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9";

/**
 * Faixa "Recursos da mesa" no cabeçalho da ficha (Modelo A): Inspiração,
 * Destino e Dados bônus. Tocar num dado rola 1 e gasta 1.
 */
export function TableResourcesStrip({
	value,
	readOnly,
	onChange,
}: {
	value: unknown;
	readOnly?: boolean;
	onChange: (next: TableResources) => void;
}) {
	const res = normalizeTableResources(value);
	const isMobile = useIsMobile();
	const toast = useToast();
	const [lastRoll, setLastRoll] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);

	function spend(id: string) {
		const result = spendBonusDie(res, id);
		if (!result) return;
		onChange(result.next);
		const label = `d${result.die.sides}${result.die.origin ? ` · ${result.die.origin}` : ""}`;
		setLastRoll(`${label} → ${result.value}`);
		toast.info({
			title: `Dado bônus: ${result.value}`,
			description: `${label} · restam ${result.die.quantity - 1}`,
		});
	}

	const fateControls = (
		<div className="flex items-center gap-1.5 sm:gap-2">
			{isMobile && !readOnly && (
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-[44px] shrink-0 cursor-pointer"
					aria-label="Gastar 1 ponto de destino"
					disabled={res.fate <= 0}
					onClick={() => onChange(setFate(res, res.fate - 1))}
				>
					<Minus className="h-4 w-4" />
				</Button>
			)}
			{isMobile ? (
				<span className="flex items-center gap-1" aria-hidden="true">
					{Array.from({ length: res.fateMax }, (_, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: pips fixos por posição
							key={i}
							className={cn(
								"h-3 w-3 rounded-full border",
								i < res.fate
									? "border-primary bg-primary"
									: "border-primary/50 bg-transparent",
							)}
						/>
					))}
				</span>
			) : (
				<fieldset
					className="flex items-center"
					aria-label={`Destino ${res.fate} de ${res.fateMax}`}
				>
					{Array.from({ length: res.fateMax }, (_, i) => {
						const filled = i < res.fate;
						return (
							<button
								// biome-ignore lint/suspicious/noArrayIndexKey: pips fixos por posição
								key={i}
								type="button"
								disabled={readOnly}
								aria-label={`Destino ${i + 1}`}
								aria-pressed={filled}
								onClick={() =>
									onChange(setFate(res, res.fate === i + 1 ? i : i + 1))
								}
								className="group flex h-7 w-5 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default enabled:cursor-pointer"
							>
								<span
									className={cn(
										"h-3 w-3 rounded-full border transition-colors",
										filled
											? "border-primary bg-primary"
											: "border-primary/50 bg-transparent group-enabled:group-hover:bg-primary/20",
									)}
								/>
							</button>
						);
					})}
				</fieldset>
			)}
			<span className="font-display text-base font-bold tabular-nums text-foreground">
				<span className="sr-only">Destino </span>
				{res.fate}
				<span className="text-xs text-muted-foreground">/{res.fateMax}</span>
			</span>
			{isMobile && !readOnly && (
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-[44px] shrink-0 cursor-pointer"
					aria-label="Ganhar 1 ponto de destino"
					disabled={res.fate >= res.fateMax}
					onClick={() => onChange(setFate(res, res.fate + 1))}
				>
					<Plus className="h-4 w-4" />
				</Button>
			)}
		</div>
	);

	return (
		<section
			aria-label="Recursos da mesa"
			className="relative mt-2 flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/50 p-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2 sm:px-3 sm:py-2"
		>
			<div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:justify-start sm:gap-3">
				<button
					type="button"
					disabled={readOnly}
					aria-pressed={res.inspiration}
					onClick={() => onChange(toggleInspiration(res))}
					className={cn(
						chipBase,
						"cursor-pointer gap-1.5 px-2.5 sm:gap-2 sm:px-3",
						res.inspiration
							? "border-amber-500/25 bg-amber-500/10 text-amber-300"
							: "border-border/70 bg-background/45 text-muted-foreground hover:text-foreground",
					)}
				>
					<Star className={cn("h-4 w-4", res.inspiration && "fill-current")} />
					Inspiração
				</button>
				<span className="hidden h-6 w-px bg-border/70 sm:block" />
				<div className="flex items-center gap-2">
					<span className={cn(labelClass, "hidden sm:inline")}>Destino</span>
					{fateControls}
				</div>
			</div>

			<span className="hidden h-6 w-px bg-border/70 sm:block" />

			<div className="flex min-w-0 items-center gap-2 sm:flex-1">
				<span className={labelClass}>
					<span className="sm:hidden">Bônus</span>
					<span className="hidden sm:inline">Dados bônus</span>
				</span>
				<div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible">
					{res.bonusDice.length === 0 && (
						<span className="shrink-0 text-xs text-muted-foreground">
							Nenhum dado bônus
						</span>
					)}
					{res.bonusDice.map((die) => (
						<button
							key={die.id}
							type="button"
							disabled={readOnly}
							onClick={() => spend(die.id)}
							aria-label={`Rolar d${die.sides}${die.origin ? ` (${die.origin})` : ""} e gastar 1 — restam ${die.quantity}`}
							title="Tocar = rolar e gastar 1"
							className={cn(
								chipBase,
								"cursor-pointer border-border/70 bg-background/45 text-foreground hover:border-primary/40",
							)}
						>
							<span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase text-primary">
								d{die.sides}
							</span>
							<span className="tabular-nums">×{die.quantity}</span>
							{die.origin && (
								<span className="max-w-40 truncate font-medium text-muted-foreground">
									{die.origin}
								</span>
							)}
						</button>
					))}
					{!readOnly && (
						<NumberDetail
							triggerText="Dado"
							triggerLabel="Adicionar dado bônus"
							title="Adicionar dado bônus"
							subtitle="Tocar no dado depois rola e gasta 1."
							open={addOpen}
							onOpenChange={setAddOpen}
							triggerClassName={cn(
								chipBase,
								"cursor-pointer border-dashed border-primary/40 bg-transparent text-primary hover:bg-primary/10",
							)}
							trigger={
								<>
									<Plus className="h-4 w-4" />
									Dado
								</>
							}
						>
							<AddBonusDieForm
								onCancel={() => setAddOpen(false)}
								onSubmit={(input) => {
									onChange(addBonusDie(res, input));
									setAddOpen(false);
								}}
							/>
						</NumberDetail>
					)}
				</div>
			</div>

			<p
				aria-live="polite"
				className={cn(
					"text-xs font-semibold tabular-nums text-primary sm:basis-full",
					!lastRoll && "sr-only",
				)}
			>
				{lastRoll && (
					<span className="inline-flex items-center gap-1.5">
						<Dices className="h-3.5 w-3.5" />
						{lastRoll}
					</span>
				)}
			</p>
		</section>
	);
}

export function AddBonusDieForm({
	onSubmit,
	onCancel,
}: {
	onSubmit: (input: {
		sides: BonusDieSides;
		quantity: number;
		origin: string;
	}) => void;
	onCancel?: () => void;
}) {
	const originId = useId();
	const [sides, setSides] = useState<BonusDieSides>(6);
	const [quantity, setQuantity] = useState(1);
	const [origin, setOrigin] = useState("");

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		onSubmit({ sides, quantity, origin });
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<fieldset className="space-y-2">
				<legend className={cn(labelClass, "mb-2")}>Dado</legend>
				<div className="grid grid-cols-5 gap-1 rounded-xl border border-border/70 bg-background/45 p-1">
					{BONUS_DIE_SIDES.map((s) => (
						<button
							key={s}
							type="button"
							aria-pressed={sides === s}
							onClick={() => setSides(s)}
							className={cn(
								"min-h-[44px] cursor-pointer rounded-lg border font-display text-sm font-bold uppercase transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9",
								sides === s
									? "border-primary/40 bg-primary/10 text-primary"
									: "border-transparent text-muted-foreground hover:text-foreground",
							)}
						>
							d{s}
						</button>
					))}
				</div>
			</fieldset>

			<div className="flex items-center justify-between gap-3">
				<p className={labelClass}>Quantidade</p>
				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="size-[44px] cursor-pointer sm:size-9"
						aria-label="Menos um"
						disabled={quantity <= 1}
						onClick={() => setQuantity((q) => Math.max(1, q - 1))}
					>
						<Minus className="h-4 w-4" />
					</Button>
					<span
						className="w-6 text-center font-display text-base font-bold tabular-nums"
						aria-live="polite"
					>
						{quantity}
					</span>
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="size-[44px] cursor-pointer sm:size-9"
						aria-label="Mais um"
						disabled={quantity >= BONUS_DIE_QUANTITY_MAX}
						onClick={() =>
							setQuantity((q) => Math.min(BONUS_DIE_QUANTITY_MAX, q + 1))
						}
					>
						<Plus className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<div className="space-y-2">
				<label htmlFor={originId} className={labelClass}>
					Origem{" "}
					<span className="normal-case tracking-normal font-medium">
						(até {BONUS_DIE_ORIGIN_MAX})
					</span>
				</label>
				<Input
					id={originId}
					value={origin}
					maxLength={BONUS_DIE_ORIGIN_MAX}
					placeholder="ex.: dormiu bem"
					onChange={(e) => setOrigin(e.target.value)}
					className="min-h-[44px] sm:min-h-9"
				/>
				<div className="flex flex-wrap gap-1.5">
					{ORIGIN_SUGGESTIONS.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => setOrigin(s)}
							className="min-h-[44px] cursor-pointer rounded-full border border-border/70 bg-background/45 px-3 text-xs text-muted-foreground transition-colors select-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8"
						>
							{s}
						</button>
					))}
				</div>
			</div>

			<div className="flex items-center justify-end gap-2">
				{onCancel && (
					<Button
						type="button"
						variant="ghost"
						className="hidden min-h-9 cursor-pointer sm:inline-flex"
						onClick={onCancel}
					>
						Cancelar
					</Button>
				)}
				<Button
					type="submit"
					className="min-h-[44px] w-full cursor-pointer sm:min-h-9 sm:w-auto"
				>
					Adicionar
				</Button>
			</div>
		</form>
	);
}
