import type { ComponentType, ReactNode } from "react";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * - `tool`: ferramenta do ponteiro (só uma ativa), preenchida.
 * - `toggle`: painel aberto/fechado (Combate, Rolagens, Grid).
 * - `layer`: camada em edição.
 */
type ToolKind = "tool" | "toggle" | "layer";

const stateClass: Record<ToolKind, string> = {
	tool: "bg-primary text-primary-foreground",
	toggle: "bg-accent text-foreground ring-1 ring-inset ring-border",
	layer: "bg-primary/15 text-primary",
};

export function ToolbarButton({
	label,
	tooltip,
	shortcut,
	icon: Icon,
	active,
	kind = "tool",
	disabled = false,
	expanded,
	onClick,
}: {
	label: string;
	tooltip?: string;
	shortcut?: string;
	icon: ComponentType<{ className?: string }>;
	active: boolean;
	kind?: ToolKind;
	disabled?: boolean;
	/** Painéis usam aria-expanded em vez de aria-pressed. */
	expanded?: boolean;
	onClick: () => void;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type="button"
						onClick={() => {
							if (!disabled) onClick();
						}}
						aria-label={label}
						aria-pressed={expanded === undefined ? active : undefined}
						aria-expanded={expanded}
						aria-keyshortcuts={shortcut}
						aria-disabled={disabled ? true : undefined}
						className={cn(
							"relative flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary",
							disabled
								? "cursor-not-allowed text-muted-foreground opacity-45"
								: active
									? cn("cursor-pointer active:scale-[0.98]", stateClass[kind])
									: "cursor-pointer text-muted-foreground active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground",
						)}
					/>
				}
			>
				<Icon className="size-[1.125rem]" />
			</TooltipTrigger>
			<TooltipContent
				side="right"
				sideOffset={10}
				className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium"
			>
				{tooltip ?? label}
				{shortcut && (
					<kbd className="rounded-md border border-border bg-background/70 px-1.5 font-mono text-[10px] text-muted-foreground">
						{shortcut}
					</kbd>
				)}
			</TooltipContent>
		</Tooltip>
	);
}

/** `div` de propósito: a toolbar zera o gap dos filhos `div` em 390 px. */
export function ToolbarGroup({
	children,
	inset = false,
}: {
	children: ReactNode;
	/** Camadas: um bloco rebaixado, para ler como uma escolha só. */
	inset?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex w-full flex-col items-center gap-1",
				inset &&
					"rounded-xl bg-background/60 py-0.5 ring-1 ring-inset ring-border/70",
			)}
		>
			{children}
		</div>
	);
}

export function ToolbarDivider() {
	return <span aria-hidden className="my-0.5 h-px w-7 shrink-0 bg-border" />;
}
