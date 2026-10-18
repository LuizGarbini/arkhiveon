import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
	title: string;
	description: string;
	Icon: LucideIcon;
	iconColor?: string;
	action?: ReactNode;
	/** Número ou texto curto (ex.: "2 de 6" com busca). */
	count?: number | string;
	eyebrow?: string;
}

export function PageHeader({
	title,
	description,
	Icon,
	iconColor = "text-primary",
	action,
	count,
	eyebrow,
}: PageHeaderProps) {
	return (
		<header className="px-6 py-6 sm:px-8 sm:py-8">
			<div className="relative mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-border/70 bg-linear-to-br from-card via-card/95 to-primary-muted/25 p-6 shadow-xl shadow-black/5 sm:p-8">
				<div className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />
				<div className="pointer-events-none absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-fuchsia-500/5 blur-3xl" />
				<div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
					<div className="min-w-0 max-w-3xl">
						<div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
							<Icon className={`h-3.5 w-3.5 ${iconColor}`} strokeWidth={1.8} />
							<span>{eyebrow ?? "Coleção"}</span>
						</div>
						<div className="mt-4 flex items-center gap-3">
							<h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
								<span className="text-gradient-primary">{title}</span>
							</h1>
							{(typeof count === "number" || typeof count === "string") && (
								<span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-bold tabular-nums text-primary">
									{count}
								</span>
							)}
						</div>
						<p className="mt-3 max-w-2xl text-[14px] leading-6 text-muted-foreground">
							{description}
						</p>
					</div>

					{action && <div className="shrink-0">{action}</div>}
				</div>
			</div>
		</header>
	);
}
