import { Link, useNavigate } from "@tanstack/react-router";
import { Calendar, Clock, ScrollText, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Session } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { EntityActions } from "./entity-actions";

interface SessionCardProps {
	session?: Session;
	isLoading?: boolean;
}

export function SessionCard({ session, isLoading }: SessionCardProps) {
	const removeSession = useRPGStore((s) => s.removeSession);
	const navigate = useNavigate();

	if (isLoading || !session) {
		return (
			<div className="group relative flex flex-col rounded-2xl border border-border/70 bg-card-elevated p-6 space-y-4 shadow-sm shadow-black/5">
				{/* Timeline node skeleton */}
				<div className="absolute -left-[49px] sm:-left-[57px] top-6 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-card border border-border/70 shadow-xs ring-4 ring-background">
					<Skeleton className="h-5 w-5 rounded" />
				</div>
				<div className="min-w-0 flex-1 space-y-2">
					<Skeleton className="h-6 w-1/3" />
					<div className="flex gap-2">
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-16" />
					</div>
				</div>
				<div className="rounded-xl bg-background/30 p-4 ring-1 ring-border/50 space-y-2">
					<Skeleton className="h-3 w-12" />
					<Skeleton className="h-3.5 w-full" />
					<Skeleton className="h-3.5 w-3/4" />
				</div>
			</div>
		);
	}

	return (
		<Link
			to="/sessions/$sessionId"
			params={{ sessionId: session.id }}
			search={{ edit: false }}
			className="group relative flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card-elevated p-6 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none"
		>
			<EntityActions
				onEdit={() =>
					void navigate({
						to: "/sessions/$sessionId",
						params: { sessionId: session.id },
						search: { edit: true },
					})
				}
				onDelete={() => removeSession(session.id)}
				entityName={session.title || `Sessão #${session.number}`}
				entityKindLabel="sessao"
			/>

			{/* Timeline node */}
			<div className="absolute -left-[49px] sm:-left-[57px] top-6 flex h-9 w-9 sm:h-11 sm:w-11 flex-col items-center justify-center rounded-xl bg-card border border-border/70 shadow-xs ring-4 ring-background transition-colors group-hover:border-primary/50 group-hover:bg-primary/5">
				<span className="text-[7px] font-bold uppercase tracking-wider text-muted-foreground/60 leading-none">
					Sessão
				</span>
				<span className="font-mono text-[12px] sm:text-[14px] font-bold text-amber-300 leading-none mt-0.5">
					#{session.number}
				</span>
			</div>

			<div className="flex items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors">
						{session.title || "Sem título"}
					</h3>
					<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground font-medium">
						{session.date && (
							<span className="flex items-center gap-1.5 rounded-md bg-background/50 px-2 py-0.5 border border-border/60">
								<Calendar className="h-3.5 w-3.5 text-primary" />
								{session.date}
							</span>
						)}
						{session.duration && (
							<span className="flex items-center gap-1.5 rounded-md bg-background/50 px-2 py-0.5 border border-border/60">
								<Clock className="h-3.5 w-3.5 text-primary" />
								{session.duration}
							</span>
						)}
						{session.inGameDate && (
							<span className="flex items-center gap-1.5 rounded-md bg-amber-500/5 px-2 py-0.5 border border-amber-500/20 text-amber-300">
								{session.inGameDate}
							</span>
						)}
						{session.mood && (
							<span className="rounded-md bg-muted/40 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground border border-border">
								{session.mood}
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="mt-4 rounded-xl bg-background/30 p-4 ring-1 ring-border/50">
				<div className="mb-2 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
					<ScrollText className="h-3.5 w-3.5 text-primary" />
					Resumo da Crônica
				</div>
				<p className="font-display text-[13px] leading-relaxed text-foreground/90 whitespace-pre-line">
					{session.summary || "Nenhum resumo registrado."}
				</p>
			</div>

			{session.attendees && (
				<div className="mt-3.5 flex items-center gap-2 text-[11px] text-muted-foreground/80 pl-1">
					<Users className="h-3.5 w-3.5 text-primary" />
					<span className="font-medium">
						Participantes:{" "}
						<span className="text-foreground">{session.attendees}</span>
					</span>
				</div>
			)}

			{session.entityLinks?.length > 0 && (
				<div className="mt-4 border-t border-border/65 pt-3 pl-1 flex items-center justify-between text-[11px] font-bold text-primary">
					<span>
						{session.entityLinks.length} conex
						{session.entityLinks.length === 1 ? "ão" : "ões"}
					</span>
					<span className="transition-transform group-hover:translate-x-0.5">
						→
					</span>
				</div>
			)}

			{session.cliffhanger && (
				<p className="mt-3.5 line-clamp-2 border-t border-border/60 pt-3 text-[11px] italic text-amber-300/80">
					"{session.cliffhanger}"
				</p>
			)}
		</Link>
	);
}
