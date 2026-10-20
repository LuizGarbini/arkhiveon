import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { ImageOff, X } from "lucide-react";
import {
	type HTMLAttributes,
	type KeyboardEvent,
	type ReactNode,
	type RefObject,
	useState,
} from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

export interface ImageViewerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Sem `src`, o popup fica vazio (ex.: durante a animação de saída). */
	src?: string;
	alt: string;
	/** Título visível no canto superior esquerdo (vira o `DialogTitle`). */
	title?: string;
	/** Substitui o título no canto superior esquerdo (ex.: contador da galeria). */
	topLeft?: ReactNode;
	/** Ações ao lado do X (ex.: "Trocar imagem"). */
	actions?: ReactNode;
	/** Sobreposto à imagem (ex.: setas da galeria). */
	imageOverlay?: ReactNode;
	/** Rodapé abaixo da imagem (ex.: painel de metadados da galeria). */
	children?: ReactNode;
	/** Remonta a imagem (e zera carregando/erro) quando muda. Padrão: `src`. */
	imageKey?: string;
	onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
	imageAreaProps?: Omit<
		HTMLAttributes<HTMLDivElement>,
		"className" | "children"
	>;
	finalFocus?: RefObject<HTMLElement | null>;
	onOpenChangeComplete?: (open: boolean) => void;
	slot?: string;
}

/**
 * Visualizador de imagem em tela cheia, só apresentação: fundo escuro, imagem
 * ajustada à tela (`object-contain`), X e Esc fecham, alvos de 44 px.
 */
export function ImageViewer({
	open,
	onOpenChange,
	src,
	alt,
	title,
	topLeft,
	actions,
	imageOverlay,
	children,
	imageKey,
	onKeyDown,
	imageAreaProps,
	finalFocus,
	onOpenChangeComplete,
	slot = "image-viewer",
}: ImageViewerProps) {
	const close = (
		<DialogPrimitive.Close
			render={
				<Button
					variant="ghost"
					size="icon"
					className="size-[44px] rounded-full border border-border/70 bg-card/80 backdrop-blur-md"
					aria-label="Fechar"
				/>
			}
		>
			<X className="h-5 w-5" />
		</DialogPrimitive.Close>
	);

	return (
		<Dialog
			open={open}
			onOpenChange={onOpenChange}
			onOpenChangeComplete={onOpenChangeComplete}
		>
			<DialogPortal>
				<DialogOverlay className="bg-black/85" />
				<DialogPrimitive.Popup
					data-slot={slot}
					onKeyDown={onKeyDown}
					finalFocus={finalFocus}
					className="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 flex flex-col gap-3 p-3 duration-150 outline-none sm:p-6"
				>
					{src !== undefined && (
						<>
							<div className="flex items-center justify-between">
								{topLeft ??
									(title ? (
										<DialogTitle className="min-w-0 truncate rounded-full border border-border/70 bg-card/80 px-3 py-1.5 font-display text-[14px] font-bold text-foreground backdrop-blur-md">
											{title}
										</DialogTitle>
									) : (
										<span />
									))}
								{actions ? (
									<div className="flex shrink-0 items-center gap-2 pl-2">
										{actions}
										{close}
									</div>
								) : (
									close
								)}
							</div>

							<div
								{...imageAreaProps}
								className="relative flex min-h-0 flex-1 items-center justify-center"
							>
								<ViewerImage key={imageKey ?? src} src={src} alt={alt} />
								{imageOverlay}
							</div>

							{children}
						</>
					)}
				</DialogPrimitive.Popup>
			</DialogPortal>
		</Dialog>
	);
}

/** Carregando → imagem ou erro. Remonta por `key`, então não precisa de efeito. */
function ViewerImage({ src, alt }: { src: string; alt: string }) {
	const [status, setStatus] = useState<"loading" | "loaded" | "error">(
		"loading",
	);

	if (status === "error") {
		return (
			<div
				role="alert"
				className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-card/80 px-6 py-5 text-center text-[13px] text-muted-foreground backdrop-blur-md"
			>
				<ImageOff className="h-8 w-8" strokeWidth={1.4} aria-hidden />
				Não foi possível carregar a imagem
			</div>
		);
	}

	return (
		<>
			{status === "loading" && (
				<Skeleton
					data-slot="image-viewer-loading"
					aria-hidden
					className="absolute inset-0 m-auto aspect-square w-[min(60vw,60vh)] max-w-full rounded-2xl"
				/>
			)}
			<img
				src={src}
				alt={alt}
				decoding="async"
				onLoad={() => setStatus("loaded")}
				onError={() => setStatus("error")}
				className="max-h-full max-w-full select-none rounded-2xl border border-border/70 object-contain shadow-2xl shadow-black/40"
			/>
		</>
	);
}
