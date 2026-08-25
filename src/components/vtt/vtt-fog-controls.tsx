import {
	Circle,
	Compass,
	Eraser,
	Eye,
	EyeOff,
	Paintbrush,
	RotateCcw,
	Sparkles,
	Square,
	X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTFogControlsProps {
	scene: VTTScene | null;
	onUpdateScene?: (
		sceneId: string,
		updates: Partial<VTTScene>,
	) => Promise<void>;
	onClearFog?: (mode: "all_hidden" | "all_revealed") => void;
}

export function VTTFogControls({
	scene,
	onUpdateScene,
	onClearFog,
}: VTTFogControlsProps) {
	const {
		isGM,
		activeTool,
		setActiveTool,
		activeFogTool,
		setActiveFogTool,
		activeFogMode,
		setActiveFogMode,
		fogBrushRadius,
		setFogBrushRadius,
		showFogControls,
		setShowFogControls,
	} = useVTTStore();

	if (!isGM || !showFogControls) return null;

	const handleClose = () => {
		setShowFogControls(false);
		if (activeTool === "fog") {
			setActiveTool("select");
		}
	};

	const handleToggleFog = () => {
		if (!scene || !onUpdateScene) return;
		void onUpdateScene(scene.id, { fogEnabled: !scene.fogEnabled });
	};

	const handleToggleExploration = () => {
		if (!scene || !onUpdateScene) return;
		void onUpdateScene(scene.id, { fogExploration: !scene.fogExploration });
	};

	const handleClearAll = (mode: "all_hidden" | "all_revealed") => {
		if (onClearFog) {
			onClearFog(mode);
		}
	};

	const brushSizes = [
		{ label: "P", radius: 20, px: "20px" },
		{ label: "M", radius: 40, px: "40px" },
		{ label: "G", radius: 80, px: "80px" },
	];

	return (
		<div className="absolute left-18 top-16 z-30 flex flex-col gap-2.5 p-3 rounded-2xl border border-white/15 bg-black/90 backdrop-blur-2xl shadow-2xl pointer-events-auto select-none min-w-[260px] animate-in fade-in slide-in-from-left-4 duration-200">
			{/* Header */}
			<div className="flex items-center justify-between pb-1 border-b border-white/10">
				<div className="flex items-center gap-2 text-xs font-bold text-white">
					<Eye className="h-4 w-4 text-primary" />
					<span>Névoa de Guerra</span>
				</div>
				<button
					type="button"
					onClick={handleClose}
					title="Fechar Controles (Esc / V)"
					className="h-11 w-11 -mr-2 -my-2 flex items-center justify-center rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer touch-manipulation"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Status & Master Toggles */}
			<div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-white/5 border border-white/10 text-[11px]">
				<button
					type="button"
					onClick={handleToggleFog}
					className={cn(
						"flex-1 min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg font-semibold transition-all cursor-pointer touch-manipulation",
						scene?.fogEnabled
							? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
							: "bg-white/5 text-white/50 hover:text-white",
					)}
				>
					{scene?.fogEnabled ? (
						<Eye className="h-4 w-4" />
					) : (
						<EyeOff className="h-4 w-4" />
					)}
					<span>{scene?.fogEnabled ? "Névoa Ativa" : "Névoa Inativa"}</span>
				</button>

				<button
					type="button"
					onClick={handleToggleExploration}
					title="Modo Exploração: Áreas visitadas ficam em penumbra com mapa visível"
					className={cn(
						"min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition-all cursor-pointer touch-manipulation",
						scene?.fogExploration
							? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
							: "bg-white/5 text-white/50 hover:text-white",
					)}
				>
					<Compass className="h-4 w-4" />
					<span>Exploração</span>
				</button>
			</div>

			{/* Mode Selector (Reveal vs Hide) */}
			<div className="flex flex-col gap-1.5">
				<span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
					Ação
				</span>
				<div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
					<button
						type="button"
						onClick={() => setActiveFogMode("reveal")}
						className={cn(
							"min-h-[44px] flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation",
							activeFogMode === "reveal"
								? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
								: "text-white/60 hover:bg-white/10 hover:text-white",
						)}
					>
						<Sparkles className="h-4 w-4" />
						<span>Revelar</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveFogMode("hide")}
						className={cn(
							"min-h-[44px] flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation",
							activeFogMode === "hide"
								? "bg-zinc-700 text-white shadow-md shadow-zinc-800/40"
								: "text-white/60 hover:bg-white/10 hover:text-white",
						)}
					>
						<Eraser className="h-4 w-4" />
						<span>Cobrir</span>
					</button>
				</div>
			</div>

			{/* Shape / Tool Selector */}
			<div className="flex flex-col gap-1.5">
				<span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
					Forma
				</span>
				<div className="grid grid-cols-3 gap-1.5">
					<button
						type="button"
						onClick={() => setActiveFogTool("brush")}
						className={cn(
							"min-h-[48px] flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all cursor-pointer touch-manipulation",
							activeFogTool === "brush"
								? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
								: "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
						)}
					>
						<Paintbrush className="h-4 w-4" />
						<span className="text-[10px] font-semibold">Pincel</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveFogTool("rect")}
						className={cn(
							"min-h-[48px] flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all cursor-pointer touch-manipulation",
							activeFogTool === "rect"
								? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
								: "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
						)}
					>
						<Square className="h-4 w-4" />
						<span className="text-[10px] font-semibold">Retângulo</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveFogTool("circle")}
						className={cn(
							"min-h-[48px] flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-xl border transition-all cursor-pointer touch-manipulation",
							activeFogTool === "circle"
								? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/30"
								: "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white",
						)}
					>
						<Circle className="h-4 w-4" />
						<span className="text-[10px] font-semibold">Círculo</span>
					</button>
				</div>
			</div>

			{/* Brush Size Selector (when brush is active) */}
			{activeFogTool === "brush" && (
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
						<span>Espessura do Pincel</span>
						<span className="text-white/80 font-mono">
							{fogBrushRadius * 2}px
						</span>
					</div>
					<div className="grid grid-cols-3 gap-1.5">
						{brushSizes.map((size) => {
							const isSelected = fogBrushRadius === size.radius;
							return (
								<button
									type="button"
									key={size.label}
									onClick={() => setFogBrushRadius(size.radius)}
									className={cn(
										"min-h-[44px] flex items-center justify-center gap-1 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer touch-manipulation",
										isSelected
											? "bg-white/20 border-white/40 text-white shadow-sm"
											: "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white",
									)}
								>
									<span>{size.label}</span>
									<span className="text-[9px] opacity-60 font-mono">
										({size.px})
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Quick Global Actions */}
			<div className="flex items-center gap-1.5 pt-1.5 border-t border-white/10">
				<button
					type="button"
					onClick={() => handleClearAll("all_revealed")}
					title="Revelar todo o mapa instantaneamente"
					className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-[11px] font-semibold transition-all border border-white/10 cursor-pointer touch-manipulation"
				>
					<Eye className="h-3.5 w-3.5 text-emerald-400" />
					<span>Revelar Tudo</span>
				</button>

				<button
					type="button"
					onClick={() => handleClearAll("all_hidden")}
					title="Cobrir todo o mapa (Resetar névoa)"
					className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-[11px] font-semibold transition-all border border-white/10 cursor-pointer touch-manipulation"
				>
					<RotateCcw className="h-3.5 w-3.5 text-amber-400" />
					<span>Cobrir Tudo</span>
				</button>
			</div>
		</div>
	);
}
