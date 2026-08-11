import {
	Activity,
	HeartPulse,
	type LucideIcon,
	Skull,
	TriangleAlert,
} from "lucide-react";
import {
	ROSTER_LIFE_FILTERS,
	type RosterLifeFilter,
	type RosterLifeStatus,
} from "@/lib/roster-status";
import { cn } from "@/lib/utils";

const statusMeta: Record<
	RosterLifeStatus,
	{
		label: string;
		description: string;
		Icon: LucideIcon;
		classes: string;
	}
> = {
	alive: {
		label: "Vivo",
		description: "Em condições de agir",
		Icon: HeartPulse,
		classes: "border-emerald-400/35 bg-emerald-500/15 text-emerald-200",
	},
	wounded: {
		label: "Ferido",
		description: "PV baixo",
		Icon: Activity,
		classes: "border-amber-400/35 bg-amber-500/15 text-amber-200",
	},
	down: {
		label: "Caído",
		description: "0 PV ou fora de combate",
		Icon: TriangleAlert,
		classes: "border-orange-400/35 bg-orange-500/15 text-orange-200",
	},
	dead: {
		label: "Morto",
		description: "Marcado como morto",
		Icon: Skull,
		classes: "border-rose-400/35 bg-rose-500/15 text-rose-200",
	},
};

export function LifeStatusBadge({
	status,
	className,
	size = "sm",
}: {
	status: RosterLifeStatus;
	className?: string;
	size?: "xs" | "sm";
}) {
	const meta = statusMeta[status];
	const Icon = meta.Icon;

	return (
		<span
			className={cn(
				"inline-flex shrink-0 items-center gap-1.5 rounded-lg border font-bold uppercase tracking-[0.14em]",
				size === "xs" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
				meta.classes,
				className,
			)}
			title={meta.description}
		>
			<Icon className={size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5"} />
			{meta.label}
		</span>
	);
}

export function RosterStatusFilter({
	value,
	onChange,
	counts,
	className,
}: {
	value: RosterLifeFilter;
	onChange: (next: RosterLifeFilter) => void;
	counts: Record<RosterLifeFilter, number>;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-card-elevated/60 p-2",
				className,
			)}
		>
			{ROSTER_LIFE_FILTERS.map((filter) => {
				const active = value === filter;
				const label = filter === "all" ? "Todos" : statusMeta[filter].label;
				const Icon = filter === "all" ? HeartPulse : statusMeta[filter].Icon;
				return (
					<button
						key={filter}
						type="button"
						aria-pressed={active}
						onClick={() => onChange(filter)}
						className={cn(
							"inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold transition-colors",
							active
								? "border-primary/35 bg-primary/12 text-primary"
								: "border-transparent text-muted-foreground hover:border-border/70 hover:bg-muted/45 hover:text-foreground",
						)}
					>
						<Icon className="h-3.5 w-3.5" />
						<span>{label}</span>
						<span className="rounded bg-background/55 px-1.5 py-0.5 text-[10px]">
							{counts[filter] ?? 0}
						</span>
					</button>
				);
			})}
		</div>
	);
}
