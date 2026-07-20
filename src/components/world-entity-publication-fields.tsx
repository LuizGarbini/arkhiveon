import type {
	Control,
	FieldValues,
	Path,
	UseFormSetValue,
} from "react-hook-form";
import { useWatch } from "react-hook-form";
import { PublicationScopeFields } from "@/components/publication-scope-fields";
import { useIsWorldStaff } from "@/lib/store";
import type {
	EntityVisibility,
	PublicationScope,
} from "@/lib/worldbuilding/visibility";

type PublicationFieldValues = FieldValues & {
	publicationScope: PublicationScope;
	visibility: EntityVisibility;
	campaignIds: string[];
};

interface WorldEntityPublicationFieldsProps<T extends PublicationFieldValues> {
	control: Control<T>;
	setValue: UseFormSetValue<T>;
}

export function WorldEntityPublicationFields<T extends PublicationFieldValues>({
	control,
	setValue,
}: WorldEntityPublicationFieldsProps<T>) {
	const isStaff = useIsWorldStaff();
	const publicationScope = useWatch({
		control,
		name: "publicationScope" as Path<T>,
	}) as PublicationScope;
	const visibility = useWatch({
		control,
		name: "visibility" as Path<T>,
	}) as EntityVisibility;
	const campaignIds = (useWatch({
		control,
		name: "campaignIds" as Path<T>,
	}) ?? []) as string[];

	if (!isStaff) return null;

	return (
		<PublicationScopeFields
			publicationScope={publicationScope ?? "restricted"}
			visibility={visibility ?? "public"}
			campaignIds={campaignIds}
			onPublicationScopeChange={(value) => {
				setValue("publicationScope" as Path<T>, value as T[Path<T>], {
					shouldDirty: true,
				});
				if (value === "global") {
					setValue("campaignIds" as Path<T>, [] as T[Path<T>], {
						shouldDirty: true,
					});
				}
			}}
			onVisibilityChange={(value) =>
				setValue("visibility" as Path<T>, value as T[Path<T>], {
					shouldDirty: true,
				})
			}
			onCampaignIdsChange={(ids) =>
				setValue("campaignIds" as Path<T>, ids as T[Path<T>], {
					shouldDirty: true,
				})
			}
		/>
	);
}
