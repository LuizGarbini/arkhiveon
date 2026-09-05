import { Minus, Plus, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import {
	vttChipClass,
	vttHudClass,
	vttIconButtonClass,
	vttIconButtonIdleClass,
} from "./vtt-chrome";

export function VTTZoomControls() {
	const {
		viewport,
		setViewport,
		resetViewport,
		activeMeasurement,
		diagonalRule,
		setDiagonalRule,
		activeTool,
	} = useVTTStore();

	const handleZoomIn = () => {
		setViewport({ scale: Math.min(viewport.scale * 1.25, 5.0) });
	};

	const handleZoomOut = () => {
		setViewport({ scale: Math.max(viewport.scale * 0.8, 0.1) });
	};

	const zoomPercent = Math.round(viewport.scale * 100);

	return (
		<>
			{(activeMeasurement || activeTool === "ruler") && (
				<div className="absolute bottom-24 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6">
					{activeMeasurement && (
						<div
							className={cn(
								vttHudClass,
								"flex items-center gap-2 px-4 py-2 text-sm font-bold",
							)}
						>
							<Ruler className="h-4 w-4 text-primary" />
							<span className="text-muted-foreground">Distância</span>
							<span className="font-mono text-base text-foreground">
								{activeMeasurement.distance} {activeMeasurement.unit}
							</span>
						</div>
					)}
					<div className={cn(vttHudClass, "flex items-center gap-1 p-1")}>
						<button
							type="button"
							onClick={() => setDiagonalRule("5105")}
							className={cn(
								vttChipClass,
								diagonalRule === "5105"
									? "border-primary/40 bg-primary/15 text-foreground"
									: "border-transparent text-muted-foreground [@media(hover:hover)]:hover:bg-muted",
							)}
						>
							5-10-5
						</button>
						<button
							type="button"
							onClick={() => setDiagonalRule("euclidean")}
							className={cn(
								vttChipClass,
								diagonalRule === "euclidean"
									? "border-primary/40 bg-primary/15 text-foreground"
									: "border-transparent text-muted-foreground [@media(hover:hover)]:hover:bg-muted",
							)}
						>
							Euclidiano
						</button>
					</div>
				</div>
			)}

			<div
				className={cn(
					vttHudClass,
					"absolute bottom-[5.75rem] right-3 z-30 flex items-center gap-1 p-1 pointer-events-auto select-none md:bottom-6 md:right-6",
				)}
			>
				<button
					type="button"
					onClick={handleZoomOut}
					title="Diminuir zoom"
					className={cn(vttIconButtonClass, vttIconButtonIdleClass)}
				>
					<Minus className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={resetViewport}
					title="Redefinir zoom para 100%"
					className="flex h-11 min-w-11 items-center justify-center rounded-xl px-2 font-mono text-xs font-bold tabular-nums text-foreground [@media(hover:hover)]:hover:bg-muted"
				>
					{zoomPercent}%
				</button>
				<button
					type="button"
					onClick={handleZoomIn}
					title="Aumentar zoom"
					className={cn(vttIconButtonClass, vttIconButtonIdleClass)}
				>
					<Plus className="h-4 w-4" />
				</button>
			</div>
		</>
	);
}
