import { Info } from "lucide-react";
import {
	Fragment,
	type ReactNode,
	useState,
	useSyncExternalStore,
} from "react";
import { BottomSheet } from "@/components/bottom-sheet";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { Explanation } from "@/core/rules";

export const numberTrigger =
	"rounded-lg px-1 -mx-1 text-left font-display text-xl font-bold tabular-nums text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 transition-colors select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0 hover:text-primary";

const MOBILE_QUERY = "(max-width: 639px)";

// Sem matchMedia (ex.: jsdom): trata como desktop.
const hasMatchMedia = () =>
	typeof window !== "undefined" && typeof window.matchMedia === "function";

function subscribeMobile(onChange: () => void) {
	if (!hasMatchMedia()) return () => {};
	const mql = window.matchMedia(MOBILE_QUERY);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile() {
	return useSyncExternalStore(
		subscribeMobile,
		() => hasMatchMedia() && window.matchMedia(MOBILE_QUERY).matches,
		() => false,
	);
}

/**
 * Detalhe do número: Popover do DS no desktop; no mobile, Dialog do DS ancorado
 * embaixo (sheet), sem X. Fecha tocando fora (overlay), arrastando para baixo ou Esc.
 * `trigger`/`triggerClassName` trocam o gatilho padrão (número sublinhado).
 */
export function NumberDetail({
	triggerText,
	triggerLabel,
	title,
	subtitle,
	trigger,
	triggerClassName,
	children,
	open: openProp,
	onOpenChange,
}: {
	triggerText: string;
	triggerLabel: string;
	title: ReactNode;
	subtitle: string;
	trigger?: ReactNode;
	triggerClassName?: string;
	children: ReactNode;
	/** Opcional: controla abrir/fechar por fora (ex.: fechar ao enviar um formulário). */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const isMobile = useIsMobile();
	const [innerOpen, setInnerOpen] = useState(false);
	const open = openProp ?? innerOpen;
	const setOpen = (next: boolean) => {
		if (openProp === undefined) setInnerOpen(next);
		onOpenChange?.(next);
	};
	const triggerClass = triggerClassName ?? numberTrigger;
	const triggerBody = trigger ?? triggerText;

	if (!isMobile) {
		return (
			<Popover open={open} onOpenChange={(next) => setOpen(next)}>
				<PopoverTrigger className={triggerClass} aria-label={triggerLabel}>
					{triggerBody}
				</PopoverTrigger>
				<PopoverContent align="start" className="w-80 gap-3">
					<div>
						<p className="font-semibold text-foreground">{title}</p>
						<p className="text-xs text-muted-foreground">{subtitle}</p>
					</div>
					{children}
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<>
			<button
				type="button"
				className={triggerClass}
				aria-label={triggerLabel}
				onClick={() => setOpen(true)}
			>
				{triggerBody}
			</button>
			<BottomSheet
				open={open}
				onOpenChange={setOpen}
				title={title}
				subtitle={subtitle}
			>
				{children}
			</BottomSheet>
		</>
	);
}

/** Frase única com trechos em negrito, depois os blocos valor/origem e o total. */
export function ExplanationView({
	explanation,
	footer,
}: {
	explanation: Explanation;
	footer?: ReactNode;
}) {
	return (
		<div className="space-y-3">
			<p className="text-[13px] leading-relaxed text-muted-foreground">
				{explanation.sentence.map((seg, i) =>
					seg.strong ? (
						// biome-ignore lint/suspicious/noArrayIndexKey: frase estática
						<strong key={i} className="font-semibold text-foreground">
							{seg.text}
						</strong>
					) : (
						// biome-ignore lint/suspicious/noArrayIndexKey: frase estática
						<Fragment key={i}>{seg.text}</Fragment>
					),
				)}
			</p>
			<div className="flex flex-wrap items-center gap-1.5">
				{explanation.blocks.map((block, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: ordem da conta
					<Fragment key={i}>
						{i > 0 && (
							<span
								className="text-xs text-muted-foreground"
								aria-hidden="true"
							>
								+
							</span>
						)}
						<span className="flex min-w-12 flex-col items-center rounded-lg border border-border/60 bg-background/60 px-2.5 py-1.5">
							<span className="text-[13px] font-bold tabular-nums text-foreground">
								{block.value}
							</span>
							<span className="max-w-24 truncate text-[10px] text-muted-foreground">
								{block.label}
							</span>
						</span>
					</Fragment>
				))}
				<span className="text-xs text-muted-foreground" aria-hidden="true">
					=
				</span>
				<span className="flex min-w-12 flex-col items-center rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5">
					<span className="text-[13px] font-bold tabular-nums text-primary">
						{explanation.total}
					</span>
					<span className="text-[10px] text-primary/80">total</span>
				</span>
			</div>
			{explanation.notes.map((note) => (
				<p
					key={note}
					className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
				>
					<Info className="mt-0.5 h-3 w-3 shrink-0" />
					{note}
				</p>
			))}
			{footer}
		</div>
	);
}
