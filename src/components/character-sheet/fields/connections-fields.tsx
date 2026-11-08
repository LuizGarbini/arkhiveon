import { Crown } from "lucide-react";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { EntityLinkManager } from "@/components/entity-links";
import { Button } from "@/components/ui/button";
import { addEntityLink } from "@/lib/entity-links";
import type { Faction } from "@/lib/store";
import { PullFactionDialog } from "../pull-faction-dialog";
import type { CharacterControl, CharacterSetValue } from "../types";

export function ConnectionsFields({
	control,
	setValue,
}: {
	control: CharacterControl;
	setValue: CharacterSetValue;
}) {
	const [isPullDialogOpen, setIsPullDialogOpen] = useState(false);
	const entityLinks = useWatch({ control, name: "entityLinks" }) || [];
	const characterName =
		useWatch({ control, name: "characterName" }) || "Personagem";

	function handleSelectFaction(faction: Faction, note?: string) {
		const nextLinks = addEntityLink(entityLinks, {
			entityKind: "faction",
			entityId: faction.id,
			label: faction.name,
			note: note || (faction.kind === "patron" ? "Patrono do Grupo" : "Aliado"),
		});
		setValue("entityLinks", nextLinks, {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	return (
		<div className="space-y-6">
			<div className="rounded-2xl border border-primary/20 bg-linear-to-r from-primary/10 via-card to-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="space-y-0.5">
					<h3 className="font-display text-sm font-bold text-foreground flex items-center gap-1.5">
						<Crown className="h-4 w-4 text-amber-400" />
						Patronos de Grupo & Facções da Campanha
					</h3>
					<p className="text-xs text-muted-foreground">
						Puxe patronos e facções já cadastrados na plataforma para vincular à
						ficha.
					</p>
				</div>
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => setIsPullDialogOpen(true)}
					className="min-h-[44px] gap-2 border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-bold text-xs shrink-0 cursor-pointer active:scale-[0.98]"
				>
					<Crown className="h-4 w-4 text-amber-400" />
					Puxar Patrono / Facção
				</Button>
			</div>

			<EntityLinkManager
				value={entityLinks}
				onChange={(links) =>
					setValue("entityLinks", links, {
						shouldDirty: true,
						shouldValidate: true,
					})
				}
			/>

			{isPullDialogOpen && (
				<PullFactionDialog
					open={isPullDialogOpen}
					onOpenChange={setIsPullDialogOpen}
					characterName={characterName}
					connectedFactionIds={
						new Set(
							entityLinks
								.filter((l) => l.entityKind === "faction")
								.map((l) => l.entityId),
						)
					}
					onSelectFaction={handleSelectFaction}
				/>
			)}
		</div>
	);
}
