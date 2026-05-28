import { Filter, Search } from "lucide-react";
import { PAGE_SEARCH_SHORTCUT_ARIA } from "@/lib/keyboard-shortcuts";
import { useShortcutViewport } from "@/lib/use-shortcut-viewport";

interface ListLayoutProps {
	onSearch?: (query: string) => void;
	onAddNew?: () => void;
}

export function ListLayout({ onSearch }: ListLayoutProps) {
	const supportsShortcuts = useShortcutViewport();

	return (
		<div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm shadow-black/5 backdrop-blur-sm">
			<div className="relative flex-1 group">
				<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
				<input
					type="search"
					aria-label="Filtrar lista atual"
					aria-keyshortcuts={
						supportsShortcuts ? PAGE_SEARCH_SHORTCUT_ARIA : undefined
					}
					data-shortcut-target="page-search"
					placeholder="Buscar no Arkhiveon…"
					onChange={(e) => onSearch?.(e.target.value)}
					className="h-10 w-full rounded-2xl border border-border/70 bg-background/55 pl-9 pr-12 text-[13px] text-foreground shadow-sm shadow-black/5 transition-[border-color,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-muted-foreground/70 hover:border-border-hover/70 focus:border-primary/45 focus:bg-background/75 focus:outline-none focus:ring-2 focus:ring-primary/15"
				/>
				<kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground md:inline-flex">
					Alt S
				</kbd>
			</div>

			<button
				type="button"
				className="flex h-10 items-center gap-1.5 rounded-2xl border border-border/70 bg-background/55 px-3 text-[12px] font-semibold text-muted-foreground transition-[border-color,background-color,color,transform] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:border-primary/30 hover:bg-primary/8 hover:text-foreground active:scale-[0.98]"
			>
				<Filter className="h-3.5 w-3.5" />
				Filtros
			</button>
		</div>
	);
}
