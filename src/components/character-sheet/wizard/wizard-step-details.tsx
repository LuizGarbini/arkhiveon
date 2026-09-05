import { useState } from "react";
import type { FieldErrors } from "react-hook-form";
import { FormTabs } from "@/components/ui/form-tabs";
import type { SystemConfig } from "@/lib/systems";
import { cn } from "@/lib/utils";
import {
	AbilitiesFields,
	CombatFields,
	FeatsFields,
	InventoryFields,
	MagicFields,
	NotesFields,
	PersonalityFields,
	SanityFields,
	SkillsFields,
} from "../fields";
import type {
	CharacterControl,
	CharacterFormValues,
	CharacterRegister,
	CharacterSetValue,
} from "../types";
import { DETAILS_TABS } from "./types";

export function WizardStepDetails({
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
	const [detailsTab, setDetailsTab] = useState("abilities");
	const [prevIndex, setPrevIndex] = useState(0);
	const [slideDirection, setSlideDirection] = useState<"left" | "right">(
		"left",
	);

	const handleTabChange = (nextTab: string) => {
		const nextIndex = DETAILS_TABS.findIndex((t) => t.id === nextTab);
		if (nextIndex !== -1) {
			setSlideDirection(nextIndex < prevIndex ? "right" : "left");
			setPrevIndex(nextIndex);
		}
		setDetailsTab(nextTab);
	};

	const shouldShowMagic =
		config.showSpells ||
		config.customFields?.some((field) => field.section === "magic");

	return (
		<div className="space-y-6">
			<div className="border-b border-border/40 pb-4">
				<h2 className="text-lg font-bold text-foreground">
					Detalhes Mecânicos & Estatísticas (Opcional)
				</h2>
				<p className="text-xs text-muted-foreground">
					Você pode preencher os atributos e combate agora ou deixar para
					ajustar durante a sessão.
				</p>
				<div className="mt-4">
					<FormTabs
						tabs={DETAILS_TABS}
						value={detailsTab}
						onChange={handleTabChange}
					/>
				</div>
			</div>

			<div
				key={detailsTab}
				className={cn(
					"space-y-6",
					slideDirection === "left" ? "t-tab-slide-left" : "t-tab-slide-right",
				)}
			>
				{detailsTab === "abilities" && (
					<>
						<AbilitiesFields
							register={register}
							control={control}
							setValue={setValue}
							config={config}
						/>
						{config.value.startsWith("dnd") && (
							<SkillsFields control={control} setValue={setValue} />
						)}
					</>
				)}

				{detailsTab === "combat" && (
					<div className="space-y-6">
						<CombatFields
							register={register}
							control={control}
							setValue={setValue}
							config={config}
							errors={errors}
						/>
						{config.showSanity && (
							<SanityFields
								register={register}
								control={control}
								setValue={setValue}
								config={config}
							/>
						)}
						{shouldShowMagic && (
							<MagicFields
								register={register}
								config={config}
								control={control}
								setValue={setValue}
							/>
						)}
						{config.showFeats && (
							<FeatsFields
								register={register}
								config={config}
								control={control}
								setValue={setValue}
							/>
						)}
					</div>
				)}

				{detailsTab === "extra" && (
					<div className="space-y-6">
						<InventoryFields register={register} config={config} />
						<PersonalityFields register={register} config={config} />
						<NotesFields register={register} config={config} />
					</div>
				)}
			</div>
		</div>
	);
}
