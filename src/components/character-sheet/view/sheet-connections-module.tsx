import { Link } from "@tanstack/react-router";
import { Crown, ExternalLink, Flag, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EntityLinkChips } from "@/components/entity-links";
import { Button } from "@/components/ui/button";
import { addEntityLink, removeEntityLink } from "@/lib/entity-links";
import type { Character, EntityLink, Faction } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PullFactionDialog } from "../pull-faction-dialog";

export interface SheetConnectionsModuleProps {
	character: Character;
	onUpdateCharacter: (patch: Partial<Character>) => void;
	canEdit?: boolean;
}

export function SheetConnectionsModule({
	character,
	onUpdateCharacter,
	canEdit = true,
}: SheetConnectionsModuleProps) {
	const factions = useRPGStore((s) => s.factions);
	const [isPullDialogOpen, setIsPullDialogOpen] = useState(false);

	const entityLinks: EntityLink[] = character.entityLinks || [];

	// Separa conexões com facções/patronos das outras conexões
	const { factionLinks, otherLinks } = useMemo(() => {
		const fLinks: Array<{ link: EntityLink; faction?: Faction }> = [];
		const oLinks: EntityLink[] = [];

		for (const link of entityLinks) {
			if (link.entityKind === "faction") {
				const faction = factions.find((f) => f.id === link.entityId);
				fLinks.push({ link, faction });
			} else {
				oLinks.push(link);
			}
		}

		return { factionLinks: fLinks, otherLinks: oLinks };
	}, [entityLinks, factions]);

	function handleRemoveLink(linkId: string) {
		const nextLinks = removeEntityLink(entityLinks, linkId);
		onUpdateCharacter({ entityLinks: nextLinks });
	}

	const hasAnyConnections = entityLinks.length > 0;

	return (
		<div className="space-y-4">
			{/* Botões de Ação no topo */}
			{canEdit && (
				<div className="flex flex-wrap items-center justify-between gap-2 pb-1">
					<span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
						Vínculos da Mesa ({entityLinks.length})
					</span>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setIsPullDialogOpen(true)}
						className="min-h-[38px] gap-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary active:scale-[0.98] font-bold text-xs"
					>
						<Crown className="h-3.5 w-3.5 text-amber-400" />
						Puxar Patrono / Facção
					</Button>
				</div>
			)}

			{/* Patronos e Facções Conectados */}
			{factionLinks.length > 0 && (
				<div className="space-y-2.5">
					{factionLinks.map(({ link, faction }) => {
						const isPatron = faction?.kind === "patron";
						const factionName = faction?.name || link.label || "Facção";
						const note = link.note;

						return (
							<div
								key={link.id}
								className={cn(
									"relative overflow-hidden rounded-xl border p-3.5 transition-all duration-150 backdrop-blur-sm",
									isPatron
										? "border-amber-500/35 bg-linear-to-r from-amber-500/10 via-card to-card"
										: "border-border/70 bg-card-elevated/40 hover:bg-card-elevated/70",
								)}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-start gap-2.5 min-w-0">
										<div
											className={cn(
												"flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border mt-0.5",
												isPatron
													? "border-amber-500/40 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20"
													: "border-primary/30 bg-primary/10 text-primary",
											)}
										>
											{isPatron ? (
												<Crown className="h-4 w-4" />
											) : (
												<Flag className="h-4 w-4" />
											)}
										</div>

										<div className="min-w-0 space-y-1">
											<div className="flex flex-wrap items-center gap-1.5">
												<Link
													to="/factions/$factionId"
													params={{ factionId: link.entityId }}
													search={{ edit: false }}
													className="font-display font-bold text-foreground hover:text-primary hover:underline text-sm truncate flex items-center gap-1"
												>
													{factionName}
													<ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
												</Link>

												<span
													className={cn(
														"text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0",
														isPatron
															? "bg-amber-500/15 border-amber-500/30 text-amber-300"
															: "bg-muted/40 border-border/70 text-muted-foreground",
													)}
												>
													{isPatron
														? `👑 Patrono (${faction?.patronType || "Grupo"})`
														: faction?.kind === "noble_house"
															? "🏰 Casa Nobre"
															: faction?.kind === "guild_order"
																? "⚔️ Ordem / Guilda"
																: faction?.kind === "cult_society"
																	? "👁️ Culto Secreto"
																	: "🚩 Organização"}
												</span>
											</div>

											{note && (
												<p className="text-[11px] font-medium text-primary/90 flex items-center gap-1">
													<span>Vínculo:</span>
													<span className="font-semibold text-foreground">
														{note}
													</span>
												</p>
											)}

											{faction && (faction.leader || faction.seat) && (
												<p className="text-[11px] text-muted-foreground truncate">
													{faction.leader ? `Líder: ${faction.leader}` : ""}
													{faction.leader && faction.seat ? " · " : ""}
													{faction.seat ? `Sede: ${faction.seat}` : ""}
												</p>
											)}
										</div>
									</div>

									{canEdit && (
										<button
											type="button"
											onClick={() => handleRemoveLink(link.id)}
											className="rounded-lg p-1 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
											title="Desvincular da ficha"
											aria-label="Desvincular patrono ou facção"
										>
											<Trash2 className="h-4 w-4" />
										</button>
									)}
								</div>

								{/* Benefícios Concedidos */}
								{faction?.perks && (
									<div className="mt-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2 text-[11px] text-amber-100/90">
										<span className="font-bold text-amber-300">
											🎁 Recursos & Benefícios:{" "}
										</span>
										<span>{faction.perks}</span>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Outras Conexões (NPCs, Locais, Sessões, Itens, Lore) */}
			{otherLinks.length > 0 && (
				<div className="space-y-1.5 pt-1">
					<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						Outras Entidades Conectadas
					</span>
					<EntityLinkChips
						links={otherLinks}
						onRemove={canEdit ? handleRemoveLink : undefined}
					/>
				</div>
			)}

			{/* Estado Vazio Elegante */}
			{!hasAnyConnections && (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card-elevated/30 p-6 text-center space-y-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
						<Crown className="h-5 w-5 text-amber-400" />
					</div>
					<div className="space-y-1">
						<h4 className="font-display text-sm font-bold text-foreground">
							Nenhum patrono ou facção conectado
						</h4>
						<p className="text-xs text-muted-foreground max-w-xs">
							Vincule patronos de grupo, guildas ou organizações da campanha
							para conceder benefícios e enriquecer a narrativa.
						</p>
					</div>
					{canEdit && (
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => setIsPullDialogOpen(true)}
							className="min-h-[44px] gap-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary active:scale-[0.98] font-bold text-xs"
						>
							<Crown className="h-4 w-4 text-amber-400" />
							Puxar Patrono / Facção Cadastrado
						</Button>
					)}
				</div>
			)}

			{/* Dialog de Puxar Patrono / Facção */}
			{isPullDialogOpen && (
				<PullFactionDialog
					open={isPullDialogOpen}
					onOpenChange={setIsPullDialogOpen}
					characterName={character.characterName}
					connectedFactionIds={
						new Set(factionLinks.map((f) => f.link.entityId))
					}
					onSelectFaction={(faction, note) => {
						const nextLinks = addEntityLink(entityLinks, {
							entityKind: "faction",
							entityId: faction.id,
							label: faction.name,
							note,
						});
						onUpdateCharacter({ entityLinks: nextLinks });
					}}
				/>
			)}
		</div>
	);
}
