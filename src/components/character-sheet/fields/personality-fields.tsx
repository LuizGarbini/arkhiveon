import { Field, FormSection } from "@/components/ui/form-tabs";
import { Textarea } from "@/components/ui/textarea";
import type { SystemConfig } from "@/lib/systems";
import type { CharacterRegister } from "../types";
import { CustomFieldsRenderer } from "./custom-fields-renderer";

export function PersonalityFields({
	register,
	config,
}: {
	register: CharacterRegister;
	config: SystemConfig;
}) {
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
			<Field label="Vínculos">
				<Textarea
					rows={2}
					placeholder="Pessoas, lugares ou coisas importantes."
					{...register("bonds")}
				/>
			</Field>
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
