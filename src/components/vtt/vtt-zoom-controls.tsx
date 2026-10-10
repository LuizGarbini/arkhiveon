import { Maximize, Minus, Plus, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VTTDiagonalRule } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const DIAGONAL_RULES: { id: VTTDiagonalRule; label: string }[] = [
	{ id: "5105", label: "5-10-5" },
	{ id: "euclidean", label: "Euclidiano" },
];

export function VTTZoomControls() {
	const viewport = useVTTStore((s) => s.viewport);
	const setViewport = useVTTStore((s) => s.setViewport);
	const activeMeasurement = useVTTStore((s) => s.activeMeasurement);
	const activeTool = useVTTStore((s) => s.activeTool);
	const diagonalRule = useVTTStore((s) => s.diagonalRule);
	const setDiagonalRule = useVTTStore((s) => s.setDiagonalRule);
	const scenes = useVTTStore((s) => s.scenes);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const scene = scenes.find((s) => s.id === activeSceneId);
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
		"flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]";
	return (
		<>
			{(activeMeasurement || activeTool === "ruler") && (
				<div className="pointer-events-none absolute bottom-20 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2">
					{activeMeasurement && (
						<output className="flex items-center gap-2 rounded-xl border border-border/70 bg-card/95 px-4 py-3 text-sm shadow-lg backdrop-blur-md">
							<Ruler className="size-4 text-primary" />
							<span className="text-muted-foreground">Distância</span>
							<span className="font-medium tabular-nums text-foreground">
								{activeMeasurement.distance} {activeMeasurement.unit}
							</span>
						</output>
					)}
					<fieldset className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur-md select-none">
						<legend className="sr-only">Regra de diagonal</legend>
						{DIAGONAL_RULES.map((rule) => (
							<button
								type="button"
								key={rule.id}
								aria-pressed={diagonalRule === rule.id}
								onClick={() => setDiagonalRule(rule.id)}
								className={cn(
									"h-11 rounded-xl border px-3 text-xs font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]",
									diagonalRule === rule.id
										? "border-primary/40 bg-primary/15 text-foreground"
										: "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
								)}
							>
								{rule.label}
							</button>
						))}
					</fieldset>
				</div>
			)}
			{scene && (
				<div className="absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-border/70 bg-card/95 p-1 shadow-lg backdrop-blur-md select-none">
					<button
						type="button"
						className={button}
						onClick={fit}
						title="Enquadrar mapa"
						aria-label="Enquadrar mapa"
					>
						<Maximize className="size-4" />
					</button>
					<span className="h-5 w-px bg-border/70" />
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
						className="h-11 min-w-14 rounded-xl px-2 text-xs font-medium tabular-nums focus-visible:ring-2 focus-visible:ring-primary hover:bg-accent"
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
