import { Link } from "@tanstack/react-router";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { EntityLinkChips } from "@/components/entity-links";
import { FactionAvatar } from "@/components/faction-avatar";
import { Button } from "@/components/ui/button";
import { addEntityLink, removeEntityLink } from "@/lib/entity-links";
import type { Character, EntityLink, Faction } from "@/lib/store";
import { useRPGStore } from "@/lib/store";
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
		<div className="space-y-3">
			{/* Cabeçalho de Vínculos (único CTA, sem duplicação) */}
			<div className="flex flex-wrap items-center justify-between gap-2">
				<span className="text-xs text-muted-foreground">
					{hasAnyConnections
						? `${entityLinks.length} vínculo(s) registrado(s)`
						: "Nenhum patrono ou facção vinculado."}
				</span>
				{canEdit && (
					<Button
						type="button"
						size="xs"
						variant="ghost"
						onClick={() => setIsPullDialogOpen(true)}
						className="gap-1 text-xs text-muted-foreground hover:text-foreground"
					>
						<Plus className="h-3.5 w-3.5" />
						Vincular Facção
					</Button>
				)}
			</div>

			{/* Patronos e Facções Conectados */}
			{factionLinks.length > 0 && (
				<ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-background/40">
					{factionLinks.map(({ link, faction }) => {
						const isPatron = faction?.kind === "patron";
						const factionName = faction?.name || link.label || "Facção";
						const note = link.note;
						const kindLabel = isPatron
							? `Patrono · ${faction?.patronType || "Grupo"}`
							: faction?.kind === "noble_house"
								? "Casa Nobre"
								: faction?.kind === "guild_order"
									? "Ordem / Guilda"
									: faction?.kind === "cult_society"
										? "Culto Secreto"
										: "Organização";

						return (
							<li key={link.id} className="p-3.5 space-y-2">
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-start gap-2.5 min-w-0">
										<FactionAvatar
											imageUrl={faction?.imageUrl}
											isPatron={isPatron}
											className="mt-0.5"
										/>

										<div className="min-w-0 space-y-0.5">
											<div className="flex flex-wrap items-baseline gap-2">
												<Link
													to="/factions/$factionId"
													params={{ factionId: link.entityId }}
													search={{ edit: false }}
													className="font-medium text-foreground hover:text-primary hover:underline text-sm truncate inline-flex items-center gap-1"
												>
													{factionName}
													<ExternalLink className="h-3 w-3 opacity-60 shrink-0" />
												</Link>

												<span className="text-xs text-muted-foreground">
													· {kindLabel}
												</span>
											</div>

											{note && (
												<p className="text-xs text-muted-foreground">
													Vínculo:{" "}
													<span className="text-foreground">{note}</span>
												</p>
											)}

											{faction && (faction.leader || faction.seat) && (
												<p className="text-xs text-muted-foreground truncate">
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
											aria-label="Desvincular patrono ou facção"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									)}
								</div>

								{/* Benefícios Concedidos */}
								{faction?.perks && (
									<p className="text-xs text-muted-foreground pl-6">
										<span className="font-medium text-foreground">
											Benefícios:{" "}
										</span>
										{faction.perks}
									</p>
								)}
							</li>
						);
					})}
				</ul>
			)}

			{/* Outras Conexões (NPCs, Locais, Sessões, Itens, Lore) */}
			{otherLinks.length > 0 && (
				<div className="space-y-1.5 pt-1">
					<span className="text-xs font-medium text-muted-foreground">
						Outras Entidades Conectadas
					</span>
					<EntityLinkChips
						links={otherLinks}
						onRemove={canEdit ? handleRemoveLink : undefined}
					/>
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
