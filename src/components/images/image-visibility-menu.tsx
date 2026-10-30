import {
	DropdownMenuGroup,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
	IMAGE_VISIBILITIES,
	IMAGE_VISIBILITY_LABEL,
	type ImageVisibility,
	isImageVisibility,
} from "@/lib/image-visibility";

/** Itens de menu "Quem vê": o mestre sempre vê, mesmo em "Só o mestre". */
export function ImageVisibilityMenuItems({
	value,
	onChange,
}: {
	value: ImageVisibility;
	onChange: (visibility: ImageVisibility) => void;
}) {
	return (
		<DropdownMenuGroup>
			<DropdownMenuLabel>Quem vê</DropdownMenuLabel>
			<DropdownMenuRadioGroup
				value={value}
				onValueChange={(next) => {
					if (isImageVisibility(next) && next !== value) onChange(next);
				}}
			>
				{IMAGE_VISIBILITIES.map((option) => (
					<DropdownMenuRadioItem key={option} value={option}>
						{IMAGE_VISIBILITY_LABEL[option]}
					</DropdownMenuRadioItem>
				))}
			</DropdownMenuRadioGroup>
		</DropdownMenuGroup>
	);
}
