import type { FieldErrors } from "react-hook-form";
import type { SheetModuleKind } from "@/lib/store";
import type { SystemConfig } from "@/lib/systems";
import type {
	CharacterControl,
	CharacterFormValues,
	CharacterRegister,
	CharacterSetValue,
} from "../types";
import { AbilitiesFields } from "./abilities-fields";
import { CombatFields } from "./combat-fields";
import { FeatsFields } from "./feats-fields";
import { IdentityFields } from "./identity-fields";
import { InventoryFields } from "./inventory-fields";
import { MagicFields } from "./magic-fields";
import { NotesFields } from "./notes-fields";
import { PersonalityFields } from "./personality-fields";
import { SanityFields } from "./sanity-fields";
import { SkillsFields } from "./skills-fields";

export function CharacterModuleFields({
	kind,
	register,
	control,
	setValue,
	config,
	errors,
}: {
	kind: SheetModuleKind;
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
	errors?: FieldErrors<CharacterFormValues>;
}) {
	if (kind === "identity") {
		return (
			<IdentityFields
				register={register}
				control={control}
				setValue={setValue}
				errors={errors}
			/>
		);
	}
	if (kind === "abilities") {
		return (
			<AbilitiesFields
				register={register}
				control={control}
				setValue={setValue}
				config={config}
			/>
		);
	}
	if (kind === "combat") {
		return (
			<CombatFields
				register={register}
				control={control}
				setValue={setValue}
				config={config}
				errors={errors}
			/>
		);
	}
	if (kind === "sanity") {
		return (
			<SanityFields
				register={register}
				control={control}
				setValue={setValue}
				config={config}
			/>
		);
	}
	if (kind === "skills") {
		return (
			<SkillsFields
				register={register}
				control={control}
				setValue={setValue}
				config={config}
			/>
		);
	}
	if (kind === "magic") {
		return (
			<MagicFields
				register={register}
				config={config}
				control={control}
				setValue={setValue}
			/>
		);
	}
	if (kind === "feats") {
		return (
			<FeatsFields
				register={register}
				config={config}
				control={control}
				setValue={setValue}
			/>
		);
	}
	if (kind === "inventory") {
		return <InventoryFields register={register} config={config} />;
	}
	if (kind === "personality") {
		return <PersonalityFields register={register} config={config} />;
	}
	if (kind === "notes" || kind === "customText" || kind === "customStats") {
		return <NotesFields register={register} config={config} />;
	}
	return null;
}
