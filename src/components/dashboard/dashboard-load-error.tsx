import { AlertTriangle, RotateCw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const DASHBOARD_RETRY_LABEL = "Tentar de novo";

interface RetryButtonProps {
	onRetry: () => void;
	className?: string;
}

/** Botão nativo do DS: foco + Enter/Espaço funcionam; 44px de altura no celular. */
export function DashboardRetryButton({ onRetry, className }: RetryButtonProps) {
	return (
		<Button
			type="button"
			variant="outline"
			onClick={onRetry}
			className={cn("min-h-[44px] gap-1.5 text-xs sm:min-h-9", className)}
		>
			<RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
			{DASHBOARD_RETRY_LABEL}
		</Button>
	);
}

/** Aviso único no topo quando a carga inteira da mesa falha. */
export function DashboardLoadErrorNotice({ onRetry }: { onRetry: () => void }) {
	return (
		<section
			role="alert"
			aria-label="Falha ao carregar a mesa"
			className="flex w-full min-w-0 flex-col gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center sm:justify-between"
		>
			<div className="flex min-w-0 items-start gap-3">
				<AlertTriangle
					className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<p className="break-words text-sm font-bold text-foreground">
						Não foi possível carregar os dados da mesa
					</p>
					<p className="mt-0.5 break-words text-xs text-muted-foreground">
						Confira sua conexão e tente de novo. Nada do que já estava salvo foi
						perdido.
					</p>
				</div>
			</div>
			<DashboardRetryButton onRetry={onRetry} className="w-full sm:w-auto" />
		</section>
	);
}

interface SectionUnavailableProps {
	title: string;
	icon: ReactNode;
}

/** Estado neutro de uma seção durante a falha global: sem vazio, sem CTA, sem 0. */
export function DashboardSectionUnavailable({
	title,
	icon,
}: SectionUnavailableProps) {
	return (
		<section
			aria-label={`${title}: indisponível`}
			className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
		>
			<div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
				<div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-background/40 text-muted-foreground">
					{icon}
				</div>
				<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
					{title}
				</h2>
			</div>
			<p className="mt-4 text-xs text-muted-foreground">
				Indisponível até os dados da mesa carregarem.
			</p>
		</section>
	);
}

/** Linha discreta quando só esta seção falhou. */
export function DashboardSectionErrorLine({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<div
			role="alert"
			className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
		>
			<p className="flex items-center gap-2 text-xs text-muted-foreground">
				<AlertTriangle
					className="h-3.5 w-3.5 shrink-0 text-destructive"
					aria-hidden="true"
				/>
				{message}
			</p>
			<DashboardRetryButton onRetry={onRetry} className="sm:h-8" />
		</div>
	);
}
