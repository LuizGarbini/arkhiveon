import { useWatch } from "react-hook-form";
import { EntityLinkManager } from "../entity-links";
import { Field, FormSection } from "../ui/form-tabs";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { WorldEntityPublicationFields } from "../world-entity-publication-fields";
import type { ItemFormApi } from "./item-form-controls";

interface ItemDescriptionTabProps {
	form: ItemFormApi;
	itemId?: string;
	/** Mostra "Notas antigas" quando o item já tinha texto livre ao abrir. */
	showLegacyNotes: boolean;
}

const checkCard =
	"flex min-h-[44px] cursor-pointer select-none items-center gap-3 rounded-xl border border-border/80 bg-background/50 px-3.5 py-2.5 transition-colors hover:bg-card-elevated hover:border-primary/30";

export function ItemDescriptionTab({
	form,
	itemId,
	showLegacyNotes,
}: ItemDescriptionTabProps) {
	const { register, control, setValue } = form;
	const watched = useWatch({ control });

	return (
		<div className="space-y-7">
			<FormSection title="Descrição">
				<Field label="Descrição / Lore">
					<Textarea
						rows={5}
						placeholder="Forjada nas profundezas de..."
						{...register("description")}
					/>
				</Field>
			</FormSection>

			<FormSection title="Posse e sintonização">
				<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
					<label className={checkCard}>
						<input
							type="checkbox"
							className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
							{...register("requiresAttunement")}
						/>
						<span className="flex flex-col">
							<span className="text-[13px] font-semibold text-foreground">
								Requer sintonização
							</span>
							<span className="text-[11px] text-muted-foreground">
								Necessita vínculo místico para ativar efeitos
							</span>
						</span>
					</label>
					<label className={checkCard}>
						<input
							type="checkbox"
							className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
							{...register("equipped")}
						/>
						<span className="flex flex-col">
							<span className="text-[13px] font-semibold text-foreground">
								Equipado
							</span>
							<span className="text-[11px] text-muted-foreground">
								Em uso ativo por um personagem
							</span>
						</span>
					</label>
					<Field label="Pertence a">
						<Input placeholder="Personagem ou local" {...register("owner")} />
					</Field>
					<Field label="Sintonizado com">
						<Input
							placeholder="Quem está sintonizado"
							{...register("attunedTo")}
						/>
					</Field>
				</div>
			</FormSection>

			<WorldEntityPublicationFields control={control} setValue={setValue} />

			<EntityLinkManager
				value={watched.entityLinks ?? []}
				onChange={(links) =>
					setValue("entityLinks", links, { shouldDirty: true })
				}
				sourceValues={watched as Record<string, unknown>}
				currentEntity={{ entityKind: "item", entityId: itemId }}
			/>

			{showLegacyNotes ? (
				<FormSection
					title="Notas antigas (texto)"
					description="Texto livre de antes do cadastro novo. Continua salvo como está."
				>
					<Field label="Atributos / Efeitos mecânicos">
						<Textarea rows={3} {...register("stats")} />
					</Field>
					<Field label="Propriedades">
						<Input {...register("properties")} />
					</Field>
				</FormSection>
			) : null}
		</div>
	);
}
