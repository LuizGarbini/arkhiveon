import { Heart, Shield, Sparkles, UserCheck, Zap } from "lucide-react";
import { useRPGStore } from "@/lib/store";
import { formatModifier } from "@/lib/store/helpers";
import { cn } from "@/lib/utils";

export function PartyStatsMatrix() {
	const characters = useRPGStore((state) => state.characters);
	const party = characters;

	if (party.length === 0) {
		return null;
	}

	return (
		<div className="rounded-2xl border border-border/70 bg-card/70 p-5 shadow-sm shadow-black/5 backdrop-blur-sm space-y-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2.5">
					<div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
						<UserCheck className="h-4.5 w-4.5" />
					</div>
					<div>
						<h3 className="font-display text-base font-bold text-foreground">
							Grupo em Números (Matriz de Stats)
						</h3>
						<p className="text-[11px] text-muted-foreground">
							Comparativo rápido de combate e sobrevivência dos aventureiros
						</p>
					</div>
				</div>
				<span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-primary">
					{party.length} Membro(s)
				</span>
			</div>

			<div className="overflow-x-auto rounded-xl border border-border/50 bg-background/40">
				<table className="w-full text-left text-xs">
					<thead className="border-b border-border/60 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						<tr>
							<th className="py-3 px-4">Personagem</th>
							<th className="py-3 px-3">Classe & Nível</th>
							<th className="py-3 px-3 text-center">PV</th>
							<th className="py-3 px-3 text-center">CA</th>
							<th className="py-3 px-3 text-center">Iniciativa</th>
							<th className="py-3 px-3 text-center">Deslocamento</th>
							<th className="py-3 px-4">Efeitos / Bônus Ativos</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-border/40 font-medium">
						{party.map((char) => {
							const hpMax = char.healthMax || 1;
							const hpPercent = Math.min(
								100,
								Math.max(0, Math.round((char.health / hpMax) * 100)),
							);
							const isLowHp = hpPercent <= 30;

							return (
								<tr
									key={char.id}
									className="hover:bg-card/60 transition-colors"
								>
									<td className="py-3 px-4">
										<div className="flex items-center gap-3">
											<div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-card">
												{char.imageUrl ? (
													<img
														src={char.imageUrl}
														alt={char.characterName}
														className="h-full w-full object-cover"
													/>
												) : (
													<div className="flex h-full w-full items-center justify-center font-bold text-muted-foreground text-[10px]">
														{char.characterName?.charAt(0) || "?"}
													</div>
												)}
											</div>
											<div>
												<span className="font-bold text-foreground block">
													{char.characterName || "Sem nome"}
												</span>
												<span className="text-[10px] text-muted-foreground">
													{char.playerName ? `Jogador: ${char.playerName}` : char.race}
												</span>
											</div>
										</div>
									</td>
									<td className="py-3 px-3">
										<span className="font-semibold text-foreground">
											{char.class || "Aventureiro"}
										</span>
										<span className="text-[10px] text-muted-foreground block">
											Nível {char.level || 1}
										</span>
									</td>
									<td className="py-3 px-3 text-center">
										<div className="inline-flex flex-col items-center">
											<span
												className={cn(
													"font-bold font-display text-sm flex items-center gap-1",
													isLowHp ? "text-rose-400 animate-pulse" : "text-emerald-400",
												)}
											>
												<Heart className="h-3 w-3 fill-current" />
												{char.health}/{char.healthMax}
											</span>
											<div className="w-16 h-1 bg-muted rounded-full overflow-hidden mt-1">
												<div
													className={cn(
														"h-full rounded-full transition-all",
														isLowHp ? "bg-rose-500" : "bg-emerald-500",
													)}
													style={{ width: `${hpPercent}%` }}
												/>
											</div>
										</div>
									</td>
									<td className="py-3 px-3 text-center">
										<span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 font-display text-xs font-bold text-blue-400">
											<Shield className="h-3 w-3" />
											{char.armorClass}
										</span>
									</td>
									<td className="py-3 px-3 text-center">
										<span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-display text-xs font-bold text-amber-400">
											<Zap className="h-3 w-3" />
											{formatModifier(char.initiative)}
										</span>
									</td>
									<td className="py-3 px-3 text-center font-mono text-xs text-muted-foreground">
										{char.speed}m
									</td>
									<td className="py-3 px-4">
										{char.tempBonusesList && char.tempBonusesList.length > 0 ? (
											<div className="flex flex-wrap gap-1">
												{char.tempBonusesList.map((bonus) => (
													<span
														key={bonus.id}
														className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300"
														title={bonus.description}
													>
														<Sparkles className="h-2.5 w-2.5" />
														{bonus.title}
													</span>
												))}
											</div>
										) : (
											<span className="text-[11px] text-muted-foreground/60 italic">
												Nenhum bônus temporário
											</span>
										)}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);
}
