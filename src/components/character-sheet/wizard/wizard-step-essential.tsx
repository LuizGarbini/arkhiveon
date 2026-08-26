import type { FieldErrors } from "react-hook-form";
import { IdentityFields, SystemFields } from "../fields";
import type {
	CharacterControl,
	CharacterFormValues,
	CharacterRegister,
	CharacterSetValue,
} from "../types";

export function WizardStepEssential({
	register,
	control,
	setValue,
	errors,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	errors?: FieldErrors<CharacterFormValues>;
}) {
	return (
		<div className="space-y-6">
			<div className="border-b border-border/40 pb-4">
				<h2 className="text-lg font-bold text-foreground">
					Identidade & Informações Fundamentais
				</h2>
				<p className="text-xs text-muted-foreground">
					Preencha o nome do personagem, raça, classe e escolha ou gere um
					avatar temático.
				</p>
			</div>

			<SystemFields register={register} />
			<IdentityFields
				register={register}
				control={control}
				setValue={setValue}
				errors={errors}
			/>
		</div>
	);
}
