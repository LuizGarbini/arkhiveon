import { Info } from "lucide-react";
import {
	Fragment,
	type PointerEvent,
	type ReactNode,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { Explanation } from "@/core/rules";
import { cn } from "@/lib/utils";

export const numberTrigger =
	"rounded-lg px-1 -mx-1 text-left font-display text-xl font-bold tabular-nums text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4 transition-colors select-none active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-11 sm:min-h-0 hover:text-primary";

const MOBILE_QUERY = "(max-width: 639px)";

function subscribeMobile(onChange: () => void) {
	const mql = window.matchMedia(MOBILE_QUERY);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile() {
	return useSyncExternalStore(
		subscribeMobile,
		() => window.matchMedia(MOBILE_QUERY).matches,
		() => false,
	);
}

/** Arrastar para baixo além disso fecha o sheet. */
const DRAG_CLOSE_PX = 80;

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
}: {
	triggerText: string;
	triggerLabel: string;
	title: ReactNode;
	subtitle: string;
	trigger?: ReactNode;
	triggerClassName?: string;
	children: ReactNode;
}) {
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);
	const [dragY, setDragY] = useState(0);
	const dragStart = useRef<number | null>(null);
	const triggerClass = triggerClassName ?? numberTrigger;
	const triggerBody = trigger ?? triggerText;

	if (!isMobile) {
		return (
			<Popover>
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

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		dragStart.current = e.clientY;
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (dragStart.current === null) return;
		setDragY(Math.max(0, e.clientY - dragStart.current));
	};
	const onPointerEnd = () => {
		if (dragStart.current === null) return;
		dragStart.current = null;
		if (dragY > DRAG_CLOSE_PX) setOpen(false);
		setDragY(0);
	};

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
			<Dialog
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					if (!next) setDragY(0);
				}}
			>
				<DialogContent
					showCloseButton={false}
					style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
					className={cn(
						"top-auto bottom-0 left-0 max-h-[85dvh] max-w-full translate-x-0 translate-y-0 gap-3 overflow-y-auto rounded-b-none rounded-t-2xl px-4 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))] data-open:slide-in-from-bottom-4 data-open:zoom-in-100 data-closed:zoom-out-100",
						dragY === 0 && "transition-transform duration-150",
					)}
				>
					<div
						className="-mx-4 -mt-2 flex h-8 cursor-grab touch-none items-center justify-center select-none"
						onPointerDown={onPointerDown}
						onPointerMove={onPointerMove}
						onPointerUp={onPointerEnd}
						onPointerCancel={onPointerEnd}
						aria-hidden="true"
					>
						<span className="h-1 w-10 rounded-full bg-muted-foreground/40" />
					</div>
					<div>
						<DialogTitle className="font-semibold text-foreground">
							{title}
						</DialogTitle>
						<DialogDescription className="text-xs">
							{subtitle}
						</DialogDescription>
					</div>
					{children}
				</DialogContent>
			</Dialog>
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
