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
			<div className="flex flex-col rounded-xl border border-border bg-card-elevated p-4 space-y-4">
				<div className="flex items-start gap-3">
					<Skeleton className="h-12 w-12 rounded-lg shrink-0" />
					<div className="min-w-0 flex-1 space-y-2">
						<Skeleton className="h-5 w-3/4" />
						<div className="flex gap-2">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-3 w-16" />
						</div>
					</div>
				</div>
				<div className="rounded-md bg-background/40 p-3 ring-1 ring-border/60 space-y-2">
					<Skeleton className="h-2 w-12" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-full" />
					<Skeleton className="h-3 w-2/3" />
				</div>
				<div className="flex items-center gap-1.5">
					<Skeleton className="h-3 w-3 rounded-full" />
					<Skeleton className="h-3 w-32" />
				</div>
			</div>
		);
	}

	return (
		<Link
			to="/sessions/$sessionId"
			params={{ sessionId: session.id }}
			search={{ edit: false }}
			className="group relative flex cursor-pointer flex-col rounded-2xl border border-border/70 bg-card-elevated p-4 shadow-sm shadow-black/5 transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-lg hover:shadow-black/5 focus-visible:border-primary/45 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:outline-none"
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
				entityName={session.title || `Sessao #${session.number}`}
				entityKindLabel="sessao"
			/>

			<div className="flex items-start gap-3">
				<div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20">
					<span className="text-[8px] font-semibold uppercase tracking-wider opacity-70">
						Sessao
					</span>
					<span className="font-mono text-[14px] font-bold leading-none">
						#{session.number}
					</span>
				</div>
				<div className="min-w-0 flex-1">
					<h3 className="font-display truncate text-[15px] font-bold text-foreground">
						{session.title || "Sem titulo"}
					</h3>
					<div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
						{session.date && (
							<span className="flex items-center gap-1">
								<Calendar className="h-2.5 w-2.5 text-amber-300" />
								{session.date}
							</span>
						)}
						{session.duration && (
							<span className="flex items-center gap-1">
								<Clock className="h-2.5 w-2.5" />
								{session.duration}
							</span>
						)}
					</div>
					<div className="mt-1.5 flex flex-wrap items-center gap-1">
						{session.mood && (
							<span className="rounded bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground ring-1 ring-border">
								{session.mood}
							</span>
						)}
						{session.inGameDate && (
							<span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/20">
								{session.inGameDate}
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="mt-3 rounded-xl bg-background/45 p-3 ring-1 ring-border/60">
				<div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
					<ScrollText className="h-2.5 w-2.5" />
					Resumo
				</div>
				<p className="font-display text-[12px] leading-relaxed text-foreground/90 line-clamp-5 whitespace-pre-line">
					{session.summary || "Nenhum resumo registrado."}
				</p>
			</div>

			{session.attendees && (
				<div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
					<Users className="h-3 w-3 text-emerald-300" />
					<span className="line-clamp-1">{session.attendees}</span>
				</div>
			)}

			{session.entityLinks?.length > 0 && (
				<div className="mt-3 border-t border-border/60 pt-3">
					<span className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
						{session.entityLinks.length} conexao
						{session.entityLinks.length === 1 ? "" : "es"}
					</span>
				</div>
			)}

			{session.cliffhanger && (
				<p className="mt-2 line-clamp-2 border-t border-border/60 pt-2 text-[10px] italic text-amber-300/80">
					"{session.cliffhanger}"
				</p>
			)}
		</Link>
	);
}
