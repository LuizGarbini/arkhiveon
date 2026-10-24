import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DashboardCountStatus = "loading" | "ready" | "error";

interface DashboardCountProps {
	value: number;
	status: DashboardCountStatus;
	/** Nome do registro, usado no rótulo acessível ("Carregando locais"). */
	label: string;
	/** Tamanho do skeleton, igual ao do número que ele substitui. */
	skeletonClassName?: string;
}

export const DASHBOARD_COUNT_ERROR_HINT = "Não foi possível carregar";

export function DashboardCount({
	value,
	status,
	label,
	skeletonClassName,
}: DashboardCountProps) {
	if (status === "loading") {
		return (
			<Skeleton
				role="status"
				aria-label={`Carregando ${label}`}
				className={cn(
					"inline-block h-[1em] w-[1.5ch] align-middle",
					skeletonClassName,
				)}
			/>
		);
	}

	if (status === "error") {
		return (
			<Tooltip>
				<TooltipTrigger
					render={
						<span
							// biome-ignore lint/a11y/noNoninteractiveTabindex: o tooltip precisa abrir pelo teclado
							tabIndex={0}
							className="cursor-help"
						/>
					}
				>
					<span aria-hidden="true">—</span>
					<span className="sr-only">
						{label}: {DASHBOARD_COUNT_ERROR_HINT}
					</span>
				</TooltipTrigger>
				<TooltipContent>{DASHBOARD_COUNT_ERROR_HINT}</TooltipContent>
			</Tooltip>
		);
	}

	return <>{value}</>;
}
