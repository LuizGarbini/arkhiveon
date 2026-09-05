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

export interface ModuleFieldRendererProps {
	register: CharacterRegister;
	control: CharacterControl;
	setValue: CharacterSetValue;
	config: SystemConfig;
	errors?: FieldErrors<CharacterFormValues>;
}

const MODULE_REGISTRY: Record<
	SheetModuleKind,
	React.ComponentType<ModuleFieldRendererProps> | null
> = {
	identity: (props) => (
		<IdentityFields
			register={props.register}
			control={props.control}
			setValue={props.setValue}
			errors={props.errors}
		/>
	),
	abilities: (props) => (
		<AbilitiesFields
			register={props.register}
			control={props.control}
			setValue={props.setValue}
			config={props.config}
		/>
	),
	combat: (props) => (
		<CombatFields
			register={props.register}
			control={props.control}
			setValue={props.setValue}
			config={props.config}
			errors={props.errors}
		/>
	),
	sanity: (props) => (
		<SanityFields
			register={props.register}
			control={props.control}
			setValue={props.setValue}
			config={props.config}
		/>
	),
	skills: (props) => (
		<SkillsFields
			register={props.register}
			control={props.control}
			setValue={props.setValue}
			config={props.config}
		/>
	),
	magic: (props) => (
		<MagicFields
			register={props.register}
			config={props.config}
			control={props.control}
			setValue={props.setValue}
		/>
	),
	feats: (props) => (
		<FeatsFields
			register={props.register}
			config={props.config}
			control={props.control}
			setValue={props.setValue}
		/>
	),
	inventory: (props) => (
		<InventoryFields register={props.register} config={props.config} />
	),
	personality: (props) => (
		<PersonalityFields register={props.register} config={props.config} />
	),
	notes: (props) => (
		<NotesFields register={props.register} config={props.config} />
	),
	customText: null,
	customStats: null,
	custom_template_fields: null,
};

export function CharacterModuleFields({
	kind,
	...props
}: {
	kind: SheetModuleKind;
} & ModuleFieldRendererProps) {
	const Renderer = MODULE_REGISTRY[kind];
	if (!Renderer) {
		return null;
	}

	return <Renderer {...props} />;
}
