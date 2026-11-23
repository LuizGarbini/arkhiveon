import { LayoutGrid, List } from "lucide-react";
import type { LibraryViewMode } from "@/lib/library/library-view";
import { cn } from "@/lib/utils";

const OPTIONS: {
	id: LibraryViewMode;
	label: string;
	Icon: typeof List;
}[] = [
	{ id: "list", label: "Lista", Icon: List },
	{ id: "grid", label: "Grade", Icon: LayoutGrid },
];

interface LibraryViewToggleProps {
	value: LibraryViewMode;
	onChange: (view: LibraryViewMode) => void;
}

/**
 * Chips Lista/Grade no padrão da Galeria de Imagens (`aria-pressed`).
 * Não é componente novo do DS.
 */
export function LibraryViewToggle({ value, onChange }: LibraryViewToggleProps) {
	return (
		<fieldset className="m-0 flex shrink-0 items-center gap-1.5 border-0 p-0">
			<legend className="sr-only">Modo de visualização</legend>
			{OPTIONS.map((item) => {
				const isOn = value === item.id;
				const Icon = item.Icon;
				return (
					<button
						key={item.id}
						type="button"
						aria-pressed={isOn}
						aria-label={item.label}
						onClick={() => onChange(item.id)}
						className={cn(
							"inline-flex h-[44px] w-[44px] shrink-0 select-none items-center justify-center gap-1.5 rounded-full border text-[12px] font-bold transition-[background-color,border-color,color] duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-10 sm:w-auto sm:px-3.5",
							isOn
								? "border-primary/35 bg-primary/12 text-primary"
								: "border-transparent bg-background/55 text-muted-foreground [@media(hover:hover)]:hover:text-foreground",
						)}
					>
						<Icon className="h-4 w-4" aria-hidden />
						<span className="sr-only sm:not-sr-only">{item.label}</span>
					</button>
				);
			})}
		</fieldset>
	);
}
