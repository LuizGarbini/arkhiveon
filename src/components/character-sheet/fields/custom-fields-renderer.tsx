import type { Path } from "react-hook-form";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CharacterSection, SystemConfig } from "@/lib/systems";
import { getCustomFieldPlaceholder } from "../helpers";
import {
	type CharacterControl,
	type CharacterFormValues,
	type CharacterRegister,
	type CharacterSetValue,
	CUSTOM_NUMBER_CONSTRAINTS,
} from "../types";
import { AdjustableNumberField } from "./adjustable-number-field";

export function CustomFieldsRenderer({
	register,
	control,
	setValue,
	config,
	section,
}: {
	register: CharacterRegister;
	control?: CharacterControl;
	setValue?: CharacterSetValue;
	config: SystemConfig;
	section: CharacterSection;
}) {
	const fields = config.customFields?.filter((f) => f.section === section);
	if (!fields || fields.length === 0) return null;

	return (
		<>
			{fields.map((field) => {
				const placeholder = getCustomFieldPlaceholder(field);
				const numberConstraints = CUSTOM_NUMBER_CONSTRAINTS[field.key];

				return (
					<Field key={field.key} label={field.label} hint={field.hint}>
						{field.type === "textarea" ? (
							<Textarea
								rows={3}
								placeholder={placeholder}
								{...register(
									`systemFields.${field.key}` as Path<CharacterFormValues>,
								)}
							/>
						) : field.type === "number" && control && setValue ? (
							<AdjustableNumberField
								name={`systemFields.${field.key}`}
								register={register}
								control={control}
								setValue={setValue}
								min={numberConstraints?.min ?? 0}
								max={numberConstraints?.max ?? 9999}
								placeholder={placeholder}
							/>
						) : (
							<Input
								type={field.type}
								placeholder={placeholder}
								min={
									field.type === "number" ? numberConstraints?.min : undefined
								}
								max={
									field.type === "number" ? numberConstraints?.max : undefined
								}
								{...register(
									`systemFields.${field.key}` as Path<CharacterFormValues>,
									field.type === "number" ? { valueAsNumber: true } : undefined,
								)}
							/>
						)}
					</Field>
				);
			})}
		</>
	);
}
