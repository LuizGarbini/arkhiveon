import { Camera, Maximize2 } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ImageViewer } from "./image-viewer";

/**
 * Gatilho sobre o retrato de uma entidade (ficha, NPC, item…) que abre a
 * imagem em tela cheia para todo mundo. Quem pode editar ganha "Trocar imagem"
 * dentro do visualizador. Sem `src` (sem imagem ou privada), não há gatilho.
 * `overlay` (padrão) cobre o retrato; o pai precisa ser `relative`.
 * `corner` é um botão ícone com tooltip para cards: sempre visível, não
 * propaga o clique (o card continua abrindo a página pelo Link irmão).
 */
export function EntityImageViewer({
	src,
	name,
	canEdit = false,
	onEdit,
	className,
	variant = "overlay",
}: {
	src?: string;
	name: string;
	canEdit?: boolean;
	onEdit?: () => void;
	className?: string;
	variant?: "overlay" | "corner";
}) {
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	const editAfterClose = useRef(false);

	if (!src) return null;

	const label = name.trim() || "Sem nome";

	return (
		<>
			{variant === "corner" ? (
				<Tooltip>
					<TooltipTrigger
						render={
							<button
								ref={triggerRef}
								type="button"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									setOpen(true);
								}}
								aria-label={`Ver imagem de ${label} em tela cheia`}
								aria-haspopup="dialog"
								className={cn(
									"relative flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background/80 text-muted-foreground backdrop-blur transition-colors after:absolute after:-inset-[10px] after:content-[''] hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
									className,
								)}
							/>
						}
					>
						<Maximize2 className="h-3.5 w-3.5" aria-hidden />
					</TooltipTrigger>
					<TooltipContent>Ver em tela cheia</TooltipContent>
				</Tooltip>
			) : (
				<button
					ref={triggerRef}
					type="button"
					onClick={() => setOpen(true)}
					aria-label={`Ver imagem de ${label} em tela cheia`}
					aria-haspopup="dialog"
					className={cn(
						"absolute inset-0 flex min-h-[44px] min-w-[44px] cursor-pointer select-none items-center justify-center bg-black/0 text-white opacity-0 transition duration-150 hover:bg-black/50 hover:opacity-100 focus-visible:bg-black/50 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
						className,
					)}
				>
					<Maximize2 className="h-5 w-5 drop-shadow" aria-hidden />
				</button>
			)}
			<ImageViewer
				open={open}
				onOpenChange={setOpen}
				src={src}
				alt={label}
				title={label}
				finalFocus={triggerRef}
				onOpenChangeComplete={(isOpen) => {
					if (isOpen || !editAfterClose.current) return;
					editAfterClose.current = false;
					// O dialog de edição devolve o foco ao elemento focado quando abriu.
					triggerRef.current?.focus({ preventScroll: true });
					onEdit?.();
				}}
				actions={
					canEdit && onEdit ? (
						<Button
							type="button"
							variant="outline"
							className="h-[44px] gap-2 rounded-full bg-card/80 backdrop-blur-md"
							onClick={() => {
								editAfterClose.current = true;
								setOpen(false);
							}}
						>
							<Camera className="h-4 w-4" />
							Trocar imagem
						</Button>
					) : undefined
				}
			/>
		</>
	);
}
