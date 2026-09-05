import { Field, FormSection } from "@/components/ui/form-tabs";
import { Textarea } from "@/components/ui/textarea";
import type { SystemConfig } from "@/lib/systems";
import type { CharacterRegister } from "../types";
import { CustomFieldsRenderer } from "./custom-fields-renderer";

export function NotesFields({
	register,
	config,
}: {
	register: CharacterRegister;
	config: SystemConfig;
}) {
	return (
		<FormSection title="Notas Livres">
			<CustomFieldsRenderer
				register={register}
				config={config}
				section="notes"
			/>
			<Field label="Anotações do jogador">
				<Textarea
					rows={8}
					placeholder="Pistas, planos, segredos, lembretes..."
					{...register("notes")}
				/>
			</Field>
		</FormSection>
	);
}
