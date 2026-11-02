import { Button } from "@/components/ui/button";
import { SHEET_SECTIONS } from "@/lib/ai-mesa/sheet-batch";
import { cn } from "@/lib/utils";

export type SheetBatchPhase = "ready" | "applying" | "applied";

export interface SheetBatchReviewRow {
	section: string;
	field: string;
	label: string;
	before?: string;
	after?: string;
	reason?: string;
}

export function SheetBatchReview({
	characterName,
	rows,
	phase,
	highlighted = false,
	error,
	onApply,
	onCancel,
	onUndo,
}: {
	characterName: string;
	rows: SheetBatchReviewRow[];
	phase: SheetBatchPhase;
	highlighted?: boolean;
	error?: string;
	onApply: () => void;
	onCancel: () => void;
	onUndo: () => void;
}) {
	const total = rows.length;
	const many = total > 10;
	const fullscreen = phase === "ready" || phase === "applying";
	const blocked =
		rows.some((row) => row.reason) ||
		rows.every((row) => row.reason) ||
		total === 0;
	const groups = SHEET_SECTIONS.flatMap((section) => {
		const inSection = rows.filter((row) => row.section === section);
		return inSection.length ? [{ section, rows: inSection }] : [];
	});
	const title = total === 1 ? "1 alteração" : `${total} alterações`;

	return (
		<div
			data-phase={phase}
			className={cn(
				"flex flex-col bg-card text-card-foreground",
				many && "max-h-96 overflow-hidden",
				fullscreen &&
					"max-sm:fixed max-sm:inset-0 max-sm:z-[90] max-sm:max-h-none max-sm:bg-popover",
			)}
		>
			<header className="shrink-0 px-3.5 pt-3 pb-1">
				<h2 className="text-sm font-semibold text-foreground tabular-nums">
					{title}
				</h2>
				<p className="truncate text-xs text-muted-foreground">
					{characterName}
				</p>
			</header>
			<div
				data-slot="sheet-batch-list"
				className={cn(
					"min-h-0 px-2.5 pb-2",
					many && "flex-1 overflow-y-auto overscroll-contain",
					fullscreen && "max-sm:flex-1",
				)}
			>
				{groups.map((group) => (
					<section key={group.section} aria-label={group.section}>
						<h3 className="px-1 pt-3 pb-1 text-xs font-semibold text-muted-foreground">
							{group.section}
						</h3>
						<ul className="m-0 list-none p-0">
							{group.rows.map((row, index) => (
								<li
									key={`${row.field}-${index}`}
									data-field={row.field}
									data-highlighted={
										highlighted && !row.reason ? "true" : "false"
									}
									className={cn(
										"flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1 py-1.5 text-sm transition-colors duration-150 ease-out",
										highlighted && !row.reason && "bg-primary/15",
									)}
								>
									<span className="font-semibold text-foreground">
										{row.label}
									</span>
									{row.reason ? (
										<span className="text-xs text-destructive">
											{row.reason}
										</span>
									) : (
										<>
											<span className="text-muted-foreground line-through tabular-nums">
												{row.before}
											</span>
											<span className="sr-only">para</span>
											<span className="text-foreground tabular-nums">
												{row.after}
											</span>
										</>
									)}
								</li>
							))}
						</ul>
					</section>
				))}
			</div>
			<div
				data-slot="sheet-batch-actions"
				className="sticky bottom-0 z-10 shrink-0 border-t border-border/70 bg-popover px-3 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
			>
				{error ? (
					<p role="alert" className="mb-2 text-xs text-destructive">
						{error}
					</p>
				) : null}
				{phase === "applied" ? (
					<div className="flex items-center gap-2">
						<p className="text-xs text-muted-foreground">
							Aplicado. A ficha foi atualizada.
						</p>
						<Button
							type="button"
							variant="ghost"
							className="ml-auto min-h-11"
							onClick={onUndo}
						>
							Desfazer
						</Button>
					</div>
				) : (
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							className="min-h-11 flex-1"
							disabled={phase === "applying"}
							onClick={onCancel}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							className="min-h-11 flex-1"
							disabled={blocked || phase === "applying"}
							onClick={onApply}
						>
							{phase === "applying" ? "Aplicando" : "Aplicar"}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
