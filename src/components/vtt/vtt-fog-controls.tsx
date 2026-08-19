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
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { cn } from "@/lib/utils";

interface VTTFogControlsProps {
	scene: VTTScene | null;
	onUpdateScene?: (sceneId: string, updates: Partial<VTTScene>) => Promise<void>;
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
		activeFogTool,
		setActiveFogTool,
		activeFogMode,
		setActiveFogMode,
		fogBrushRadius,
		setFogBrushRadius,
		clearFog,
		showFogControls,
		setShowFogControls,
	} = useVTTStore();

	if (!isGM) return null;
	if (activeTool !== "fog" && !showFogControls) return null;

	const handleToggleFog = () => {
		if (!scene || !onUpdateScene) return;
		void onUpdateScene(scene.id, { fogEnabled: !scene.fogEnabled });
	};

	const handleToggleExploration = () => {
		if (!scene || !onUpdateScene) return;
		void onUpdateScene(scene.id, { fogExploration: !scene.fogExploration });
	};

	const handleClearAll = (mode: "all_hidden" | "all_revealed") => {
		clearFog(mode);
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
		<div className="absolute left-18 top-16 z-30 flex flex-col gap-2 p-2.5 rounded-2xl border border-white/15 bg-black/85 backdrop-blur-2xl shadow-2xl pointer-events-auto select-none min-w-[240px] animate-in fade-in slide-in-from-left-4 duration-200">
			{/* Header */}
			<div className="flex items-center justify-between pb-1.5 border-b border-white/10">
				<div className="flex items-center gap-1.5 text-xs font-bold text-white">
					<Eye className="h-4 w-4 text-primary" />
					<span>Névoa de Guerra</span>
				</div>
				<button
					type="button"
					onClick={() => setShowFogControls(false)}
					title="Fechar Controles"
					className="h-5 w-5 flex items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white transition-colors"
				>
					<X className="h-3.5 w-3.5" />
				</button>
			</div>

			{/* Status & Master Toggles */}
			<div className="flex items-center justify-between gap-2 p-1.5 rounded-xl bg-white/5 border border-white/10 text-[11px]">
				<button
					type="button"
					onClick={handleToggleFog}
					className={cn(
						"flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg font-semibold transition-all cursor-pointer",
						scene?.fogEnabled
							? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
							: "bg-white/5 text-white/50 hover:text-white",
					)}
				>
					{scene?.fogEnabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
					<span>{scene?.fogEnabled ? "Névoa Ativa" : "Névoa Inativa"}</span>
				</button>

				<button
					type="button"
					onClick={handleToggleExploration}
					title="Modo Exploração: Áreas visitadas ficam em penumbra com mapa visível"
					className={cn(
						"flex items-center justify-center gap-1 py-1 px-2 rounded-lg font-semibold transition-all cursor-pointer",
						scene?.fogExploration
							? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
							: "bg-white/5 text-white/50 hover:text-white",
					)}
				>
					<Compass className="h-3.5 w-3.5" />
					<span>Exploração</span>
				</button>
			</div>

			{/* Mode Selector (Reveal vs Hide) */}
			<div className="flex flex-col gap-1">
				<span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
					Ação
				</span>
				<div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
					<button
						type="button"
						onClick={() => setActiveFogMode("reveal")}
						className={cn(
							"flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
							activeFogMode === "reveal"
								? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
								: "text-white/60 hover:bg-white/10 hover:text-white",
						)}
					>
						<Sparkles className="h-3.5 w-3.5" />
						<span>Revelar</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveFogMode("hide")}
						className={cn(
							"flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
							activeFogMode === "hide"
								? "bg-zinc-700 text-white shadow-md shadow-zinc-800/40"
								: "text-white/60 hover:bg-white/10 hover:text-white",
						)}
					>
						<Eraser className="h-3.5 w-3.5" />
						<span>Cobrir</span>
					</button>
				</div>
			</div>

			{/* Shape / Tool Selector */}
			<div className="flex flex-col gap-1">
				<span className="text-[10px] font-bold uppercase tracking-wider text-white/40">
					Forma
				</span>
				<div className="grid grid-cols-3 gap-1.5">
					<button
						type="button"
						onClick={() => setActiveFogTool("brush")}
						className={cn(
							"flex flex-col items-center justify-center gap-1 py-2 rounded-xl border transition-all cursor-pointer",
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
							"flex flex-col items-center justify-center gap-1 py-2 rounded-xl border transition-all cursor-pointer",
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
							"flex flex-col items-center justify-center gap-1 py-2 rounded-xl border transition-all cursor-pointer",
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
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
						<span>Espessura do Pincel</span>
						<span className="text-white/70">{fogBrushRadius * 2}px</span>
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
										"flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer",
										isSelected
											? "bg-white/20 border-white/40 text-white"
											: "bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white",
									)}
								>
									<span>{size.label}</span>
									<span className="text-[9px] opacity-60">({size.px})</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Quick Global Actions */}
			<div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
				<button
					type="button"
					onClick={() => handleClearAll("all_revealed")}
					title="Revelar todo o mapa instantaneamente"
					className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-[11px] font-semibold transition-all border border-white/10 cursor-pointer"
				>
					<Eye className="h-3 w-3 text-emerald-400" />
					<span>Revelar Tudo</span>
				</button>

				<button
					type="button"
					onClick={() => handleClearAll("all_hidden")}
					title="Cobrir todo o mapa (Resetar névoa)"
					className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-[11px] font-semibold transition-all border border-white/10 cursor-pointer"
				>
					<RotateCcw className="h-3 w-3 text-amber-400" />
					<span>Cobrir Tudo</span>
				</button>
			</div>
		</div>
	);
}
