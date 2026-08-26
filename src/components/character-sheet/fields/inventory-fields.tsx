import { Field, FormSection } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SystemConfig } from "@/lib/systems";
import type { CharacterRegister } from "../types";
import { CustomFieldsRenderer } from "./custom-fields-renderer";

export function InventoryFields({
	register,
	config,
}: {
	register: CharacterRegister;
	config: SystemConfig;
}) {
	return (
		<FormSection title="Equipamento">
			<CustomFieldsRenderer
				register={register}
				config={config}
				section="inventory"
			/>
			<Field label="Inventário">
				<Textarea
					rows={4}
					placeholder="Espada longa, escudo, mochila..."
					{...register("equipment")}
				/>
			</Field>
			<Field label="Moedas / Tesouro">
				<Input
					placeholder="Ex: 50 PO, 12 PP, 30 PC"
					{...register("currency")}
				/>
			</Field>
		</FormSection>
	);
}
