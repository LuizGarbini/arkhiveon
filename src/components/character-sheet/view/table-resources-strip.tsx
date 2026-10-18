import {
	ChevronDown,
	Diamond,
	Dices,
	Flame,
	Minus,
	Plus,
	Star,
} from "lucide-react";
import { type FormEvent, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
	addBonusDie,
	BONUS_DIE_ORIGIN_MAX,
	BONUS_DIE_QUANTITY_MAX,
	BONUS_DIE_SIDES,
	type BonusDieSides,
	burnFate,
	FATE_TOTAL_MAX,
	FATE_TOTAL_MIN,
	fatePercent,
	normalizeTableResources,
	regainFate,
	setFateTotal,
	setInspiration,
	spendBonusDie,
	spendFate,
	spendInspiration,
	type TableResources,
} from "@/lib/table-resources";
import { cn } from "@/lib/utils";
import { NumberDetail, useIsMobile } from "./number-detail";

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

/** Ref estável: foca e seleciona o total só quando o campo aparece (após o toque). */
function focusAndSelect(el: HTMLInputElement | null) {
	el?.focus();
	el?.select();
}

/**
 * Faixa "Recursos da mesa" no cabeçalho da ficha (Modelo A · quantidades):
 * Inspiração ★ n, Destino ◆ sobra/total (total editável) e Dados bônus.
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
	const [lastRoll, setLastRoll] = useState<string | null>(null);
	const [addOpen, setAddOpen] = useState(false);
	const [inspOpen, setInspOpen] = useState(false);
	const [burnOpen, setBurnOpen] = useState(false);
	const [editingTotal, setEditingTotal] = useState(false);
	const [totalDraft, setTotalDraft] = useState("");
	const skipTotalBlur = useRef(false);
	const totalInputId = useId();

	function startEditTotal() {
		skipTotalBlur.current = false;
		setTotalDraft(String(res.fateTotal));
		setEditingTotal(true);
	}

	function commitTotal() {
		setEditingTotal(false);
		const n = Number.parseInt(totalDraft, 10);
		if (!Number.isFinite(n)) return;
		const next = setFateTotal(res, n);
		if (next.fateTotal !== res.fateTotal || next.fate !== res.fate) {
			onChange(next);
		}
	}

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

	const insp = res.inspiration;
	// No mobile o rótulo "Inspiração" fica à esquerda da linha; o chip é só ★ n.
	const inspChipBody = isMobile ? (
		<>
			<Star className={cn("h-4 w-4", insp > 0 && "fill-current")} />
			<span className="min-w-3 text-center font-display text-base leading-none font-bold tabular-nums">
				{insp}
			</span>
			{!readOnly && <ChevronDown className="h-3 w-3 opacity-60" />}
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
					onClick={() => onChange(setInspiration(res, insp - 1))}
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
					onClick={() => onChange(setInspiration(res, insp + 1))}
				>
					<Plus className="h-5 w-5" />
				</Button>
			</div>
			<Button
				type="button"
				className="mt-1 min-h-[44px] w-full cursor-pointer"
				disabled={insp <= 0}
				onClick={() => {
					onChange(spendInspiration(res));
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

	const fatePct = fatePercent(res);
	const stepClass =
		"size-[44px] shrink-0 cursor-pointer rounded-[10px] sm:size-[30px]";
	const totalText = (
		<span className="text-xs text-muted-foreground"> / {res.fateTotal}</span>
	);
	// O total ocupa sempre a mesma caixa (botão ou Input), então editar não
	// empurra −, +, Queimar nem os dados bônus.
	const totalSlot = "relative inline-flex w-7 shrink-0 justify-center";
	const total = readOnly ? (
		totalText
	) : (
		<>
			<span className="mx-1 text-xs text-muted-foreground" aria-hidden="true">
				/
			</span>
			<span className={totalSlot} data-slot="fate-total">
				{editingTotal ? (
					<form
						className="contents"
						onSubmit={(e) => {
							e.preventDefault();
							skipTotalBlur.current = true;
							commitTotal();
						}}
					>
						<label htmlFor={totalInputId} className="sr-only">
							Total de pontos de destino
						</label>
						<Input
							id={totalInputId}
							ref={focusAndSelect}
							type="number"
							inputMode="numeric"
							min={FATE_TOTAL_MIN}
							max={FATE_TOTAL_MAX}
							step={1}
							enterKeyHint="done"
							autoComplete="off"
							spellCheck={false}
							value={totalDraft}
							onChange={(e) => setTotalDraft(e.target.value)}
							onBlur={() => {
								if (skipTotalBlur.current) return;
								commitTotal();
							}}
							onKeyDown={(e) => {
								if (e.key === "Escape") {
									e.preventDefault();
									skipTotalBlur.current = true;
									setEditingTotal(false);
								}
							}}
							className="-my-2.5 h-8 w-full [appearance:textfield] rounded-md px-0 py-0 text-center font-display font-bold tabular-nums sm:-my-1.5 sm:h-6 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
						/>
					</form>
				) : (
					<button
						type="button"
						onClick={startEditTotal}
						aria-label={`Editar total de destino (${res.fateTotal})`}
						title="Editar total"
						className="relative -my-4 inline-flex w-full cursor-pointer justify-center rounded-md py-4 text-xs text-muted-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px] transition-colors duration-150 select-none after:absolute after:-inset-x-1.5 after:inset-y-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:-my-1 sm:py-1 [@media(hover:hover)]:hover:text-foreground"
					>
						{res.fateTotal}
					</button>
				)}
			</span>
		</>
	);
	const fate = (
		<fieldset
			className="flex shrink-0 items-center gap-1 sm:gap-2"
			aria-label={`Destino ${res.fate} de ${res.fateTotal}`}
		>
			{!readOnly && (
				<Button
					type="button"
					variant="outline"
					size="icon"
					className={stepClass}
					aria-label="Gastar 1 ponto de destino"
					disabled={res.fate <= 0}
					onClick={() => onChange(spendFate(res))}
				>
					<Minus className="h-4 w-4" />
				</Button>
			)}
			<span
				className="inline-flex w-20 shrink-0 flex-col gap-[5px]"
				data-slot="fate-number"
			>
				<span className="inline-flex items-center justify-center gap-1.5">
					<Diamond
						className="h-3.5 w-3.5 fill-current text-primary"
						aria-hidden="true"
					/>
					<span className="inline-flex items-center font-display text-base leading-none font-bold whitespace-nowrap tabular-nums text-foreground">
						<span className="sr-only">Destino </span>
						{res.fate}
						{total}
					</span>
				</span>
				<span
					className="h-[3px] overflow-hidden rounded-full bg-muted"
					aria-hidden="true"
				>
					<span
						data-slot="fate-bar"
						className="block h-full rounded-full bg-primary transition-[width] duration-150"
						style={{ width: `${fatePct}%` }}
					/>
				</span>
			</span>
			{!readOnly && (
				<Button
					type="button"
					variant="outline"
					size="icon"
					className={stepClass}
					aria-label="Ganhar 1 ponto de destino"
					disabled={res.fate >= res.fateTotal}
					onClick={() => onChange(regainFate(res))}
				>
					<Plus className="h-4 w-4" />
				</Button>
			)}
			{!readOnly && (
				<Button
					type="button"
					variant="outline"
					size="icon"
					className={cn(
						stepClass,
						// Anula o hover roxo do outline (grudaria após o toque) e só pinta
						// de destrutivo em quem tem hover de verdade.
						"text-muted-foreground hover:border-border/80 hover:bg-background/65 hover:text-muted-foreground dark:hover:bg-input/30 dark:hover:border-input [@media(hover:hover)]:hover:border-destructive/40 [@media(hover:hover)]:hover:bg-destructive/10 [@media(hover:hover)]:hover:text-destructive dark:[@media(hover:hover)]:hover:border-destructive/40 dark:[@media(hover:hover)]:hover:bg-destructive/10",
					)}
					aria-label="Queimar 1 ponto de destino"
					title="Queimar"
					disabled={res.fateTotal <= 0}
					onClick={() => setBurnOpen(true)}
				>
					<Flame className="h-4 w-4" />
				</Button>
			)}
		</fieldset>
	);

	const burnAfter = burnFate(res);
	const burnDialog = !readOnly && (
		<Dialog open={burnOpen} onOpenChange={setBurnOpen}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Flame className="h-[18px] w-[18px] text-destructive" />
						Queimar 1 ponto de destino?
					</DialogTitle>
					<DialogDescription>
						O total cai de vez de {res.fateTotal} para {burnAfter.fateTotal}.
						Destino fica{" "}
						<strong className="font-semibold text-foreground tabular-nums">
							{burnAfter.fate} / {burnAfter.fateTotal}
						</strong>
						. Só dá pra desfazer editando o total.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						className="min-h-[44px] cursor-pointer sm:min-h-9"
						onClick={() => setBurnOpen(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						variant="destructive"
						className="min-h-[44px] cursor-pointer sm:min-h-9"
						disabled={res.fateTotal <= 0}
						onClick={() => {
							onChange(burnFate(res));
							setBurnOpen(false);
						}}
					>
						<Flame className="h-4 w-4" />
						Queimar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
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
					onChange(addBonusDie(res, input));
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
				{/* Mesmo padrão nas duas linhas: rótulo à esquerda, controle à direita. */}
				<div className="flex items-center justify-between gap-2">
					<span className={labelClass}>Inspiração</span>
					{inspiration}
				</div>
				<div className="flex items-center justify-between gap-2">
					<span className={labelClass}>Destino</span>
					{fate}
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
				{burnDialog}
			</section>
		);
	}

	return (
		<section
			aria-label="Recursos da mesa"
			className="relative mt-2 flex flex-col gap-2 rounded-2xl border border-border/70 bg-background/50 px-3.5 py-2.5"
		>
			<div className="flex min-w-0 items-center gap-2.5">
				{inspiration}
				<span className={separator} />
				<span className="inline-flex shrink-0 items-center gap-2">
					<span className={labelClass}>Destino</span>
					{fate}
				</span>
				<span className={separator} />
				<span className={cn(labelClass, "shrink-0")}>Dados bônus</span>
				{addDie}
				{dice}
			</div>
			{rollLine}
			{burnDialog}
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
