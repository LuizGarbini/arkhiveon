import { type KeyboardEvent, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SheetTab {
	id: string;
	label: string;
	count?: number;
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
			className="-mx-1 flex gap-1 overflow-x-auto border-b border-border/60 px-1"
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
							"relative flex min-h-11 shrink-0 cursor-pointer select-none items-center gap-1.5 px-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
							active
								? "text-foreground after:absolute after:inset-x-2.5 after:bottom-[-1px] after:h-0.5 after:rounded-full after:bg-primary"
								: "text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
						)}
					>
						{tab.label}
						{tab.count ? (
							<span className="rounded-full bg-muted px-1.5 py-px text-[10.5px] font-semibold tabular-nums">
								{tab.count}
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}
