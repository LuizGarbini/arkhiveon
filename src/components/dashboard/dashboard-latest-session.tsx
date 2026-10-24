import { Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Calendar,
	Flame,
	MapPin,
	Plus,
	ScrollText,
	Sparkles,
	Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "@/lib/store/types";
import { DashboardSectionUnavailable } from "./dashboard-load-error";
import {
	DashboardSectionHeaderSkeleton,
	DashboardSkeletonGroup,
	SkeletonLine,
} from "./dashboard-skeleton";

interface DashboardLatestSessionProps {
	lastSession?: Session;
	sessionCount: number;
	isViewer: boolean;
	isLoading?: boolean;
	/** Falha global da carga: estado neutro, sem vazio, CTA ou contagem. */
	isUnavailable?: boolean;
}

export function DashboardLatestSession({
	lastSession,
	sessionCount,
	isViewer,
	isLoading,
	isUnavailable,
}: DashboardLatestSessionProps) {
	if (isUnavailable) {
		return (
			<DashboardSectionUnavailable
				title="Última Sessão & Crônica"
				icon={<ScrollText className="h-4 w-4" />}
			/>
		);
	}

	if (isLoading) {
		return (
			<div
				data-dash-section="latest-session"
				className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
			>
				<DashboardSectionHeaderSkeleton
					icon={<ScrollText className="h-4 w-4" />}
					iconClassName="border-primary/20 bg-primary/10 text-primary"
					title="Última Sessão & Crônica"
				/>
				<DashboardSkeletonGroup className="mt-4 flex flex-col gap-4">
					<div className="h-[66px] sm:h-[45px] space-y-2">
						<SkeletonLine textClassName="text-[11px]" className="w-28" />
						<SkeletonLine textClassName="text-lg" className="w-2/3" />
						<SkeletonLine textClassName="text-[13px]" className="w-full" />
					</div>
					<Skeleton className="h-[17px] w-full" />
					<Skeleton className="h-[41px] w-full rounded-xl" />
				</DashboardSkeletonGroup>
			</div>
		);
	}

	return (
		<div
			data-dash-section="latest-session"
			className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:border-border"
		>
			{/* Section Header */}
			<div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
				<div className="flex items-center gap-2.5">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
						<ScrollText className="h-4 w-4" />
					</div>
					<div>
						<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
							Última Sessão & Crônica
						</h2>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{lastSession && (
						<span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
							Sessão #{lastSession.number || 1}
						</span>
					)}
					<Link
						to="/sessions"
						className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
					>
						Ver todas ({sessionCount})
						<ArrowUpRight className="h-3 w-3" />
					</Link>
				</div>
			</div>

			{/* Main Content */}
			{lastSession ? (
				<div className="mt-4 flex flex-col gap-4">
					<div>
						<div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-muted-foreground">
							{lastSession.date && (
								<span className="inline-flex items-center gap-1">
									<Calendar className="h-3 w-3 text-primary" />
									{lastSession.date}
								</span>
							)}
							{lastSession.inGameDate && (
								<>
									<span>•</span>
									<span className="inline-flex items-center gap-1 font-mono text-primary">
										<Sparkles className="h-3 w-3" />
										Tempo no Jogo: {lastSession.inGameDate}
									</span>
								</>
							)}
							{lastSession.duration && (
								<>
									<span>•</span>
									<span>Duração: {lastSession.duration}</span>
								</>
							)}
						</div>

						<h3 className="font-display mt-2 text-lg font-bold text-foreground">
							<Link
								to="/sessions"
								className="hover:text-primary transition-colors"
							>
								{lastSession.title || `Sessão #${lastSession.number || 1}`}
							</Link>
						</h3>

						<p className="mt-2 text-[13px] leading-relaxed text-muted-foreground line-clamp-3">
							{lastSession.summary ||
								"Nenhum resumo detalhado foi preenchido para esta sessão."}
						</p>
					</div>

					{/* Cliffhanger / Hook Box */}
					{lastSession.cliffhanger && (
						<div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200">
							<div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-amber-300 mb-1">
								<Flame className="h-3.5 w-3.5 text-amber-400" />
								Gancho / Próximos Passos da Aventura
							</div>
							<p className="text-[12px] leading-relaxed text-foreground/90 font-medium">
								{lastSession.cliffhanger}
							</p>
						</div>
					)}

					{/* Metadata Chips: Locations & NPCs */}
					{(lastSession.locationsVisited || lastSession.npcsPresent) && (
						<div className="flex flex-wrap gap-2 text-[11px] pt-1">
							{lastSession.locationsVisited && (
								<span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-0.5 text-muted-foreground">
									<MapPin className="h-3 w-3 text-rose-400" />
									<span className="truncate max-w-[200px]">
										{lastSession.locationsVisited}
									</span>
								</span>
							)}
							{lastSession.npcsPresent && (
								<span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/50 px-2 py-0.5 text-muted-foreground">
									<Users className="h-3 w-3 text-fuchsia-400" />
									<span className="truncate max-w-[200px]">
										{lastSession.npcsPresent}
									</span>
								</span>
							)}
						</div>
					)}

					{/* Footer Link & CTA */}
					<div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs">
						<Link
							to="/sessions"
							className="font-bold text-primary hover:underline inline-flex items-center gap-1"
						>
							Ler diário completo da sessão
							<ArrowUpRight className="h-3.5 w-3.5" />
						</Link>

						{!isViewer && (
							<Link to="/sessions">
								<Button
									size="sm"
									variant="ghost"
									className="h-8 gap-1.5 text-xs"
								>
									<Plus className="h-3 w-3" />
									Nova Sessão
								</Button>
							</Link>
						)}
					</div>
				</div>
			) : (
				<div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center bg-background/30">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
						<ScrollText className="h-5 w-5" />
					</div>
					<p className="text-sm font-bold text-foreground">
						Nenhuma sessão registrada
					</p>
					<p className="mt-1 max-w-xs text-xs text-muted-foreground">
						Inicie o diário de crônicas da campanha para acompanhar o histórico
						da mesa.
					</p>
					{!isViewer && (
						<Link to="/sessions" className="mt-3">
							<Button size="sm" className="gap-1.5 text-xs text-white">
								<Plus className="h-3.5 w-3.5" />
								Registrar 1ª Sessão
							</Button>
						</Link>
					)}
				</div>
			)}
		</div>
	);
}
