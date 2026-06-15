import { X } from "lucide-react";
import {
	EntityImagePicker,
	type EntityImageValue,
} from "@/components/entity-image-picker";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

type EntityImageDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	value: EntityImageValue;
	onChange: (patch: Partial<EntityImageValue>) => void;
	folder: string;
	libraryName?: string;
	campaignId?: string;
	previewShape?: "rounded" | "circle";
};

export function EntityImageDialog({
	open,
	onOpenChange,
	title,
	description,
	value,
	onChange,
	folder,
	libraryName,
	campaignId,
	previewShape = "rounded",
}: EntityImageDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] max-w-3xl! overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="font-display text-xl">{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<EntityImagePicker
					value={value}
					onChange={onChange}
					folder={folder}
					libraryName={libraryName}
					campaignId={campaignId}
					previewShape={previewShape}
				/>

				<div className="flex justify-end gap-2 pt-2">
					<Button
						type="button"
						variant="ghost"
						onClick={() =>
							onChange({
								imageUrl: "",
								imageAssetId: "",
								imageFocusX: 50,
								imageFocusY: 50,
								imageZoom: 1,
							})
						}
					>
						<X className="h-4 w-4" />
						Remover imagem
					</Button>
					<Button type="button" onClick={() => onOpenChange(false)}>
						Concluir
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
