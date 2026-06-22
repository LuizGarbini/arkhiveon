import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
	Icon: LucideIcon;
	title: string;
	description: string;
	actionLabel?: string;
	actionTo?: string;
	onAction?: () => void;
}

export function EmptyState({
	Icon,
	title,
	description,
	actionLabel,
	actionTo,
	onAction,
}: EmptyStateProps) {
	return (
		<div className="col-span-full">
			<div className="relative flex min-h-56 flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/70 bg-card/55 px-6 py-10 text-center shadow-sm shadow-black/5">
				<div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-linear-to-r from-transparent via-primary/35 to-transparent" />
				<div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[0_14px_35px_-28px_var(--primary)]">
					<Icon className="h-5 w-5" strokeWidth={1.7} />
				</div>
				<h3 className="text-[14px] font-bold text-foreground">{title}</h3>
				<p className="mt-2 max-w-sm text-[12px] leading-relaxed text-muted-foreground">
					{description}
				</p>
				{actionLabel && (
					<div className="mt-5">
						{actionTo ? (
							<Link to={actionTo}>
								<Button size="sm" variant="outline">
									{actionLabel}
								</Button>
							</Link>
						) : (
							<Button size="sm" variant="outline" onClick={onAction}>
								{actionLabel}
							</Button>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
