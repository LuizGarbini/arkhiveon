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
	/**
	 * Alvo de toque sobreposto: o botão de 44px fica centrado no "—" sem
	 * ocupar espaço na linha (usado onde o rótulo ao lado é apertado).
	 */
	compactTarget?: boolean;
}

export const DASHBOARD_COUNT_ERROR_HINT = "Não foi possível carregar";

export function DashboardCount({
	value,
	status,
	label,
	skeletonClassName,
	compactTarget = false,
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
			<>
				{compactTarget ? <span aria-hidden="true">—</span> : null}
				<Popover>
					<PopoverTrigger
						render={
							<button
								type="button"
								aria-label={`${label}: ${DASHBOARD_COUNT_ERROR_HINT}. Ver detalhes`}
								// O link do card é um irmão sobreposto; o toque só abre o aviso.
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
								}}
								className={cn(
									"z-[2] inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
									compactTarget
										? "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
										: "relative -m-2 align-middle",
								)}
							/>
						}
					>
						{compactTarget ? null : <span aria-hidden="true">—</span>}
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
							Os {label} não carregaram. Recarregue a página para tentar de
							novo.
						</PopoverDescription>
					</PopoverContent>
				</Popover>
			</>
		);
	}

	return <>{value}</>;
}
