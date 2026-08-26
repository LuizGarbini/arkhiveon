import { Field, FormSection } from "@/components/ui/form-tabs";
import type { SystemConfig } from "@/lib/systems";
import type {
	CharacterControl,
	CharacterRegister,
	CharacterSetValue,
} from "../types";
import { AdjustableNumberField } from "./adjustable-number-field";
import { CustomFieldsRenderer } from "./custom-fields-renderer";

export function SanityFields({
	register,
	control,
	setValue,
	config,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
}) {
	return (
		<FormSection
			title="Sanidade & Atributos Específicos"
			description="Para Cthulhu, Ordem Paranormal e similares."
		>
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				<CustomFieldsRenderer
					register={register}
					control={control}
					setValue={setValue}
					config={config}
					section="sanity"
				/>
				{config.value === "coc" && (
					<>
						<Field label="Poder (POW)">
							<AdjustableNumberField
								name="power"
								register={register}
								control={control}
								setValue={setValue}
								min={1}
								max={99}
								placeholder="10"
							/>
						</Field>
						<Field label="Tamanho (SIZ)">
							<AdjustableNumberField
								name="size"
								register={register}
								control={control}
								setValue={setValue}
								min={1}
								max={99}
								placeholder="10"
							/>
						</Field>
						<Field label="Educação (EDU)">
							<AdjustableNumberField
								name="education"
								register={register}
								control={control}
								setValue={setValue}
								min={1}
								max={99}
								placeholder="10"
							/>
						</Field>
					</>
				)}
				<Field label="Sanidade Atual">
					<AdjustableNumberField
						name="sanity"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						max={99}
						placeholder="0"
					/>
				</Field>
				<Field label="Sanidade Máxima">
					<AdjustableNumberField
						name="sanityMax"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						max={99}
						placeholder="0"
					/>
				</Field>
			</div>
		</FormSection>
	);
}
