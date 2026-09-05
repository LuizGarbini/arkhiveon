import type { FieldErrors } from "react-hook-form";
import type { RpgSystem } from "@/lib/store";
import { IdentityFields, SystemFields } from "../fields";
import type {
	CharacterControl,
	CharacterFormValues,
	CharacterRegister,
	CharacterSetValue,
} from "../types";
import { OrdemAgentGallery } from "./ordem-agent-gallery";

export function WizardStepEssential({
	register,
	control,
	setValue,
	system,
	errors,
}: {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	system: RpgSystem;
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

			{system === "ordem" && <OrdemAgentGallery setValue={setValue} />}

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
