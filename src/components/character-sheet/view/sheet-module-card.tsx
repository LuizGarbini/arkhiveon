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
			id={`ficha-${module.id}`}
			aria-labelledby={headingId}
			data-slot="sheet-module"
			data-module-kind={module.kind}
			className="scroll-mt-4 border-t border-border/70 pt-3 first:border-t-0 first:pt-0 target:border-primary/60"
		>
			<header className="mb-2 flex min-h-[44px] items-center justify-between gap-3">
				<h2
					id={headingId}
					tabIndex={-1}
					className="min-w-0 break-words font-display text-xl font-bold tracking-tight text-foreground"
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
						className="-mr-2 min-h-[44px] min-w-[44px] shrink-0 gap-1.5 px-3 text-muted-foreground hover:text-foreground"
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
