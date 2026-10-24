import { Link } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Footprints,
	Heart,
	Plus,
	Shield,
	User,
	Users,
	Zap,
} from "lucide-react";
import {
	CARD_IGNORES_AVATAR_HOVER,
	EntityImageViewer,
} from "@/components/images/entity-image-viewer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Character } from "@/lib/store/types";
import { cn } from "@/lib/utils";

interface DashboardPartyRosterProps {
	characters: Character[];
	isViewer: boolean;
	isLoading?: boolean;
}

export function DashboardPartyRoster({
	characters,
	isViewer,
	isLoading,
}: DashboardPartyRosterProps) {
	if (isLoading) {
		return (
			<div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
				<div className="flex items-center justify-between gap-3 mb-4">
					<Skeleton className="h-5 w-40" />
					<Skeleton className="h-5 w-20 rounded-full" />
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<Skeleton className="h-28 w-full rounded-xl" />
					<Skeleton className="h-28 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	const displayCharacters = characters.slice(0, 4);

	return (
		<div className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all hover:border-border">
			{/* Section Header */}
			<div className="flex items-center justify-between gap-3 border-b border-border/50 pb-4">
				<div className="flex items-center gap-2.5">
					<div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
						<Users className="h-4 w-4" />
					</div>
					<div>
						<h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
							Grupo de Aventureiros
						</h2>
					</div>
				</div>

				<div className="flex items-center gap-2 select-none">
					<span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary tabular-nums">
						{characters.length} Herói{characters.length === 1 ? "" : "s"}
					</span>
					<Link
						to="/characters"
						className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors inline-flex shrink-0 items-center gap-1 whitespace-nowrap"
					>
						Ver todos
						<ArrowUpRight className="h-3 w-3" />
					</Link>
				</div>
			</div>

			{/* Character Roster Cards */}
			{characters.length > 0 ? (
				<div className="mt-4 space-y-3">
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{displayCharacters.map((char) => {
							const currentHp =
								typeof char.health === "number" ? char.health : 10;
							const maxHp =
								typeof char.healthMax === "number" && char.healthMax > 0
									? char.healthMax
									: 10;
							const hpPercent = Math.min(
								100,
								Math.max(0, Math.round((currentHp / maxHp) * 100)),
							);
							const isLowHp = hpPercent <= 30;

							return (
								<div
									key={char.id}
									className={cn(
										"group t-hover-lift relative flex flex-col justify-between rounded-xl border border-border/60 bg-background/40 p-3.5 hover:border-primary/40 hover:bg-background/60",
										CARD_IGNORES_AVATAR_HOVER,
									)}
								>
									<div>
										<div className="flex items-start gap-3">
											<div className="relative shrink-0">
												<div className="h-10 w-10 overflow-hidden rounded-xl border border-border/70 bg-card">
													{char.imageUrl ? (
														<img
															src={char.imageUrl}
															alt={char.characterName}
															className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
														/>
													) : (
														<div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground text-xs select-none group-hover:text-primary transition-colors">
															{char.characterName?.charAt(0) || "?"}
														</div>
													)}
												</div>
												<EntityImageViewer
													variant="avatar"
													src={char.imageUrl}
													name={char.characterName ?? ""}
													className="rounded-xl"
												/>
											</div>

											<div className="min-w-0 flex-1">
												<div className="flex items-center justify-between gap-1">
													<Link
														to="/characters"
														className="font-bold text-sm text-foreground truncate hover:text-primary transition-colors"
													>
														{char.characterName || "Sem nome"}
													</Link>
													<span className="rounded-md border border-border/60 bg-card px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground shrink-0 select-none">
														Nv. {char.level || 1}
													</span>
												</div>
												<p className="text-[11px] text-muted-foreground truncate">
													{char.class || "Aventureiro"} • {char.race || "Comum"}
												</p>
												{char.playerName && (
													<p className="text-[10px] text-muted-foreground/80 truncate">
														Jogador: {char.playerName}
													</p>
												)}
											</div>
										</div>

										{/* HP Bar */}
										<div className="mt-3">
											<div className="flex items-center justify-between text-[10px] font-semibold mb-1 select-none">
												<span className="flex items-center gap-1 text-muted-foreground">
													<Heart className="h-3 w-3 text-rose-500" />
													PV
												</span>
												<span
													className={cn(
														"font-mono font-bold tabular-nums",
														isLowHp ? "text-rose-400" : "text-emerald-400",
													)}
												>
													{currentHp} / {maxHp}
												</span>
											</div>
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
												<div
													className={cn(
														"h-full transition-all duration-300",
														isLowHp ? "bg-rose-500" : "bg-emerald-500",
													)}
													style={{ width: `${hpPercent}%` }}
												/>
											</div>
										</div>
									</div>

									{/* Quick Vital Badges - CA, Inic, Desl */}
									<div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] select-none">
										<div className="flex flex-wrap items-center gap-2.5">
											<span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
												<Shield className="h-3 w-3 text-primary" />
												CA:{" "}
												<strong className="text-foreground tabular-nums">
													{char.armorClass || 10}
												</strong>
											</span>
											<span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
												<Zap className="h-3 w-3 text-amber-400" />
												Inic:{" "}
												<strong className="text-foreground font-mono tabular-nums">
													{typeof char.initiative === "number"
														? char.initiative >= 0
															? `+${char.initiative}`
															: char.initiative
														: "+0"}
												</strong>
											</span>
											{char.speed && (
												<span className="inline-flex items-center gap-1 font-semibold text-muted-foreground">
													<Footprints className="h-3 w-3 text-sky-400" />
													<strong className="text-foreground tabular-nums">
														{char.speed}m
													</strong>
												</span>
											)}
										</div>

										<Link
											to="/characters"
											className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-0.5"
										>
											Ficha
											<ArrowUpRight className="t-arrow-reveal h-3 w-3" />
										</Link>
									</div>
								</div>
							);
						})}
					</div>

					{characters.length > 4 && (
						<div className="pt-1 text-center">
							<Link
								to="/characters"
								className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
							>
								+ {characters.length - 4} outro
								{characters.length - 4 === 1 ? "" : "s"} herói
								{characters.length - 4 === 1 ? "" : "s"} no grupo
								<ArrowUpRight className="h-3 w-3" />
							</Link>
						</div>
					)}
				</div>
			) : (
				<div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center bg-background/30">
					<div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
						<User className="h-5 w-5" />
					</div>
					<p className="text-sm font-bold text-foreground">
						Nenhum personagem cadastrado
					</p>
					<p className="mt-1 max-w-xs text-xs text-muted-foreground">
						Crie as fichas dos jogadores da mesa para monitorar pontos de vida,
						estatísticas e recursos.
					</p>
					{!isViewer && (
						<Link to="/sheets/new" className="mt-3">
							<Button size="sm" className="gap-1.5 text-xs text-white">
								<Plus className="h-3.5 w-3.5" />
								Criar Primeira Ficha
							</Button>
						</Link>
					)}
				</div>
			)}
		</div>
	);
}
