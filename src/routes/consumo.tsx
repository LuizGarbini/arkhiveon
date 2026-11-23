import { createFileRoute } from "@tanstack/react-router";
import { selectDashboardDataStatus } from "@/components/dashboard/dashboard-count-status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import {
	isUsageBad,
	usageLevel,
	usageOfLimit,
	usagePercent,
} from "@/lib/storage/storage-context";
import {
	useRetryStorage,
	useStorageContext,
} from "@/lib/storage/use-storage-context";
import { useRPGStore } from "@/lib/store";
import { FREE_CREATION_LIMIT } from "@/lib/store/sync-slice";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/consumo")({
	component: ConsumoRoute,
});

export function ConsumoRoute() {
	const storage = useStorageContext();
	const retryStorage = useRetryStorage();
	const { isPro } = useAuth();
	const usedCreations = useRPGStore((s) => s.globalRecordsCount);
	const recordsStatus = useRPGStore(selectDashboardDataStatus);
	const recordsLoading =
		storage.status === "loading" || recordsStatus === "loading";
	const recordsError = recordsStatus === "error";

	const level = storage.status === "ready" ? usageLevel(storage) : "ok";
	const bad = isUsageBad(level);
	const barNow =
		storage.status === "ready"
			? Math.min(100, usagePercent(storage.usedBytes, storage.limitBytes))
			: 0;
	const barWidth =
		storage.status === "ready"
			? Math.min(100, (storage.usedBytes / storage.limitBytes) * 100)
			: 0;

	return (
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8">
			<h1 className="font-display text-2xl font-bold text-foreground">
				Consumo
			</h1>

			<section className="flex flex-col gap-3">
				<h2 className="text-sm font-semibold text-foreground">Armazenamento</h2>
				{storage.status === "loading" ? (
					<output
						className="flex flex-col gap-2"
						aria-label="Carregando armazenamento"
					>
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-1.5 w-full" />
					</output>
				) : storage.status === "error" ? (
					<div className="flex flex-col gap-3">
						<p className="text-sm text-muted-foreground">
							Consumo indisponível
						</p>
						<Button
							type="button"
							variant="outline"
							size="touch"
							onClick={retryStorage}
						>
							Tentar de novo
						</Button>
					</div>
				) : (
					<>
						<p className="text-sm tabular-nums text-foreground">
							{usageOfLimit(storage)}
						</p>
						<div
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={barNow}
							aria-label="Uso do armazenamento"
							className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
						>
							<div
								className={cn(
									"h-full rounded-full",
									bad ? "bg-destructive" : "bg-primary",
								)}
								style={{ width: `${barWidth}%` }}
							/>
						</div>
					</>
				)}
			</section>

			<section className="flex flex-col gap-2">
				<h2 className="text-sm font-semibold text-foreground">Registros</h2>
				{recordsLoading ? (
					<output aria-label="Carregando registros">
						<Skeleton className="h-5 w-24" />
					</output>
				) : recordsError ? (
					<p className="text-sm text-muted-foreground">
						Registros indisponíveis
					</p>
				) : isPro ? (
					<p className="text-sm text-foreground">sem limite</p>
				) : (
					<p className="text-sm tabular-nums text-foreground">
						{usedCreations} / {FREE_CREATION_LIMIT}
					</p>
				)}
			</section>
		</div>
	);
}
