import { ImagePlus, UploadCloud, X } from "lucide-react";
import {
	type ChangeEvent,
	type DragEvent,
	useId,
	useRef,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatBytes } from "./image-asset-badges";
import { ICON_TOUCH } from "./image-asset-card";

/**
 * Modal "Enviar imagens" (modelo B). Único caminho de upload da página:
 * CTA do cabeçalho, estado vazio ou arrastar arquivo sobre a página.
 * O soltar acontece aqui dentro — a página não tem mais faixa de dropzone.
 */
export function ImageUploadDialog({
	open,
	onOpenChange,
	files,
	onAddFiles,
	onRemoveFile,
	onSubmit,
	isUploading,
	uploadingName,
	targetName,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	files: File[];
	onAddFiles: (files: File[]) => void;
	onRemoveFile: (index: number) => void;
	onSubmit: () => void;
	isUploading: boolean;
	uploadingName: string | null;
	targetName: string;
}) {
	const inputId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);

	function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
		const picked = event.currentTarget.files;
		if (picked) onAddFiles(Array.from(picked));
		event.currentTarget.value = "";
	}

	function handleDragOver(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		if (!isUploading) setIsDragging(true);
	}

	function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
		if (!event.currentTarget.contains(event.relatedTarget as Node)) {
			setIsDragging(false);
		}
	}

	function handleDrop(event: DragEvent<HTMLLabelElement>) {
		event.preventDefault();
		// Não deixa o soltar chegar no ouvinte da página (evita arquivo duplicado).
		event.stopPropagation();
		setIsDragging(false);
		if (isUploading) return;
		onAddFiles(Array.from(event.dataTransfer.files));
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!isUploading) onOpenChange(next);
			}}
		>
			<DialogContent className="gap-5 sm:max-w-lg">
				<DialogHeader className="flex-row items-start gap-3 pr-8">
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
						<UploadCloud className="h-4.5 w-4.5" />
					</span>
					<span className="flex min-w-0 flex-col gap-1.5">
						<DialogTitle className="font-display text-lg font-bold">
							Enviar imagens
						</DialogTitle>
						<DialogDescription className="text-[12px] leading-relaxed">
							Vão para a biblioteca de {targetName} e ficam prontas para
							reutilizar em fichas, NPCs e na mesa.
						</DialogDescription>
					</span>
				</DialogHeader>

				<label
					htmlFor={isUploading ? undefined : inputId}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
					aria-disabled={isUploading}
					className={cn(
						"flex min-h-44 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/80 bg-background/40 p-5 text-center transition-[border-color,background-color] duration-150",
						!isUploading && "cursor-pointer",
						isDragging && "border-primary/60 bg-primary/10",
					)}
				>
					<input
						ref={inputRef}
						id={inputId}
						type="file"
						accept="image/*"
						multiple
						className="sr-only"
						onChange={handleInputChange}
						disabled={isUploading}
					/>
					<span className="flex h-[44px] w-11 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
						<UploadCloud className="h-5 w-5" />
					</span>
					<span className="font-display text-[15px] font-bold text-foreground">
						{isDragging ? "Solte para adicionar" : "Arraste a imagem aqui"}
					</span>
					<span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
						ou
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="h-[44px] gap-2 sm:h-8"
						disabled={isUploading}
						onClick={(event) => {
							event.preventDefault();
							inputRef.current?.click();
						}}
					>
						<ImagePlus className="h-3.5 w-3.5" />
						Escolher arquivo
					</Button>
					<span className="text-[11px] text-muted-foreground">
						PNG, JPG ou WebP · até 8 MB cada · pode enviar várias
					</span>
				</label>

				{files.length > 0 && (
					<ul
						aria-label="Imagens selecionadas"
						className="max-h-40 space-y-1.5 overflow-y-auto"
					>
						{files.map((file, index) => (
							<li
								key={`${file.name}-${file.size}-${file.lastModified}`}
								className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/70 py-1 pl-3 pr-1"
							>
								<span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
									{file.name}
								</span>
								<span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
									{uploadingName === file.name
										? "Enviando..."
										: formatBytes(file.size)}
								</span>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									className={ICON_TOUCH}
									aria-label={`Tirar ${file.name}`}
									disabled={isUploading}
									onClick={() => onRemoveFile(index)}
								>
									<X className="h-4 w-4" />
								</Button>
							</li>
						))}
					</ul>
				)}

				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						className="h-[44px] sm:h-9"
						disabled={isUploading}
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
					<Button
						type="button"
						className="h-[44px] gap-2 sm:h-9"
						disabled={files.length === 0}
						loading={isUploading}
						loadingText="Enviando..."
						onClick={onSubmit}
					>
						<UploadCloud className="h-3.5 w-3.5" />
						{files.length > 1 ? `Enviar ${files.length}` : "Enviar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
