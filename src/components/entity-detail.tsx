import { Pencil } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function DetailSection({
	eyebrow,
	title,
	children,
	onEdit,
}: {
	eyebrow: string;
	title: string;
	children: ReactNode;
	onEdit?: () => void;
}) {
	return (
		<section className="relative rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm shadow-black/5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-[9px] font-bold uppercase tracking-[0.22em] text-primary">
						{eyebrow}
					</p>
					<h2 className="font-display mt-1 text-xl font-bold text-foreground">
						{title}
					</h2>
				</div>
				{onEdit && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={onEdit}
						className="gap-1.5"
					>
						<Pencil className="h-3.5 w-3.5" />
						Editar
					</Button>
				)}
			</div>
			<div className="mt-4">{children}</div>
		</section>
	);
}

export function DetailQuickStat({
	Icon,
	label,
	value,
	color = "text-primary",
}: {
	Icon: ComponentType<{ className?: string }>;
	label: string;
	value: string;
	color?: string;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-3">
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className={cn("truncate font-display text-lg font-bold", color)}>
						{value}
					</p>
					<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
						{label}
					</p>
				</div>
				<Icon className={cn("h-4 w-4 shrink-0", color)} />
			</div>
		</div>
	);
}

export function DetailInfo({
	label,
	value,
	Icon,
}: {
	label: string;
	value?: string | number | boolean | null;
	Icon?: ComponentType<{ className?: string }>;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-3">
			<div className="flex items-center gap-1.5">
				{Icon && <Icon className="h-3 w-3 text-primary" />}
				<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
					{label}
				</p>
			</div>
			<p className="mt-1 text-[13px] font-semibold text-foreground">
				{formatDetailValue(value)}
			</p>
		</div>
	);
}

export function DetailText({
	title,
	value,
	mono = false,
}: {
	title?: string;
	value?: string | null;
	mono?: boolean;
}) {
	return (
		<div className="rounded-2xl border border-border/70 bg-background/45 p-4">
			{title && (
				<p className="text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
					{title}
				</p>
			)}
			<p
				className={cn(
					"whitespace-pre-wrap text-[13px] leading-relaxed text-foreground/90",
					title && "mt-2",
					mono && "font-mono text-[12px]",
				)}
			>
				{value || "Nada registrado ainda."}
			</p>
		</div>
	);
}

export function DetailSkeleton() {
	return (
		<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-6 sm:px-8">
			<div className="rounded-[1.75rem] border border-border/70 bg-card/60 p-6">
				<div className="flex items-start gap-4">
					<Skeleton className="h-16 w-16 rounded-2xl" />
					<div className="flex-1 space-y-3">
						<Skeleton className="h-4 w-32 rounded-full" />
						<Skeleton className="h-8 w-64" />
						<Skeleton className="h-4 w-48" />
					</div>
					<Skeleton className="h-10 w-24 rounded-lg" />
				</div>
				<div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
					{["stat-1", "stat-2", "stat-3", "stat-4"].map((key) => (
						<Skeleton key={key} className="h-16 rounded-2xl" />
					))}
				</div>
			</div>
			<div className="grid gap-5 lg:grid-cols-[1fr_340px]">
				{["detail-1", "detail-2", "detail-3"].map((key) => (
					<Skeleton key={key} className="h-44 rounded-2xl" />
				))}
			</div>
		</div>
	);
}

function formatDetailValue(
	value: string | number | boolean | null | undefined,
) {
	if (typeof value === "boolean") return value ? "Sim" : "Nao";
	if (value === 0) return "0";
	return value || "Nao informado";
}
