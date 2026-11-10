import { X } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Faixa de opções da ferramenta ativa (régua, moldes), no topo do mapa e
 * fora da área onde se clica. No celular fica à direita da toolbar e rola na
 * horizontal; no desktop, centralizada.
 */
export function VTTOptionsBar({
	label,
	icon: Icon,
	onClose,
	closeLabel,
	children,
	footer,
	wrapOnPhone = false,
}: {
	label: string;
	icon: ComponentType<{ className?: string }>;
	onClose: () => void;
	closeLabel: string;
	children: ReactNode;
	footer?: ReactNode;
	/** 390 px: quebra em linhas em vez de rolar (os filhos usam `order`). */
	wrapOnPhone?: boolean;
}) {
	return (
		<section
			aria-label={label}
			className="pointer-events-none absolute top-32 right-3 left-[4.75rem] z-40 flex flex-col items-stretch gap-1.5 select-none sm:right-auto sm:left-1/2 sm:max-w-[calc(100%-10rem)] sm:-translate-x-1/2 sm:items-center"
		>
			<div
				className={cn(
					"pointer-events-auto flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden animate-in fade-in slide-in-from-top-1 duration-150",
					wrapOnPhone && "max-sm:flex-wrap max-sm:overflow-visible",
				)}
			>
				<span className="hidden shrink-0 items-center gap-1.5 pr-1 pl-2.5 text-xs font-semibold text-foreground md:flex">
					<Icon className="size-4 text-primary" />
					{label}
				</span>
				{children}
				<button
					type="button"
					onClick={onClose}
					aria-label={closeLabel}
					className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] sm:ml-auto [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
				>
					<X className="size-4" />
				</button>
			</div>
			{footer}
		</section>
	);
}

export function VTTOptionsDivider({ className }: { className?: string }) {
	return (
		<span
			aria-hidden
			className={cn("mx-0.5 h-6 w-px shrink-0 bg-border", className)}
		/>
	);
}

export function VTTSegmented({
	legend,
	children,
	className,
}: {
	legend: string;
	children: ReactNode;
	className?: string;
}) {
	return (
		<fieldset
			className={cn(
				"flex shrink-0 items-center gap-0.5 rounded-xl bg-background/60 p-0.5 ring-1 ring-inset ring-border/70",
				className,
			)}
		>
			<legend className="sr-only">{legend}</legend>
			{children}
		</fieldset>
	);
}

export function segmentClass(active: boolean) {
	return cn(
		"inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-[0.65rem] px-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] touch-manipulation",
		active
			? "bg-primary/15 text-foreground ring-1 ring-inset ring-primary/40"
			: "text-muted-foreground [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
	);
}

/** Atalho de teclado no texto de ajuda. */
export function Kbd({ children }: { children: ReactNode }) {
	return (
		<kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-foreground">
			{children}
		</kbd>
	);
}
