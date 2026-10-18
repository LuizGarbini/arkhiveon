import {
	ChevronDown,
	Diamond,
	Dices,
	Minus,
	Plus,
	Star,
	Sun,
} from "lucide-react";
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
	burnPool,
	DIVINE_TOTAL_MAX,
	DIVINE_TOTAL_MIN,
	FATE_TOTAL_MAX,
	FATE_TOTAL_MIN,
	getPool,
	mergeTableResources,
	normalizeTableResources,
	type PoolKey,
	poolPercent,
	regainPool,
	setInspiration,
	setPoolTotal,
	spendBonusDie,
	spendInspiration,
	spendPool,
	type TableResources,
} from "@/lib/table-resources";
import { cn } from "@/lib/utils";
import { NumberDetail, useIsMobile } from "./number-detail";
import { PointPoolControl, type PointPoolCopy } from "./point-pool-control";

const ORIGIN_SUGGESTIONS = ["descanso longo", "bênção", "ideia boa", "mestre"];

const labelClass =
	"text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground select-none";

const chipBase =
	"inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border px-3 text-[13px] font-semibold whitespace-nowrap transition-colors select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-9";

const inspirationOn = "border-amber-500/25 bg-amber-500/10 text-amber-300";
const inspirationOff =
	"border-border/70 bg-background/45 text-muted-foreground hover:text-foreground";

/** Fileira de dados: rola na horizontal, sem barra, com fade na borda direita. */
const diceScroll =
	"flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)] [mask-image:linear-gradient(to_right,#000_calc(100%-32px),transparent)]";

const separator = "w-px shrink-0 self-stretch bg-border/70";

const FATE_COPY: PointPoolCopy = {
	name: "Destino",
	point: "ponto de destino",
	totalOf: "destino",
	totalLabel: "Total de pontos de destino",
	remains: "fica",
};

const DIVINE_COPY: PointPoolCopy = {
	name: "Pontos Divinos",
	point: "ponto divino",
	totalOf: "pontos divinos",
	totalLabel: "Total de pontos divinos",
	remains: "ficam",
};

/**
 * Faixa "Recursos da mesa" no cabeçalho da ficha (Modelo A · quantidades):
 * Inspiração ★ n, Destino ◆ e Pontos Divinos ☀ sobra/total (total editável,
 * Queimar com confirmação) e Dados bônus.
 * Tocar num dado rola 1 e gasta 1.
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
	/** Grava preservando chaves do JSONB que esta versão não conhece. */
	const emit = (next: TableResources) =>
		onChange(mergeTableResources(value, next));
	const [lastRoll, setLastRoll] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [inspOpen, setInspOpen] = useState(false);

	/** Só grava se o total (ou a sobra, que desce junto) mudou. */
	function setTotal(key: PoolKey, n: number) {
		const before = getPool(res, key);
		const next = setPoolTotal(res, key, n);
		const after = getPool(next, key);
		if (after.total !== before.total || after.value !== before.value) {
			emit(next);
		}
	}

	function spend(id: string) {
		const result = spendBonusDie(res, id);
		if (!result) return;
		emit(result.next);
		const label = `d${result.die.sides}${result.die.origin ? ` · ${result.die.origin}` : ""}`;
		setLastRoll(`${label} → ${result.value}`);
		toast.info({
			title: `Dado bônus: ${result.value}`,
			description: `${label} · restam ${result.die.quantity - 1}`,
		});
	}

	const insp = res.inspiration;
	const inspChipBody = isMobile ? (
		<>
			<Star className={cn("h-4 w-4", insp > 0 && "fill-current")} />
			<span className="flex flex-col items-start gap-0.5">
				<span className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-85">
					Inspiração
				</span>
				<span className="font-display text-base leading-none font-bold tabular-nums">
					{insp}
				</span>
			</span>
		</>
	) : (
		<>
			<Star className={cn("h-4 w-4", insp > 0 && "fill-current")} />
			Inspiração
			<span className="min-w-3 text-center font-display text-base leading-none font-bold tabular-nums">
				{insp}
			</span>
			{!readOnly && <ChevronDown className="h-3 w-3 opacity-60" />}
		</>
	);
	const inspChipClass = cn(
		chipBase,
		isMobile ? "gap-2 pr-2.5 pl-2.5" : "gap-2",
		insp > 0 ? inspirationOn : inspirationOff,
	);

	const inspiration = readOnly ? (
		<span
			className={cn(inspChipClass, "cursor-default hover:text-inherit")}
			role="img"
			aria-label={`Inspiração: ${insp}`}
		>
			{inspChipBody}
		</span>
	) : (
		<NumberDetail
			triggerText="Inspiração"
			triggerLabel={`Inspiração: ${insp}. Ajustar`}
			title={
				<span className="flex items-center gap-2">
					<Star className="h-[18px] w-[18px] fill-current text-amber-300" />
					<span className="font-display">Inspiração</span>
				</span>
			}
			subtitle="Quantas você tem agora. Gaste 1 para ter vantagem num teste."
			open={inspOpen}
			onOpenChange={setInspOpen}
			triggerClassName={cn(inspChipClass, "cursor-pointer")}
			trigger={inspChipBody}
		>
			<div className="flex items-center justify-between gap-3">
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-[52px] cursor-pointer rounded-[14px] text-xl"
					aria-label="Gastar 1 inspiração"
					disabled={insp <= 0}
					onClick={() => emit(setInspiration(res, insp - 1))}
				>
					<Minus className="h-5 w-5" />
				</Button>
				<span className="flex flex-col items-center gap-0.5" aria-live="polite">
					<span className="font-display text-[34px] leading-none font-bold tabular-nums text-amber-300">
						{insp}
					</span>
					<span className={cn(labelClass, "tracking-[0.16em]")}>
						{insp === 1 ? "inspiração" : "inspirações"}
					</span>
				</span>
				<Button
					type="button"
					variant="outline"
					size="icon"
					className="size-[52px] cursor-pointer rounded-[14px] text-xl"
					aria-label="Ganhar 1 inspiração"
					onClick={() => emit(setInspiration(res, insp + 1))}
				>
					<Plus className="h-5 w-5" />
				</Button>
			</div>
			<Button
				type="button"
				className="mt-1 min-h-[44px] w-full cursor-pointer"
				disabled={insp <= 0}
				onClick={() => {
					emit(spendInspiration(res));
					setInspOpen(false);
					toast.info({
						title: "Inspiração usada",
						description: `Vantagem no teste · restam ${insp - 1}`,
					});
				}}
			>
				Usar 1 · vantagem
			</Button>
		</NumberDetail>
	);

	const fate = (
		<PointPoolControl
			copy={FATE_COPY}
			icon={Diamond}
			value={res.fate}
			total={res.fateTotal}
			totalMin={FATE_TOTAL_MIN}
			totalMax={FATE_TOTAL_MAX}
			percent={poolPercent(res, "fate")}
			barSlot="fate-bar"
			readOnly={readOnly}
			onSpend={() => emit(spendPool(res, "fate"))}
			onRegain={() => emit(regainPool(res, "fate"))}
			onSetTotal={(n) => setTotal("fate", n)}
			onBurn={() => emit(burnPool(res, "fate"))}
		/>
	);
	const divine = (
		<PointPoolControl
			copy={DIVINE_COPY}
			icon={Sun}
			value={res.divine}
			total={res.divineTotal}
			totalMin={DIVINE_TOTAL_MIN}
			totalMax={DIVINE_TOTAL_MAX}
			percent={poolPercent(res, "divine")}
			barSlot="divine-bar"
			readOnly={readOnly}
			onSpend={() => emit(spendPool(res, "divine"))}
			onRegain={() => emit(regainPool(res, "divine"))}
			onSetTotal={(n) => setTotal("divine", n)}
			onBurn={() => emit(burnPool(res, "divine"))}
		/>
	);

	const addDie = !readOnly && (
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
					emit(addBonusDie(res, input));
					setAddOpen(false);
				}}
			/>
		</NumberDetail>
	);

	const dice = (
		<div className={diceScroll} data-slot="bonus-dice-scroll">
			{res.bonusDice.length === 0 && (
				<span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
					{isMobile
						? "Nenhum dado bônus"
						: "Nenhum dado bônus · o mestre dá, você registra"}
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
						"cursor-pointer border-border/70 bg-background/45 text-foreground hover:border-primary/40 disabled:cursor-default disabled:opacity-100",
					)}
				>
					<span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-display text-[10px] font-bold uppercase text-primary">
						d{die.sides}
					</span>
					<span className="font-display tabular-nums">×{die.quantity}</span>
					{die.origin && (
						<span className="max-w-[60px] truncate text-xs font-medium text-muted-foreground sm:max-w-28">
							{die.origin}
						</span>
					)}
				</button>
			))}
		</div>
	);

	const rollLine = (
		<p
			aria-live="polite"
			className={cn(
				"text-xs font-semibold tabular-nums text-primary",
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
	);

	if (isMobile) {
		return (
			<section
				aria-label="Recursos da mesa"
				className="relative mt-2 flex flex-col gap-2.5 rounded-2xl border border-border/70 bg-background/50 p-3"
			>
				{/* Uma linha por contador, rótulo à esquerda (owner e viewer): com − / + / Queimar não cabe ao lado da Inspiração em 390px. "Pontos Divinos" vira "Divinos" pra não quebrar; o grupo segue lido completo. */}
				<div className="flex items-center">{inspiration}</div>
				<div className="flex items-center justify-between gap-2">
					<span className={cn(labelClass, "whitespace-nowrap")}>Destino</span>
					{fate}
				</div>
				<div className="flex items-center justify-between gap-2">
					<span className={cn(labelClass, "whitespace-nowrap")}>Divinos</span>
					{divine}
				</div>
				<div className="flex min-w-0 items-center gap-2">
					{addDie ? (
						<>
							{addDie}
							<span className={cn(separator, "my-1.5")} />
						</>
					) : (
						<span className={labelClass}>Bônus</span>
					)}
					{dice}
				</div>
				{rollLine}
			</section>
		);
	}

	return (
		<section
			aria-label="Recursos da mesa"
			className="relative mt-2 flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/50 px-3.5 py-2.5"
		>
			{/* 4 recursos não cabem numa linha sem espremer os dados: contadores em cima, dados embaixo. */}
			<div className="flex min-h-[36px] min-w-0 items-center gap-2.5">
				{inspiration}
				<span className={separator} />
				<span className="inline-flex shrink-0 items-center gap-2">
					<span className={labelClass}>Destino</span>
					{fate}
				</span>
				<span className={separator} />
				<span className="inline-flex shrink-0 items-center gap-2">
					<span className={labelClass}>Pontos Divinos</span>
					{divine}
				</span>
			</div>
			<div className="flex min-w-0 items-center gap-2.5 border-t border-border/50 pt-2">
				<span className={cn(labelClass, "shrink-0")}>Dados bônus</span>
				{addDie}
				{dice}
			</div>
			{rollLine}
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
