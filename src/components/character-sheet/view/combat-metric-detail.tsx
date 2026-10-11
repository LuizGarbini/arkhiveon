import type { ComponentType } from "react";
import type { CombatStat, Explanation } from "@/core/rules";
import { ExplanationView, NumberDetail } from "./number-detail";

const cardClass =
	"block w-full rounded-2xl border border-border/70 bg-background/45 p-3 text-left transition-colors duration-150 select-none active:scale-[0.99] hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:border-primary/50 data-[popup-open]:bg-primary/10";

/**
 * CA / Iniciativa no peso do MetricCard. Com item vinculado que mude o número,
 * o card inteiro abre o detalhe (frase + blocos); sem item, fica como antes.
 */
export function CombatMetricCard({
	Icon,
	label,
	value,
	caption,
	stat,
	explanation,
	detailTitle,
	detailSubtitle,
}: {
	Icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	caption?: string;
	stat: CombatStat;
	explanation: Explanation;
	detailTitle: string;
	detailSubtitle: string;
}) {
	const head = (
		<span className="flex items-center justify-between gap-2">
			<span className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
				{label}
			</span>
			<Icon className="h-4 w-4 shrink-0 text-primary" />
		</span>
	);

	if (stat.source !== "items") {
		return (
			<div className="rounded-2xl border border-border/70 bg-background/45 p-3">
				{head}
				<p className="font-display mt-2 text-xl font-bold text-foreground">
					{value}
				</p>
			</div>
		);
	}

	return (
		<NumberDetail
			triggerText={value}
			triggerLabel={`${label} ${value}: ver o porquê`}
			title={detailTitle}
			subtitle={detailSubtitle}
			triggerClassName={cardClass}
			trigger={
				<>
					{head}
					<span className="font-display mt-2 block text-xl font-bold tabular-nums text-foreground underline decoration-dotted decoration-muted-foreground/60 underline-offset-4">
						{value}
					</span>
					{caption && (
						<span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
							{caption}
						</span>
					)}
				</>
			}
		>
			<ExplanationView explanation={explanation} />
		</NumberDetail>
	);
}
