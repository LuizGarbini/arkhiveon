import { Flame, type LucideIcon, Minus, Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

/** Textos de um contador (Destino, Pontos Divinos…), usados em aria e no Dialog. */
export interface PointPoolCopy {
	/** Nome exibido/lido: "Destino", "Pontos Divinos". */
	name: string;
	/** "ponto de destino", "ponto divino". */
	point: string;
	/** Usado em "Editar total de …": "destino", "pontos divinos". */
	totalOf: string;
	/** Rótulo do campo do total: "Total de pontos de destino". */
	totalLabel: string;
	/** Verbo do Dialog de queimar: "fica" (Destino) ou "ficam" (Pontos Divinos). */
	remains: string;
}

interface PointPoolControlProps {
	copy: PointPoolCopy;
	icon: LucideIcon;
	value: number;
	total: number;
	totalMin: number;
	totalMax: number;
	/** Largura da barra, 0..100. */
	percent: number;
	/** `data-slot` da barra (testes e prova). */
	barSlot: string;
	readOnly?: boolean;
	onSpend: () => void;
	onRegain: () => void;
	/** O pai aplica o clamp e só grava se algo mudou. */
	onSetTotal: (total: number) => void;
	/** Sem `onBurn`, não aparece o botão Queimar. */
	onBurn?: () => void;
}

const stepClass =
	"size-[44px] shrink-0 cursor-pointer rounded-[10px] sm:size-[30px]";

/** Ref estável: foca e seleciona o total só quando o campo aparece (após o toque). */
function focusAndSelect(el: HTMLInputElement | null) {
	el?.focus();
	el?.select();
}

/**
 * Contador "sobra / total" da faixa Recursos da mesa: − ◆ n / t + 🔥.
 * O total é editável inline (Enter/blur grava, Esc cancela) e Queimar pede
 * confirmação num Dialog do DS.
 */
export function PointPoolControl({
	copy,
	icon: Icon,
	value,
	total,
	totalMin,
	totalMax,
	percent,
	barSlot,
	readOnly,
	onSpend,
	onRegain,
	onSetTotal,
	onBurn,
}: PointPoolControlProps) {
	const [burnOpen, setBurnOpen] = useState(false);
	const [editingTotal, setEditingTotal] = useState(false);
	const [totalDraft, setTotalDraft] = useState("");
	const skipTotalBlur = useRef(false);
	const totalInputId = useId();

	function startEditTotal() {
		skipTotalBlur.current = false;
		setTotalDraft(String(total));
		setEditingTotal(true);
	}

	function commitTotal() {
		setEditingTotal(false);
		const n = Number.parseInt(totalDraft, 10);
		if (!Number.isFinite(n)) return;
		onSetTotal(n);
	}

	const totalText = (
		<span className="text-xs text-muted-foreground"> / {total}</span>
	);
	const totalNode = readOnly ? (
		totalText
	) : editingTotal ? (
		<form
			className="inline-flex items-center"
			onSubmit={(e) => {
				e.preventDefault();
				skipTotalBlur.current = true;
				commitTotal();
			}}
		>
			<span className="text-xs text-muted-foreground" aria-hidden="true">
				&nbsp;/&nbsp;
			</span>
			<label htmlFor={totalInputId} className="sr-only">
				{copy.totalLabel}
			</label>
			<Input
				id={totalInputId}
				ref={focusAndSelect}
				type="number"
				inputMode="numeric"
				min={totalMin}
				max={totalMax}
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
				className="h-8 w-14 [appearance:textfield] px-1.5 text-center font-display font-bold tabular-nums [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
			/>
		</form>
	) : (
		<button
			type="button"
			onClick={startEditTotal}
			aria-label={`Editar total de ${copy.totalOf} (${total})`}
			title="Editar total"
			className="relative -my-4 ml-1 inline-flex min-w-7 cursor-pointer justify-center rounded-md px-1 py-4 text-xs text-muted-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-[3px] transition-colors duration-150 select-none after:absolute after:-inset-x-1.5 after:inset-y-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:-my-1 sm:py-1 [@media(hover:hover)]:hover:text-foreground"
		>
			/ {total}
		</button>
	);

	const burnTotal = Math.max(0, total - 1);
	const burnValue = Math.min(value, burnTotal);

	return (
		<>
			<fieldset
				className="flex shrink-0 items-center gap-1 sm:gap-2"
				aria-label={`${copy.name} ${value} de ${total}`}
			>
				{!readOnly && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className={stepClass}
						aria-label={`Gastar 1 ${copy.point}`}
						disabled={value <= 0}
						onClick={onSpend}
					>
						<Minus className="h-4 w-4" />
					</Button>
				)}
				<span className="inline-flex min-w-[50px] flex-col gap-[5px] sm:min-w-16">
					<span className="inline-flex items-center justify-center gap-1.5">
						<Icon
							className="h-3.5 w-3.5 fill-current text-primary"
							aria-hidden="true"
						/>
						<span className="inline-flex items-center font-display text-base leading-none font-bold whitespace-nowrap tabular-nums text-foreground">
							<span className="sr-only">{copy.name} </span>
							{value}
							{totalNode}
						</span>
					</span>
					<span
						className="h-[3px] overflow-hidden rounded-full bg-muted"
						aria-hidden="true"
					>
						<span
							data-slot={barSlot}
							className="block h-full rounded-full bg-primary transition-[width] duration-150"
							style={{ width: `${percent}%` }}
						/>
					</span>
				</span>
				{!readOnly && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className={stepClass}
						aria-label={`Ganhar 1 ${copy.point}`}
						disabled={value >= total}
						onClick={onRegain}
					>
						<Plus className="h-4 w-4" />
					</Button>
				)}
				{!readOnly && onBurn && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className={cn(
							stepClass,
							"text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive",
						)}
						aria-label={`Queimar 1 ${copy.point}`}
						title="Queimar"
						disabled={total <= 0}
						onClick={() => setBurnOpen(true)}
					>
						<Flame className="h-4 w-4" />
					</Button>
				)}
			</fieldset>
			{!readOnly && onBurn && (
				<Dialog open={burnOpen} onOpenChange={setBurnOpen}>
					<DialogContent className="sm:max-w-sm">
						<DialogHeader>
							<DialogTitle className="flex items-center gap-2">
								<Flame className="h-[18px] w-[18px] text-destructive" />
								Queimar 1 {copy.point}?
							</DialogTitle>
							<DialogDescription>
								O total cai de vez de {total} para {burnTotal}. {copy.name}{" "}
								{copy.remains}{" "}
								<strong className="font-semibold text-foreground tabular-nums">
									{burnValue} / {burnTotal}
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
								disabled={total <= 0}
								onClick={() => {
									onBurn();
									setBurnOpen(false);
								}}
							>
								<Flame className="h-4 w-4" />
								Queimar
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}
		</>
	);
}
