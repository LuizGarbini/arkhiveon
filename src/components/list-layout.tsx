import { Check, ChevronDown, Filter, RotateCcw, Search, X } from "lucide-react";
import { useState } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PAGE_SEARCH_SHORTCUT_ARIA } from "@/lib/keyboard-shortcuts";
import { useShortcutViewport } from "@/lib/use-shortcut-viewport";
import { cn } from "@/lib/utils";

export interface FilterOption {
	value: string;
	label: string;
	icon?: string;
}

export interface FilterGroup {
	id: string;
	label: string;
	options: FilterOption[];
}

interface ListLayoutProps {
	onSearch?: (query: string) => void;
	searchPlaceholder?: string;
	filterGroups?: FilterGroup[];
	activeFilters?: Record<string, string>;
	onFilterChange?: (filterId: string, value: string) => void;
	onClearFilters?: () => void;
	children?: React.ReactNode;
}

export function ListLayout({
	onSearch,
	searchPlaceholder = "Buscar no Arkhiveon…",
	filterGroups,
	activeFilters = {},
	onFilterChange,
	onClearFilters,
	children,
}: ListLayoutProps) {
	const supportsShortcuts = useShortcutViewport();
	const [isOpen, setIsOpen] = useState(false);

	const activeCount = Object.values(activeFilters).filter(
		(v) => Boolean(v) && v !== "all" && v !== "",
	).length;

	const hasFiltersAvailable =
		Boolean(filterGroups && filterGroups.length > 0) || Boolean(children);

	return (
		<div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/80 p-3 shadow-sm shadow-black/5 backdrop-blur-sm transition-all">
			<div className="flex items-center gap-3">
				<div className="relative flex-1 group">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" />
					<input
						type="search"
						aria-label="Filtrar lista atual"
						aria-keyshortcuts={
							supportsShortcuts ? PAGE_SEARCH_SHORTCUT_ARIA : undefined
						}
						data-shortcut-target="page-search"
						placeholder={searchPlaceholder}
						onChange={(e) => onSearch?.(e.target.value)}
						className="h-10 w-full rounded-2xl border border-border/70 bg-background/55 pl-9 pr-12 text-[13px] text-foreground shadow-sm shadow-black/5 transition-[border-color,box-shadow,background-color] duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] placeholder:text-muted-foreground/70 hover:border-border-hover/70 focus:border-primary/45 focus:bg-background/75 focus:outline-none focus:ring-2 focus:ring-primary/15"
					/>
					<kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none items-center rounded border border-border/70 bg-muted/50 px-1.5 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground md:inline-flex">
						Alt S
					</kbd>
				</div>

				<button
					type="button"
					onClick={() => setIsOpen((prev) => !prev)}
					className={cn(
						"flex h-10 items-center gap-2 rounded-2xl border px-3.5 text-[12px] font-semibold transition-all cursor-pointer select-none",
						isOpen || activeCount > 0
							? "border-primary/50 bg-primary/15 text-primary shadow-xs ring-1 ring-primary/20"
							: "border-border/70 bg-background/55 text-muted-foreground hover:border-primary/30 hover:bg-primary/8 hover:text-foreground active:scale-[0.98]",
					)}
				>
					<Filter className="h-3.5 w-3.5" />
					<span>Filtros</span>
					{activeCount > 0 && (
						<span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-extrabold text-primary-foreground">
							{activeCount}
						</span>
					)}
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
							isOpen && "rotate-180 text-primary",
						)}
					/>
				</button>
			</div>

			{/* Painel Expansível de Filtros */}
			{isOpen && (
				<div className="space-y-3 rounded-xl border border-border/50 bg-background/40 p-4 transition-all animate-in fade-in slide-in-from-top-2 duration-200">
					{filterGroups && filterGroups.length > 0 && (
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
							{filterGroups.map((group) => (
								<FilterGroupDropdown
									key={group.id}
									group={group}
									activeValue={activeFilters[group.id] || "all"}
									onChange={(val) => onFilterChange?.(group.id, val)}
								/>
							))}
						</div>
					)}

					{children && <div className="pt-1">{children}</div>}

					<div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs">
						<span className="text-[11px] text-muted-foreground">
							{activeCount > 0
								? `${activeCount} filtro(s) ativo(s)`
								: hasFiltersAvailable
									? "Selecione opções acima para filtrar a lista"
									: "Nenhum filtro adicional disponível para esta lista."}
						</span>

						{activeCount > 0 && onClearFilters && (
							<button
								type="button"
								onClick={onClearFilters}
								className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
							>
								<RotateCcw className="h-3 w-3" />
								Limpar filtros
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

interface FilterGroupDropdownProps {
	group: FilterGroup;
	activeValue: string;
	onChange: (value: string) => void;
}

function FilterGroupDropdown({
	group,
	activeValue,
	onChange,
}: FilterGroupDropdownProps) {
	const [open, setOpen] = useState(false);
	const isGroupActive =
		Boolean(activeValue) && activeValue !== "all" && activeValue !== "";

	const selectedOption = group.options.find((opt) => opt.value === activeValue);

	return (
		<div className="space-y-1.5">
			<div className="flex items-center justify-between">
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
					{group.label}
					{isGroupActive && (
						<span className="h-1.5 w-1.5 rounded-full bg-primary" />
					)}
				</span>
				{isGroupActive && (
					<button
						type="button"
						onClick={() => onChange("all")}
						className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 cursor-pointer transition-colors"
						title="Redefinir este filtro"
					>
						<X className="h-2.5 w-2.5" />
						<span>Limpar</span>
					</button>
				)}
			</div>

			<DropdownMenu open={open} onOpenChange={setOpen}>
				<DropdownMenuTrigger
					className={cn(
						"flex h-10 w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer select-none text-left outline-none",
						isGroupActive
							? "border-primary/50 bg-primary/15 text-primary font-bold ring-1 ring-primary/25 shadow-xs"
							: "border-border/70 bg-background/80 text-foreground hover:border-border-hover/80 hover:bg-card-elevated/40 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20",
					)}
					aria-label={`Filtrar por ${group.label}`}
				>
					<span className="flex items-center gap-1.5 truncate flex-1 min-w-0">
						{selectedOption?.icon && (
							<span className="text-sm shrink-0">{selectedOption.icon}</span>
						)}
						<span className="truncate">
							{selectedOption ? selectedOption.label : `Todos (${group.label})`}
						</span>
					</span>
					<ChevronDown
						className={cn(
							"h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
							open && "rotate-180 text-primary",
						)}
					/>
				</DropdownMenuTrigger>

				<DropdownMenuContent
					align="start"
					sideOffset={6}
					className="w-(--anchor-width) min-w-[220px] max-h-[300px] overflow-y-auto rounded-2xl border border-border/70 bg-card-elevated/95 p-1.5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10"
				>
					<DropdownMenuGroup className="space-y-0.5">
						<DropdownMenuItem
							onClick={() => {
								onChange("all");
								setOpen(false);
							}}
							className={cn(
								"flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors",
								!isGroupActive
									? "bg-primary/15 font-bold text-primary"
									: "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
							)}
						>
							<span className="truncate">Todos ({group.label})</span>
							{!isGroupActive && (
								<Check className="h-3.5 w-3.5 text-primary shrink-0" />
							)}
						</DropdownMenuItem>

						{group.options.map((opt) => {
							const isSelected = activeValue === opt.value;
							return (
								<DropdownMenuItem
									key={opt.value}
									onClick={() => {
										onChange(opt.value);
										setOpen(false);
									}}
									className={cn(
										"flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium cursor-pointer transition-colors",
										isSelected
											? "bg-primary/15 font-bold text-primary"
											: "text-foreground hover:bg-muted/40",
									)}
								>
									<span className="flex items-center gap-2 truncate">
										{opt.icon && (
											<span className="text-sm shrink-0">{opt.icon}</span>
										)}
										<span className="truncate">{opt.label}</span>
									</span>
									{isSelected && (
										<Check className="h-3.5 w-3.5 text-primary shrink-0" />
									)}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuGroup>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
