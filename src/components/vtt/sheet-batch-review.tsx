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

function dedupeRejected(rows: SheetBatchReviewRow[]): SheetBatchReviewRow[] {
	const seen = new Set<string>();
	const out: SheetBatchReviewRow[] = [];
	for (const row of rows) {
		if (!row.reason || seen.has(row.field)) continue;
		seen.add(row.field);
		out.push(row);
	}
	return out;
}

function batchTitle(changes: number, rejected: number): string {
	const changesLabel = changes === 1 ? "1 alteração" : `${changes} alterações`;
	if (rejected === 0) return changesLabel;
	const rejectedLabel =
		rejected === 1 ? "1 campo rejeitado" : `${rejected} campos rejeitados`;
	return `${changesLabel} · ${rejectedLabel}`;
}

export function SheetBatchReview({
	characterName,
	rows,
	phase,
	highlighted = false,
	error,
	fill = false,
	onApply,
	onCancel,
	onUndo,
}: {
	characterName: string;
	rows: SheetBatchReviewRow[];
	phase: SheetBatchPhase;
	highlighted?: boolean;
	error?: string;
	/** O card preenche o vão do painel (a lista rola e o rodapé fica visível). */
	fill?: boolean;
	onApply: () => void;
	onCancel: () => void;
	onUndo: () => void;
}) {
	const rejected = dedupeRejected(rows);
	const accepted = rows.filter((row) => !row.reason);
	const total = accepted.length;
	const many = total > 10;
	const showApplied = phase === "applied" && !error;
	const applying = phase === "applying" && !error;
	const fullscreen = !fill && (phase === "ready" || phase === "applying");
	const blocked = rejected.length > 0 || total === 0;
	const groups = SHEET_SECTIONS.flatMap((section) => {
		const inSection = accepted.filter((row) => row.section === section);
		return inSection.length ? [{ section, rows: inSection }] : [];
	});
	const title = batchTitle(total, rejected.length);

	return (
		<div
			data-phase={phase}
			className={cn(
				"flex flex-col bg-card text-card-foreground",
				fill && "h-full min-h-0 flex-1 overflow-hidden",
				many && !fill && "max-h-96 overflow-hidden",
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
			{rejected.length > 0 ? (
				<ul
					data-slot="sheet-batch-rejections"
					className="m-0 shrink-0 list-none px-2.5 pb-1"
				>
					{rejected.map((row) => (
						<li
							key={row.field}
							data-field={row.field}
							className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1 py-1.5 text-sm"
						>
							<span className="font-semibold text-foreground">{row.label}</span>
							<span className="text-xs text-destructive">{row.reason}</span>
						</li>
					))}
				</ul>
			) : null}
			<div
				data-slot="sheet-batch-list"
				className={cn(
					"min-h-0 px-2.5 pb-2",
					(many || fill) && "flex-1 overflow-y-auto overscroll-contain",
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
										highlighted && showApplied ? "true" : "false"
									}
									className={cn(
										"flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1 py-1.5 text-sm transition-colors duration-150 ease-out",
										highlighted && showApplied && "bg-primary/15",
									)}
								>
									<span className="font-semibold text-foreground">
										{row.label}
									</span>
									<span className="text-muted-foreground line-through tabular-nums">
										{row.before}
									</span>
									<span className="sr-only">para</span>
									<span className="text-foreground tabular-nums">
										{row.after}
									</span>
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
				{showApplied ? (
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
							disabled={applying}
							onClick={onCancel}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							className="min-h-11 flex-1"
							disabled={blocked || applying}
							onClick={onApply}
						>
							{applying ? "Aplicando…" : "Aplicar"}
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}
