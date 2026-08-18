import { Minus, Plus, Ruler } from "lucide-react";
import { useVTTStore } from "@/lib/vtt/vtt-store";

export function VTTZoomControls() {
	const { viewport, setViewport, resetViewport, activeMeasurement } = useVTTStore();

	const handleZoomIn = () => {
		const newScale = Math.min(viewport.scale * 1.25, 5.0);
		setViewport({ scale: newScale });
	};

	const handleZoomOut = () => {
		const newScale = Math.max(viewport.scale * 0.8, 0.1);
		setViewport({ scale: newScale });
	};

	const zoomPercent = Math.round(viewport.scale * 100);

	return (
		<>
			{/* Floating Active Measurement Badge (Bottom Center) */}
			{activeMeasurement && (
				<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
					<div className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-sky-400/40 bg-black/80 backdrop-blur-xl shadow-2xl text-sky-300 font-bold text-sm">
						<Ruler className="h-4 w-4 animate-pulse text-sky-400" />
						<span>Distância:</span>
						<span className="font-mono text-base text-white">
							{activeMeasurement.distance} {activeMeasurement.unit}
						</span>
					</div>
				</div>
			)}

			{/* Zoom Controls (Bottom Right) */}
			<div className="absolute bottom-6 right-6 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl shadow-2xl pointer-events-auto select-none">
				<button
					type="button"
					onClick={handleZoomOut}
					title="Diminuir Zoom"
					className="flex h-8 w-8 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer active:scale-95"
				>
					<Minus className="h-4 w-4" />
				</button>

				<button
					type="button"
					onClick={resetViewport}
					title="Redefinir Zoom para 100%"
					className="px-2 h-8 flex items-center justify-center rounded-xl text-xs font-mono font-bold text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
				>
					{zoomPercent}%
				</button>

				<button
					type="button"
					onClick={handleZoomIn}
					title="Aumentar Zoom"
					className="flex h-8 w-8 items-center justify-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white transition-colors cursor-pointer active:scale-95"
				>
					<Plus className="h-4 w-4" />
				</button>
			</div>
		</>
	);
}
