import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { croppedBlobFromUrl } from "@/lib/crop-image";

type ImageCropDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	imageSrc: string | null;
	title?: string;
	description?: string;
	aspect?: number;
	cropShape?: "rect" | "round";
	busy?: boolean;
	onApply: (blob: Blob) => void | Promise<void>;
};

export function ImageCropDialog({
	open,
	onOpenChange,
	imageSrc,
	title = "Recortar imagem",
	description = "Arraste e use o zoom para enquadrar a imagem antes de salvar.",
	aspect = 1,
	cropShape = "rect",
	busy = false,
	onApply,
}: ImageCropDialogProps) {
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
	const [isApplying, setIsApplying] = useState(false);
	const toast = useToast();

	useEffect(() => {
		if (!open) return;
		setCrop({ x: 0, y: 0 });
		setZoom(1);
		setCroppedAreaPixels(null);
	}, [open, imageSrc]);

	const onCropComplete = useCallback((_: Area, pixels: Area) => {
		setCroppedAreaPixels(pixels);
	}, []);

	async function handleApply() {
		if (!imageSrc || !croppedAreaPixels) return;
		setIsApplying(true);
		try {
			const blob = await croppedBlobFromUrl(imageSrc, croppedAreaPixels);
			await onApply(blob);
			onOpenChange(false);
		} catch (error) {
			console.error(error);
			toast.error({
				title: "Não foi possível aplicar o recorte",
				description:
					error instanceof Error
						? error.message
						: "Verifique sua conexão e tente novamente.",
			});
		} finally {
			setIsApplying(false);
		}
	}

	const isBusy = busy || isApplying;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-lg! gap-0 overflow-hidden p-0">
				<DialogHeader className="border-b border-border/70 px-6 py-5">
					<DialogTitle className="font-display text-xl">{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>

				<div className="relative h-[min(52vh,360px)] bg-black/90">
					{imageSrc ? (
						<Cropper
							image={imageSrc}
							crop={crop}
							zoom={zoom}
							aspect={aspect}
							cropShape={cropShape}
							showGrid
							onCropChange={setCrop}
							onZoomChange={setZoom}
							onCropComplete={onCropComplete}
						/>
					) : null}
				</div>

				<div className="space-y-4 border-t border-border/70 bg-card px-6 py-5">
					<Field label="Zoom">
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary disabled:opacity-40"
								disabled={zoom <= 1 || isBusy}
								onClick={() => setZoom((current) => Math.max(1, current - 0.1))}
								aria-label="Diminuir zoom"
							>
								<ZoomOut className="h-4 w-4" />
							</button>
							<Input
								type="range"
								min={1}
								max={3}
								step={0.05}
								value={zoom}
								disabled={isBusy}
								onChange={(event) => setZoom(Number(event.target.value))}
								className="flex-1"
							/>
							<button
								type="button"
								className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground transition-colors hover:border-primary/35 hover:text-primary disabled:opacity-40"
								disabled={zoom >= 3 || isBusy}
								onClick={() => setZoom((current) => Math.min(3, current + 0.1))}
								aria-label="Aumentar zoom"
							>
								<ZoomIn className="h-4 w-4" />
							</button>
							<span className="w-10 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">
								{zoom.toFixed(1)}x
							</span>
						</div>
					</Field>

					<DialogFooter className="gap-2 sm:justify-end">
						<Button
							type="button"
							variant="ghost"
							disabled={isBusy}
							onClick={() => onOpenChange(false)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={!imageSrc || !croppedAreaPixels || isBusy}
							onClick={() => void handleApply()}
							className="gap-2"
						>
							{isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
							Aplicar recorte
						</Button>
					</DialogFooter>
				</div>
			</DialogContent>
		</Dialog>
	);
}
