import { Maximize, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ZOOM_ABOVE_GRID_BAR_CLASS } from "@/lib/vtt/grid-bar-layout";
import { useVTTStore } from "@/lib/vtt/vtt-store";

export function VTTZoomControls() {
	const viewport = useVTTStore((s) => s.viewport);
	const setViewport = useVTTStore((s) => s.setViewport);
	const scenes = useVTTStore((s) => s.scenes);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const scene = scenes.find((s) => s.id === activeSceneId);
	// 390 px: com a barra do grid aberta, o zoom sobe para ficar acima dela.
	const gridBarOpen = useVTTStore((s) => s.isGM && s.showGridSettings);
	const gridMoreOpen = useVTTStore((s) => s.gridMoreOpen);
	const zoom = (scale: number) => {
		const x = window.innerWidth / 2;
		const y = window.innerHeight / 2;
		const next = Math.min(5, Math.max(0.1, scale));
		setViewport({
			scale: next,
			x: x - ((x - viewport.x) / viewport.scale) * next,
			y: y - ((y - viewport.y) / viewport.scale) * next,
		});
	};
	const fit = () => {
		if (!scene) return;
		const width = window.innerWidth - 100;
		const height = Math.max(100, window.innerHeight - 220);
		const scale = Math.max(
			0.1,
			Math.min(5, width / scene.width, height / scene.height),
		);
		setViewport({
			scale,
			x: 80 + (width - scene.width * scale) / 2,
			y: 135 + (height - scene.height * scale) / 2,
		});
	};
	const button =
		"flex size-11 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]";
	return (
		<>
			{scene && (
				<div
					data-slot="vtt-zoom-controls"
					className={cn(
						"absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-0.5 rounded-2xl border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur-md select-none",
						gridBarOpen &&
							ZOOM_ABOVE_GRID_BAR_CLASS[gridMoreOpen ? "open" : "closed"],
					)}
				>
					<button
						type="button"
						className={button}
						onClick={fit}
						title="Enquadrar mapa"
						aria-label="Enquadrar mapa"
					>
						<Maximize className="size-4" />
					</button>
					<span aria-hidden className="mx-0.5 h-6 w-px bg-border" />
					<button
						type="button"
						className={button}
						onClick={() => zoom(viewport.scale * 0.8)}
						title="Diminuir Zoom"
						aria-label="Diminuir zoom"
					>
						<Minus className="size-4" />
					</button>
					<button
						type="button"
						className="h-11 min-w-14 rounded-xl px-2 text-xs font-medium tabular-nums text-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary [@media(hover:hover)]:hover:bg-accent"
						onClick={() => zoom(1)}
						title="Redefinir Zoom para 100%"
					>
						{Math.round(viewport.scale * 100)}%
					</button>
					<button
						type="button"
						className={button}
						onClick={() => zoom(viewport.scale * 1.25)}
						title="Aumentar Zoom"
						aria-label="Aumentar zoom"
					>
						<Plus className="size-4" />
					</button>
				</div>
			)}
		</>
	);
}
