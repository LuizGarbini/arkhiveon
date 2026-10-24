import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Contêiner do skeleton do painel: um único pulse (`.dashboard-skeleton`),
 * visível só depois de 300 ms e parado com prefers-reduced-motion.
 * As barras dentro dele não animam sozinhas.
 */
export function DashboardSkeletonGroup({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			aria-hidden="true"
			data-dashboard-skeleton=""
			className={cn("dashboard-skeleton", className)}
		>
			{children}
		</div>
	);
}

/**
 * Barra na linha do texto que ela substitui: a caixa tem a altura da linha
 * (`1lh` da fonte passada em `textClassName`), a barra fica centrada nela.
 */
export function SkeletonLine({
	textClassName,
	className,
}: {
	textClassName: string;
	className?: string;
}) {
	return (
		<span className={cn("flex h-[1lh] items-center", textClassName)}>
			<Skeleton className={cn("h-[0.7em] rounded-sm", className)} />
		</span>
	);
}

/**
 * Cabeçalho de seção no carregamento: ícone e título reais (rótulos fixos),
 * só o contador e o link viram barra — mesma altura do cabeçalho carregado.
 */
export function DashboardSectionHeaderSkeleton({
	icon,
	iconClassName,
	title,
	actionClassName = "w-16",
}: {
	icon: ReactNode;
	iconClassName: string;
	title: string;
	/** Largura do link real à direita, para o título quebrar igual. */
	actionClassName?: string;
}) {
	return (
		<div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
			<div className="flex items-center gap-2.5">
				<div
					className={cn(
						"flex h-8 w-8 items-center justify-center rounded-lg border",
						iconClassName,
					)}
				>
					{icon}
				</div>
				<div>
					<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
						{title}
					</h2>
				</div>
			</div>
			<DashboardSkeletonGroup className="flex items-center gap-2">
				<Skeleton className="h-[19px] w-16 rounded-full" />
				<SkeletonLine textClassName="text-[11px]" className={actionClassName} />
			</DashboardSkeletonGroup>
		</div>
	);
}
