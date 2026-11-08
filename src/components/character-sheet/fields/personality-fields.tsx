import { Crown } from "lucide-react";
import { useId, useState } from "react";
import { useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FormSection } from "@/components/ui/form-tabs";
import { Textarea } from "@/components/ui/textarea";
import { addEntityLink } from "@/lib/entity-links";
import type { Faction } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import { PullFactionDialog } from "../pull-faction-dialog";
import type {
	CharacterControl,
	CharacterRegister,
	CharacterSetValue,
} from "../types";
import { CustomFieldsRenderer } from "./custom-fields-renderer";

function PersonalityBondsPuller({
	control,
	setValue,
}: {
	control: CharacterControl;
	setValue: CharacterSetValue;
}) {
	const [isPullDialogOpen, setIsPullDialogOpen] = useState(false);
	const bondsValue = useWatch({ control, name: "bonds" }) || "";
	const entityLinks = useWatch({ control, name: "entityLinks" }) || [];
	const characterName =
		useWatch({ control, name: "characterName" }) || "Personagem";

	function handleSelectFaction(faction: Faction, note?: string) {
		const label =
			note ||
			(faction.kind === "patron"
				? `Patrono (${faction.patronType || "Grupo"})`
				: "Facção");
		const perkText = faction.perks ? ` — Benefício: ${faction.perks}` : "";
		const addition = `👑 ${faction.name} (${label})${perkText}`;

		const current = (bondsValue || "").trim();
		const updatedBonds = current ? `${current}\n${addition}` : addition;
		setValue("bonds", updatedBonds, {
			shouldDirty: true,
			shouldValidate: true,
		});

		const nextLinks = addEntityLink(entityLinks, {
			entityKind: "faction",
			entityId: faction.id,
			label: faction.name,
			note: label,
		});
		setValue("entityLinks", nextLinks, {
			shouldDirty: true,
			shouldValidate: true,
		});
	}

	return (
		<>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setIsPullDialogOpen(true)}
				className="h-7 text-xs gap-1.5 text-primary hover:text-primary hover:bg-primary/10 px-2 cursor-pointer font-semibold"
			>
				<Crown className="h-3.5 w-3.5 text-amber-400" />
				Puxar Patrono / Facção
			</Button>

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
		</>
	);
}

export function PersonalityFields({
	register,
	config,
	setValue,
	control,
}: {
	register: CharacterRegister;
	config: SystemConfig;
	setValue?: CharacterSetValue;
	control?: CharacterControl;
}) {
	const bondsId = useId();

	return (
		<FormSection title="Personalidade & História">
			<CustomFieldsRenderer
				register={register}
				config={config}
				section="personality"
			/>
			<Field label="Traços de personalidade">
				<Textarea
					rows={2}
					placeholder="Ex: Sempre tem uma piada na ponta da língua."
					{...register("personalityTraits")}
				/>
			</Field>
			<Field label="Ideais">
				<Textarea
					rows={2}
					placeholder="O que motiva moralmente seu personagem?"
					{...register("ideals")}
				/>
			</Field>

			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<label
						htmlFor={bondsId}
						className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
					>
						Vínculos & Conexões
					</label>
					{setValue && control && (
						<PersonalityBondsPuller control={control} setValue={setValue} />
					)}
				</div>
				<Textarea
					id={bondsId}
					rows={3}
					placeholder="Pessoas, patronos, facções, lugares ou coisas importantes."
					{...register("bonds")}
				/>
			</div>

			<Field label="Defeitos / Fraquezas">
				<Textarea
					rows={2}
					placeholder="O que pode causar problemas?"
					{...register("flaws")}
				/>
			</Field>
		</FormSection>
	);
}
