import { CheckCircle2, CircleAlert, FileText, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadItem } from "@/lib/library/upload-queue";
import { cn } from "@/lib/utils";

interface UploadQueueListProps {
	items: readonly UploadItem[];
	onRetry: (id: string) => void;
	onClearFinished?: () => void;
}

/** Envios em andamento: um item por PDF (na fila / enviando % / ✓ / erro). */
export function UploadQueueList({
	items,
	onRetry,
	onClearFinished,
}: UploadQueueListProps) {
	const count = (status: UploadItem["status"]) =>
		items.filter((item) => item.status === status).length;
	const done = count("done");
	const sending = count("uploading");
	const queued = count("queued");
	const failed = count("error");
	const summary = [
		`${done} de ${items.length} ${items.length === 1 ? "enviado" : "enviados"}`,
		sending > 0 ? `${sending} enviando` : null,
		queued > 0 ? `${queued} na fila` : null,
		failed > 0 ? `${failed} com erro` : null,
	]
		.filter(Boolean)
		.join(" · ");
	return (
		<section
			className="rounded-2xl border border-primary/30 bg-primary/8 p-2"
			aria-label="Envios"
		>
			<div className="flex min-h-9 items-center justify-between gap-3 px-2 text-[12px]">
				<span className="font-semibold text-foreground" aria-live="polite">
					{summary}
				</span>
				{onClearFinished ? (
					<Button
						variant="ghost"
						size="sm"
						className="h-8 select-none text-muted-foreground"
						onClick={onClearFinished}
					>
						Limpar
					</Button>
				) : null}
			</div>
			<ul className="space-y-1">
				{items.map((item) => (
					<UploadQueueRow key={item.id} item={item} onRetry={onRetry} />
				))}
			</ul>
		</section>
	);
}

function UploadQueueRow({
	item,
	onRetry,
}: {
	item: UploadItem;
	onRetry: (id: string) => void;
}) {
	const percent = Math.round(item.progress * 100);
	return (
		<li className="flex min-h-14 items-center gap-3 rounded-xl bg-card/70 px-3 py-2">
			<div
				className={cn(
					"flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
					item.status === "error"
						? "border-destructive/30 bg-destructive/10 text-destructive"
						: "border-primary/20 bg-primary/10 text-primary",
				)}
			>
				{item.status === "done" ? (
					<CheckCircle2 className="h-4 w-4" aria-hidden />
				) : item.status === "error" ? (
					<CircleAlert className="h-4 w-4" aria-hidden />
				) : (
					<FileText className="h-4 w-4" strokeWidth={1.7} aria-hidden />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-center justify-between gap-3 text-[12px]">
					<span className="truncate font-semibold text-foreground">
						{item.name}
					</span>
					<span
						className={cn(
							"shrink-0 tabular-nums",
							item.status === "error"
								? "text-destructive"
								: "text-muted-foreground",
						)}
					>
						{item.status === "queued"
							? "Na fila"
							: item.status === "uploading"
								? `${percent}%`
								: item.status === "done"
									? "Enviado"
									: "Erro"}
					</span>
				</div>
				{item.status === "error" ? (
					<p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
						{item.error}
					</p>
				) : (
					<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
						<div
							className="h-full rounded-full bg-primary transition-[width] duration-200"
							style={{ width: `${percent}%` }}
						/>
					</div>
				)}
			</div>
			{item.status === "error" ? (
				<Button
					variant="outline"
					size="sm"
					className="min-h-11 min-w-11 shrink-0 select-none px-0 active:scale-[0.98] sm:px-3"
					aria-label={`Tentar de novo: ${item.name}`}
					onClick={() => onRetry(item.id)}
				>
					<RotateCcw className="h-3.5 w-3.5 sm:mr-1.5" />
					<span className="hidden sm:inline">Tentar de novo</span>
				</Button>
			) : null}
		</li>
	);
}
