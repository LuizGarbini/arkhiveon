import { Link } from "@tanstack/react-router";
import {
	ChevronRight,
	Crown,
	Sparkles,
	TriangleAlert,
	UsersRound,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
	formatStorageBytes,
	isUsageBad,
	planLabel,
	type StorageContext,
	type StorageLabel,
	shortUsage,
	statusText,
	usageLevel,
	usagePercent,
} from "@/lib/storage/storage-context";
import { cn } from "@/lib/utils";

const rowBase =
	"group relative flex min-h-[44px] w-full items-center gap-2 rounded-lg px-3 text-left outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary/50 [@media(hover:hover)]:hover:bg-muted/50";

/**
 * Opção B (escolhida pelo Luiz): no Convidado Pro, só em 96%, Cheio e Acima,
 * o estado vai para o ícone e o uso aparece sem o denominador, para caber
 * na linha de 213px da V2 r2. Free, Pro e os demais estados seguem o mock.
 */
function isGuestProCrowded(ctx: StorageContext): boolean {
	if (ctx.label !== "guest_pro") return false;
	const level = usageLevel(ctx);
	return level === "95" || level === "100" || level === "over";
}

function compactUsage(ctx: StorageContext): string {
	const unit = ctx.limitBytes >= 1_000_000_000 ? "GB" : "MB";
	return formatStorageBytes(ctx.usedBytes, unit);
}

function PlanIcon({
	label,
	className,
}: {
	label: StorageLabel;
	className?: string;
}) {
	const Icon =
		label === "guest_pro" ? UsersRound : label === "pro" ? Crown : Sparkles;
	return (
		<Icon
			aria-hidden
			className={cn("size-3.5 shrink-0 text-primary", className)}
		/>
	);
}

function consumptionAria(ctx: StorageContext): string {
	const used = isGuestProCrowded(ctx) ? compactUsage(ctx) : shortUsage(ctx);
	const st = statusText(ctx);
	const guest =
		ctx.label === "guest_pro" && ctx.payerName
			? ` do limite do mestre ${ctx.payerName}`
			: "";
	const statusBit = st ? ` ${st}.` : "";
	return `${planLabel(ctx.label)}: ${used} usados${guest}.${statusBit} Abrir consumo.`;
}

function LoadingCard({ isCollapsed }: { isCollapsed: boolean }) {
	if (isCollapsed) {
		return (
			<output
				className={cn(rowBase, "pointer-events-none justify-center px-0")}
				aria-label="Carregando consumo"
				data-card
			>
				<Skeleton className="size-5 rounded-md" />
			</output>
		);
	}
	return (
		<output
			className={cn(
				rowBase,
				"h-[44px] pointer-events-none flex-col items-stretch justify-center gap-1.5 py-2",
			)}
			aria-label="Carregando consumo"
			data-card
		>
			<span className="flex h-5 items-center">
				<Skeleton className="h-4 w-24" />
				<Skeleton className="ml-auto h-3 w-16" />
			</span>
			<Skeleton className="h-1.5 w-full" />
		</output>
	);
}

function ErrorCard({
	isCollapsed,
	onNavigate,
}: {
	isCollapsed: boolean;
	onNavigate?: () => void;
}) {
	if (isCollapsed) {
		return (
			<Link
				to="/consumo"
				onClick={onNavigate}
				className={cn(rowBase, "h-[44px] justify-center px-0")}
				aria-label="Consumo indisponível. Abrir consumo."
				data-card
			>
				<ChevronRight aria-hidden className="size-3.5 text-muted-foreground" />
			</Link>
		);
	}
	return (
		<Link
			to="/consumo"
			onClick={onNavigate}
			className={cn(rowBase, "h-[44px]")}
			aria-label="Consumo indisponível. Abrir consumo."
			data-card
		>
			<span className="text-[12px] font-semibold text-muted-foreground">
				Consumo
			</span>
			<span className="ml-auto text-[12px] text-muted-foreground">
				indisponível
			</span>
			<ChevronRight
				aria-hidden
				className="size-3.5 shrink-0 text-muted-foreground"
			/>
		</Link>
	);
}

interface StorageCardProps {
	context: StorageContext;
	isCollapsed?: boolean;
	onNavigate?: () => void;
}

export function StorageCard({
	context,
	isCollapsed = false,
	onNavigate,
}: StorageCardProps) {
	if (context.status === "loading") {
		return <LoadingCard isCollapsed={isCollapsed} />;
	}
	if (context.status === "error") {
		return <ErrorCard isCollapsed={isCollapsed} onNavigate={onNavigate} />;
	}

	const level = usageLevel(context);
	const crowded = isGuestProCrowded(context);
	const st = statusText(context);
	const bad = isUsageBad(level);
	const barNow = Math.min(
		100,
		usagePercent(context.usedBytes, context.limitBytes),
	);
	const barWidth = Math.min(
		100,
		(context.usedBytes / context.limitBytes) * 100,
	);

	if (isCollapsed) {
		return (
			<Link
				to="/consumo"
				onClick={onNavigate}
				className={cn(rowBase, "h-[44px] justify-center px-0")}
				aria-label={consumptionAria(context)}
				data-card
				title={consumptionAria(context)}
			>
				<span
					data-label
					className={cn(
						"inline-flex size-8 items-center justify-center rounded-md border",
						bad
							? "border-destructive/40 bg-destructive/10 text-destructive"
							: "border-primary/30 bg-primary/10 text-primary",
					)}
				>
					<PlanIcon
						label={context.label}
						className={cn("size-3.5", bad && "text-destructive")}
					/>
				</span>
			</Link>
		);
	}

	return (
		<Link
			to="/consumo"
			onClick={onNavigate}
			className={cn(
				rowBase,
				"h-[44px] flex-col items-stretch justify-center gap-1.5 py-2",
			)}
			aria-label={consumptionAria(context)}
			data-card
		>
			<span
				data-line1
				className="flex h-5 min-w-0 flex-nowrap items-center gap-1.5 leading-5"
			>
				<span
					data-label
					className={cn(
						"inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 text-[10px] font-bold uppercase tracking-[0.1em]",
						bad
							? "border-destructive/40 bg-destructive/10 text-destructive"
							: "border-primary/30 bg-primary/10 text-primary",
					)}
				>
					<PlanIcon
						label={context.label}
						className={cn("size-3", bad && "text-destructive")}
					/>
					{planLabel(context.label)}
				</span>
				{st !== null ? (
					<span
						data-status
						title={st}
						{...(crowded ? { role: "img" as const, "aria-label": st } : {})}
						className={cn(
							"inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-[11px] font-semibold tabular-nums",
							bad ? "text-destructive" : "text-primary",
						)}
					>
						<TriangleAlert aria-hidden className="size-3" />
						{crowded ? null : st}
					</span>
				) : null}
				<span
					data-value
					className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-muted-foreground"
				>
					{crowded ? compactUsage(context) : shortUsage(context)}
				</span>
			</span>
			<span
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={barNow}
				aria-label="Uso do armazenamento"
				className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted"
			>
				<span
					className={cn(
						"h-full rounded-full",
						bad ? "bg-destructive" : "bg-primary",
					)}
					style={{ width: `${barWidth}%` }}
				/>
			</span>
		</Link>
	);
}
