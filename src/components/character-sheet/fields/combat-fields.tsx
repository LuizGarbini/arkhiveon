import type { FieldErrors } from "react-hook-form";
import { Field, FormSection } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import type { SystemConfig } from "@/lib/systems";
import type {
	CharacterControl,
	CharacterFormValues,
	CharacterRegister,
	CharacterSetValue,
} from "../types";
import { AdjustableNumberField } from "./adjustable-number-field";
import { CustomFieldsRenderer } from "./custom-fields-renderer";

export function CombatFields({
	register,
	control,
	setValue,
	config,
	errors,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
	errors?: FieldErrors<CharacterFormValues>;
}) {
	return (
		<FormSection title="Status de Combate">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
				<Field label="HP Atual" error={errors?.health?.message}>
					<AdjustableNumberField
						name="health"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="10"
						validate={(val, formVals) => {
							const currentVal = Number(val);
							const maxVal = Number(formVals.healthMax);
							if (
								Number.isFinite(currentVal) &&
								Number.isFinite(maxVal) &&
								currentVal > maxVal
							) {
								return "HP Atual não pode exceder o Máximo";
							}
							return true;
						}}
					/>
				</Field>
				<Field label="HP Máximo" error={errors?.healthMax?.message}>
					<AdjustableNumberField
						name="healthMax"
						register={register}
						control={control}
						setValue={setValue}
						min={1}
						placeholder="10"
						validate={(val, formVals) => {
							const currentVal = Number(formVals.health);
							const maxVal = Number(val);
							if (
								Number.isFinite(currentVal) &&
								Number.isFinite(maxVal) &&
								currentVal > maxVal
							) {
								return "HP Máximo não pode ser menor que o Atual";
							}
							return true;
						}}
					/>
				</Field>
				<Field label="HP Temporário">
					<AdjustableNumberField
						name="tempHealth"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="0"
					/>
				</Field>
				<Field label="CA / Defesa">
					<AdjustableNumberField
						name="armorClass"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="10"
					/>
				</Field>
				<Field label="Iniciativa">
					<AdjustableNumberField
						name="initiative"
						register={register}
						control={control}
						setValue={setValue}
						min={-20}
						max={50}
						placeholder="0"
					/>
				</Field>
				<Field label={`Deslocamento (${config.speedUnit})`}>
					<AdjustableNumberField
						name="speed"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						step="any"
						placeholder="9"
					/>
				</Field>
				<Field label="Bônus de proficiência">
					<AdjustableNumberField
						name="proficiencyBonus"
						register={register}
						control={control}
						setValue={setValue}
						min={0}
						placeholder="2"
					/>
				</Field>
				<Field label="Dados de Vida (Hit Dice)" hint="Ex: 5d8">
					<Input placeholder="5d8" {...register("hitDice")} />
				</Field>
				{config.value.startsWith("dnd") && (
					<>
						<Field label="Testes contra Morte (Sucessos)" hint="0 a 3">
							<AdjustableNumberField
								name="deathSaves.successes"
								register={register}
								control={control}
								setValue={setValue}
								min={0}
								max={3}
								placeholder="0"
							/>
						</Field>
						<Field label="Testes contra Morte (Falhas)" hint="0 a 3">
							<AdjustableNumberField
								name="deathSaves.failures"
								register={register}
								control={control}
								setValue={setValue}
								min={0}
								max={3}
								placeholder="0"
							/>
						</Field>
					</>
				)}
				<CustomFieldsRenderer
					register={register}
					control={control}
					setValue={setValue}
					config={config}
					section="combat"
				/>
			</div>
		</FormSection>
	);
}
