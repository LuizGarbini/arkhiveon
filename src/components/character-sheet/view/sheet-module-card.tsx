import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { SheetModuleConfig } from "@/lib/store";

/**
 * Cabeçalho único dos módulos da ficha (F1.3): título `font-display` +
 * "Editar" (≥44px) só para quem pode editar. O conteúdo do módulo não
 * repete o título.
 */
export function SheetModuleCard({
	module,
	canEdit,
	onEdit,
	children,
}: {
	module: SheetModuleConfig;
	canEdit: boolean;
	onEdit: () => void;
	children: ReactNode;
}) {
	const headingId = `sheet-module-${module.id}`;
	return (
		<section
			id={`ficha-${module.kind}`}
			aria-labelledby={headingId}
			data-slot="sheet-module"
			data-module-kind={module.kind}
			className="scroll-mt-3 rounded-2xl border border-border/70 bg-card p-5 shadow-xs md:p-6 max-md:rounded-none max-md:border-x-0 max-md:border-b-0 max-md:border-t max-md:bg-transparent max-md:p-0 max-md:pt-4 max-md:shadow-none"
		>
			<header className="mb-4 flex min-h-[44px] items-center justify-between gap-3">
				<h2
					id={headingId}
					tabIndex={-1}
					className="min-w-0 truncate font-display text-lg font-bold tracking-tight text-foreground"
				>
					{module.title}
				</h2>
				{canEdit && (
					<Button
						type="button"
						variant="ghost"
						size="touch"
						onClick={onEdit}
						aria-label={`Editar ${module.title}`}
						className="-mr-2 min-h-[44px] min-w-[44px] shrink-0 gap-1.5 px-3 text-primary hover:bg-primary/10 hover:text-primary md:rounded-[min(var(--radius-md),10px)]"
					>
						<Pencil className="h-3.5 w-3.5" />
						Editar
					</Button>
				)}
			</header>
			{children}
		</section>
	);
}
