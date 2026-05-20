import { Download, Image as ImageIcon, Palette, Stamp } from "lucide-react";
import { useId, useState } from "react";
import type {
	CharacterSheetPdfOptions,
	CharacterSheetPdfVariant,
} from "@/components/character-sheet-pdf";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import type { Character } from "@/lib/store";

interface CharacterExportDialogProps {
	character: Character;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CharacterExportDialog({
	character,
	open,
	onOpenChange,
}: CharacterExportDialogProps) {
	const [variant, setVariant] = useState<CharacterSheetPdfVariant>("color");
	const [includeImage, setIncludeImage] = useState(false);
	const [includeAppLogo, setIncludeAppLogo] = useState(true);
	const [isExporting, setIsExporting] = useState(false);
	const variantSelectId = useId();

	const hasImage = !!character.imageUrl;

	async function handleExport() {
		const options: CharacterSheetPdfOptions = {
			variant,
			includeImage: includeImage && hasImage,
			includeAppLogo,
		};
		setIsExporting(true);
		try {
			const { downloadCharacterSheetPdf } = await import(
				"@/components/character-sheet-pdf"
			);
			await downloadCharacterSheetPdf(character, options);
			onOpenChange(false);
		} catch (error) {
			window.alert(
				error instanceof Error
					? error.message
					: "Nao foi possivel exportar a ficha em PDF.",
			);
		} finally {
			setIsExporting(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="font-display text-lg">
						Exportar ficha
					</DialogTitle>
					<DialogDescription>
						Escolha como a ficha deve sair no PDF antes de baixar.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<label
						htmlFor={variantSelectId}
						className="grid gap-2 text-[13px] font-medium text-foreground"
					>
						<span className="flex items-center gap-2">
							<Palette className="h-4 w-4 text-primary" />
							Versao
						</span>
						<Select
							id={variantSelectId}
							value={variant}
							onChange={(event) =>
								setVariant(event.target.value as CharacterSheetPdfVariant)
							}
							disabled={isExporting}
						>
							<option value="color">Colorida</option>
							<option value="blackAndWhite">Preto e branco</option>
						</Select>
					</label>

					<label className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-4 text-[13px]">
						<input
							type="checkbox"
							checked={includeImage && hasImage}
							onChange={(event) => setIncludeImage(event.target.checked)}
							disabled={!hasImage || isExporting}
							className="mt-0.5 h-4 w-4 accent-primary"
						/>
						<span>
							<span className="flex items-center gap-2 font-semibold text-foreground">
								<ImageIcon className="h-4 w-4 text-primary" />
								Incluir imagem do personagem
							</span>
							<span className="mt-1 block text-muted-foreground">
								{hasImage
									? "A imagem aparece no cabecalho da ficha."
									: "Este personagem ainda nao tem imagem cadastrada."}
							</span>
						</span>
					</label>

					<label className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-4 text-[13px]">
						<input
							type="checkbox"
							checked={includeAppLogo}
							onChange={(event) => setIncludeAppLogo(event.target.checked)}
							disabled={isExporting}
							className="mt-0.5 h-4 w-4 accent-primary"
						/>
						<span>
							<span className="flex items-center gap-2 font-semibold text-foreground">
								<Stamp className="h-4 w-4 text-primary" />
								Incluir marca do Arkhiveon
							</span>
							<span className="mt-1 block text-muted-foreground">
								A marca fica discreta no cabecalho e no rodape. Pode ser
								removida para fichas mais neutras.
							</span>
						</span>
					</label>
				</div>

				<DialogFooter>
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isExporting}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						onClick={handleExport}
						disabled={isExporting}
						className="gap-2"
					>
						<Download className="h-4 w-4" />
						{isExporting ? "Exportando..." : "Baixar PDF"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
