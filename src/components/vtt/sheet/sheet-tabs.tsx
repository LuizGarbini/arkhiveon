import { type KeyboardEvent, type ReactNode, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SheetTab {
	id: string;
	label: string;
	count?: number;
	icon?: ReactNode;
}

export function sheetTabId(prefix: string, id: string) {
	return `${prefix}-tab-${id}`;
}

export function sheetPanelId(prefix: string, id: string) {
	return `${prefix}-panel-${id}`;
}

/**
 * Abas sublinhadas da ficha da mesa (sem pílulas coloridas). Teclado: setas,
 * Home e End movem o foco e a aba junto (padrão WAI-ARIA).
 */
export function SheetTabs({
	tabs,
	value,
	onChange,
	idPrefix,
}: {
	tabs: readonly SheetTab[];
	value: string;
	onChange: (id: string) => void;
	idPrefix: string;
}) {
	const listRef = useRef<HTMLDivElement>(null);

	const move = (event: KeyboardEvent<HTMLDivElement>) => {
		const index = tabs.findIndex((tab) => tab.id === value);
		let next = index;
		if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
		else if (event.key === "ArrowLeft")
			next = (index - 1 + tabs.length) % tabs.length;
		else if (event.key === "Home") next = 0;
		else if (event.key === "End") next = tabs.length - 1;
		else return;
		event.preventDefault();
		const target = tabs[next];
		onChange(target.id);
		listRef.current
			?.querySelector<HTMLElement>(`#${sheetTabId(idPrefix, target.id)}`)
			?.focus();
	};

	return (
		<div
			ref={listRef}
			role="tablist"
			aria-label="Seções da ficha"
			onKeyDown={move}
			className="flex gap-1 overflow-x-auto rounded-xl border border-white/[0.07] bg-black/30 p-1 shadow-[inset_0_1px_0_oklch(1_0_0/0.03)]"
		>
			{tabs.map((tab) => {
				const active = tab.id === value;
				return (
					<button
						key={tab.id}
						id={sheetTabId(idPrefix, tab.id)}
						type="button"
						role="tab"
						aria-selected={active}
						aria-controls={sheetPanelId(idPrefix, tab.id)}
						tabIndex={active ? 0 : -1}
						onClick={() => onChange(tab.id)}
						className={cn(
							"group relative flex min-h-9 [@media(pointer:coarse)]:min-h-11 flex-1 shrink-0 cursor-pointer select-none items-center justify-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
							active
								? "bg-linear-to-b from-card-elevated to-card text-foreground shadow-[0_2px_10px_oklch(0_0_0/0.45),inset_0_1px_0_oklch(1_0_0/0.1)] ring-1 ring-primary/35"
								: "text-muted-foreground [@media(hover:hover)]:hover:bg-white/[0.04] [@media(hover:hover)]:hover:text-foreground",
						)}
					>
						{tab.icon ? (
							<span
								aria-hidden
								className={cn(
									"transition-colors",
									active
										? "text-primary"
										: "text-muted-foreground/75 group-hover:text-foreground",
								)}
							>
								{tab.icon}
							</span>
						) : null}
						{tab.label}
						{tab.count ? (
							<span className="rounded-md border border-white/[0.08] bg-black/35 px-1.5 py-px font-mono text-[10.5px] font-medium tabular-nums">
								{tab.count}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
