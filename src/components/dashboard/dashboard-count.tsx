import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
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
			<Popover>
				<PopoverTrigger
					render={
						<button
							type="button"
							aria-label={`${label}: ${DASHBOARD_COUNT_ERROR_HINT}. Ver detalhes`}
							// O número fica dentro de um link: o toque abre o aviso sem navegar.
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
							}}
							className="-m-2 inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md align-middle outline-none focus-visible:ring-2 focus-visible:ring-ring"
						/>
					}
				>
					<span aria-hidden="true">—</span>
				</PopoverTrigger>
				<PopoverContent
					side="bottom"
					className="w-56 gap-1 p-3 text-xs"
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
					}}
				>
					<PopoverTitle className="text-xs">
						{DASHBOARD_COUNT_ERROR_HINT}
					</PopoverTitle>
					<PopoverDescription className="text-xs">
						Os {label} não carregaram. Recarregue a página para tentar de novo.
					</PopoverDescription>
				</PopoverContent>
			</Popover>
		);
	}

	return <>{value}</>;
}
