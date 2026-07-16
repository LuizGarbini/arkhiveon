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
			<div className="group relative flex flex-col rounded-2xl border border-border/70 bg-card-elevated p-6 space-y-4 shadow-sm shadow-black/5 animate-pulse">
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
		<div className="group relative flex flex-col rounded-2xl border border-border/70 bg-card-elevated p-6 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 active:scale-[0.985] active:translate-y-0">
			{/* Accessible anchor covering the entire card background */}
			<Link
				to="/sessions/$sessionId"
				params={{ sessionId: session.id }}
				search={{ edit: false }}
				className="absolute inset-0 z-0 cursor-pointer"
				aria-label={`Abrir sessão #${session.number}`}
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

			{/* Actions Area */}
			<div className="relative z-10 pointer-events-auto">
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
			</div>

			{/* Content Area */}
			<div className="relative z-10 pointer-events-none flex flex-col gap-4 mt-2">
				<div className="min-w-0 flex-1">
					<h3 className="font-display text-xl font-bold text-foreground group-hover:text-primary transition-colors duration-200">
						{session.title || "Sem título"}
					</h3>
					<div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs text-muted-foreground font-medium">
						{session.date && (
							<span className="flex items-center gap-1.5 rounded-lg bg-black/35 px-2.5 py-0.5 border border-white/5 text-white/70">
								<Calendar className="h-3.5 w-3.5 text-primary" />
								{session.date}
							</span>
						)}
						{session.duration && (
							<span className="flex items-center gap-1.5 rounded-lg bg-black/35 px-2.5 py-0.5 border border-white/5 text-white/70">
								<Clock className="h-3.5 w-3.5 text-primary" />
								{session.duration}
							</span>
						)}
						{session.inGameDate && (
							<span className="flex items-center gap-1.5 rounded-lg bg-amber-500/5 px-2.5 py-0.5 border border-amber-500/20 text-amber-300">
								{session.inGameDate}
							</span>
						)}
						{session.mood && (
							<span className="rounded-lg bg-black/35 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/60 border border-white/5">
								{session.mood}
							</span>
						)}
					</div>
				</div>

				<div className="rounded-xl bg-black/25 p-4 border border-white/5">
					<div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
						<ScrollText className="h-3.5 w-3.5 text-primary" />
						Resumo da Crônica
					</div>
					<p className="font-display text-xs leading-relaxed text-foreground/90 whitespace-pre-line">
						{session.summary || "Nenhum resumo registrado."}
					</p>
				</div>

				{session.attendees && (
					<div className="flex items-center gap-2 text-xs text-muted-foreground/80 pl-0.5">
						<Users className="h-3.5 w-3.5 text-primary" />
						<span>
							Participantes:{" "}
							<span className="text-foreground font-medium">
								{session.attendees}
							</span>
						</span>
					</div>
				)}

				{session.entityLinks?.length > 0 && (
					<div className="border-t border-border/60 pt-3 pl-0.5 flex items-center justify-between text-xs font-bold text-primary">
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
					<p className="line-clamp-2 border-t border-border/60 pt-3 text-xs italic text-amber-300/80 leading-relaxed pl-0.5">
						"{session.cliffhanger}"
					</p>
				)}
			</div>
		</div>
	);
}
