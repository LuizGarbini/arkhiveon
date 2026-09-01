import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MapPin, Plus, Skull, Users } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Npc } from "@/lib/store/types";

interface DashboardKeyNpcsProps {
	npcs: Npc[];
	isViewer: boolean;
	isLoading?: boolean;
}

const IMPORTANCE_LABELS: Record<string, { label: string; className: string }> =
	{
		boss: {
			label: "Ameaça Maior / Boss",
			className: "border-rose-500/40 bg-rose-500/15 text-rose-300",
		},
		major: {
			label: "Principal",
			className: "border-amber-500/40 bg-amber-500/15 text-amber-300",
		},
		supporting: {
			label: "Suporte",
			className: "border-primary/40 bg-primary/15 text-primary",
		},
		minor: {
			label: "Secundário",
			className: "border-border/80 bg-muted/60 text-muted-foreground",
		},
		unknown: {
			label: "Figura Notável",
			className: "border-border/80 bg-muted/60 text-muted-foreground",
		},
	};

const DISPOSITION_STYLES: Record<string, { label: string; color: string }> = {
	friendly: {
		label: "Aliado",
		color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
	},
	ally: {
		label: "Aliado",
		color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
	},
	neutral: {
		label: "Neutro",
		color: "text-slate-300 border-slate-500/30 bg-slate-500/10",
	},
	hostile: {
		label: "Hostil",
		color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
	},
	enemy: {
		label: "Inimigo",
		color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
	},
};

export function DashboardKeyNpcs({
	npcs,
	isViewer,
	isLoading,
}: DashboardKeyNpcsProps) {
	const keyNpcs = useMemo(() => {
		// Prioritize Boss, Major, Supporting NPCs
		const filtered = npcs.filter(
			(n) =>
				n.importance === "boss" ||
				n.importance === "major" ||
				n.importance === "supporting",
		);
		return (filtered.length > 0 ? filtered : npcs).slice(0, 4);
	}, [npcs]);

	if (isLoading) {
		return (
			<div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
				<div className="flex items-center justify-between gap-3 mb-4">
					<Skeleton className="h-5 w-36" />
					<Skeleton className="h-5 w-16 rounded-full" />
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<Skeleton className="h-24 w-full rounded-xl" />
					<Skeleton className="h-24 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:border-border">
			{/* Section Header */}
			<div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
				<div className="flex items-center gap-2.5">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-400">
						<Users className="h-4 w-4" />
					</div>
					<div>
						<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
							NPCs Importantes & Ameaças
						</h2>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-fuchsia-300">
						{npcs.length} Registrado{npcs.length === 1 ? "" : "s"}
					</span>
					<Link
						to="/npcs"
						className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
					>
						Ver todos
						<ArrowUpRight className="h-3 w-3" />
					</Link>
				</div>
			</div>

			{/* NPCs Grid */}
			{keyNpcs.length > 0 ? (
				<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
					{keyNpcs.map((npc) => {
						const importanceMeta =
							IMPORTANCE_LABELS[npc.importance] || IMPORTANCE_LABELS.unknown;
						const dispositionKey = npc.disposition?.toLowerCase() || "neutral";
						const dispMeta = DISPOSITION_STYLES[dispositionKey] || {
							label: npc.disposition || "Neutro",
							color: "text-muted-foreground border-border/60 bg-muted/40",
						};

						return (
							<div
								key={npc.id}
								className="group t-hover-lift rounded-xl border border-border/60 bg-background/40 p-3.5 hover:border-fuchsia-500/30 hover:bg-background/60 flex flex-col justify-between"
							>
								<div>
									<div className="flex items-start gap-3">
										<div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border/70 bg-card">
											{npc.imageUrl ? (
												<img
													src={npc.imageUrl}
													alt={npc.name}
													className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
												/>
											) : (
												<div className="flex h-full w-full items-center justify-center font-bold text-fuchsia-400 text-xs select-none">
													{npc.name?.charAt(0) || "?"}
												</div>
											)}
										</div>

										<div className="min-w-0 flex-1">
											<div className="flex items-center justify-between gap-1">
												<Link
													to="/npcs"
													className="font-bold text-sm text-foreground truncate hover:text-primary transition-colors"
												>
													{npc.name}
												</Link>
												{npc.isAlive === false && (
													<span className="rounded-md border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-400 inline-flex items-center gap-0.5">
														<Skull className="h-2.5 w-2.5" />
														Morto
													</span>
												)}
											</div>
											<p className="text-[11px] text-muted-foreground truncate">
												{npc.role || "NPC"} {npc.race ? `• ${npc.race}` : ""}
											</p>
										</div>
									</div>

									{/* Badges */}
									<div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
										<span
											className={`rounded-md border px-2 py-0.5 font-bold uppercase tracking-wider ${importanceMeta.className}`}
										>
											{importanceMeta.label}
										</span>
										<span
											className={`rounded-md border px-2 py-0.5 font-semibold ${dispMeta.color}`}
										>
											{dispMeta.label}
										</span>
										{npc.location && (
											<span className="rounded-md border border-border/60 bg-card px-2 py-0.5 text-muted-foreground inline-flex items-center gap-1">
												<MapPin className="h-2.5 w-2.5 text-rose-400" />
												<span className="truncate max-w-[100px]">
													{npc.location}
												</span>
											</span>
										)}
									</div>
								</div>

								{npc.motivations && (
									<p className="mt-2.5 text-[11px] leading-snug text-muted-foreground/90 line-clamp-2 italic border-t border-border/30 pt-2">
										"{npc.motivations}"
									</p>
								)}
							</div>
						);
					})}
				</div>
			) : (
				<div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center bg-background/30">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-fuchsia-500/10 text-fuchsia-400 mb-2">
						<Users className="h-5 w-5" />
					</div>
					<p className="text-sm font-bold text-foreground">
						Nenhum NPC registrado
					</p>
					<p className="mt-1 max-w-xs text-xs text-muted-foreground">
						Cadastre os aliados, vilões e figuras centrais que movem a história
						do seu mundo.
					</p>
					{!isViewer && (
						<Link to="/npcs" className="mt-3">
							<Button size="sm" variant="outline" className="gap-1.5 text-xs">
								<Plus className="h-3.5 w-3.5" />
								Criar NPC
							</Button>
						</Link>
					)}
				</div>
			)}
		</div>
	);
}
