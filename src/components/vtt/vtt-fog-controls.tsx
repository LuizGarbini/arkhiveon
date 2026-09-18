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
import {
	vttChipClass,
	vttIconButtonClass,
	vttIconButtonIdleClass,
	vttPanelClass,
} from "./vtt-chrome";

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
		<div
			className={cn(
				vttPanelClass,
				"absolute left-16 top-16 z-30 flex min-w-[260px] flex-col gap-2.5 p-3 pointer-events-auto select-none",
			)}
		>
			<div className="flex items-center justify-between border-b border-border/60 pb-2">
				<div className="flex items-center gap-2 text-xs font-bold text-foreground">
					<Eye className="h-4 w-4 text-primary" />
					<span>Névoa de Guerra</span>
				</div>
				<button
					type="button"
					onClick={handleClose}
					title="Fechar Controles (Esc / V)"
					className={cn(vttIconButtonClass, vttIconButtonIdleClass, "-mr-1")}
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<div className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-background/50 p-1 text-[11px]">
				<button
					type="button"
					onClick={handleToggleFog}
					className={cn(
						"flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 font-semibold transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation",
						scene?.fogEnabled
							? "border border-primary/40 bg-primary/15 text-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					{scene?.fogEnabled ? (
						<Eye className="h-4 w-4 text-primary" />
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
						"flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-semibold transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation",
						scene?.fogExploration
							? "border border-primary/40 bg-primary/15 text-foreground"
							: "text-muted-foreground hover:bg-muted hover:text-foreground",
					)}
				>
					<Compass className="h-4 w-4 text-primary" />
					<span>Exploração</span>
				</button>
			</div>

			<div className="flex flex-col gap-1.5">
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					Ação
				</span>
				<div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/70 bg-background/40 p-1">
					<button
						type="button"
						onClick={() => setActiveFogMode("reveal")}
						className={cn(
							vttChipClass,
							"w-full",
							activeFogMode === "reveal"
								? "border-primary/40 bg-primary text-primary-foreground"
								: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<Sparkles className="h-4 w-4" />
						<span>Revelar</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveFogMode("hide")}
						className={cn(
							vttChipClass,
							"w-full",
							activeFogMode === "hide"
								? "border-primary/40 bg-primary text-primary-foreground"
								: "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<Eraser className="h-4 w-4" />
						<span>Cobrir</span>
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-1.5">
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					Forma
				</span>
				<div className="grid grid-cols-3 gap-1.5">
					<button
						type="button"
						onClick={() => setActiveFogTool("brush")}
						className={cn(
							"flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation",
							activeFogTool === "brush"
								? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
								: "border-border/70 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<Paintbrush className="h-4 w-4" />
						<span className="text-[10px] font-semibold">Pincel</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveFogTool("rect")}
						className={cn(
							"flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation",
							activeFogTool === "rect"
								? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
								: "border-border/70 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<Square className="h-4 w-4" />
						<span className="text-[10px] font-semibold">Retângulo</span>
					</button>

					<button
						type="button"
						onClick={() => setActiveFogTool("circle")}
						className={cn(
							"flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer touch-manipulation",
							activeFogTool === "circle"
								? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/25"
								: "border-border/70 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground",
						)}
					>
						<Circle className="h-4 w-4" />
						<span className="text-[10px] font-semibold">Círculo</span>
					</button>
				</div>
			</div>

			{activeFogTool === "brush" && (
				<div className="flex flex-col gap-1.5">
					<div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
						<span>Espessura do Pincel</span>
						<span className="font-mono text-foreground">
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
										vttChipClass,
										"w-full",
										isSelected
											? "border-primary/40 bg-primary/15 text-foreground"
											: "border-border/70 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground",
									)}
								>
									<span>{size.label}</span>
									<span className="font-mono text-[9px] opacity-70">
										({size.px})
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			<div className="flex items-center gap-1.5 border-t border-border/60 pt-2">
				<button
					type="button"
					onClick={() => handleClearAll("all_revealed")}
					title="Revelar todo o mapa instantaneamente"
					className={cn(
						vttChipClass,
						"flex-1 border-border/70 bg-background/50 text-foreground hover:bg-muted",
					)}
				>
					<Eye className="h-3.5 w-3.5 text-primary" />
					<span>Revelar Tudo</span>
				</button>

				<button
					type="button"
					onClick={() => handleClearAll("all_hidden")}
					title="Cobrir todo o mapa (Resetar névoa)"
					className={cn(
						vttChipClass,
						"flex-1 border-border/70 bg-background/50 text-foreground hover:bg-muted",
					)}
				>
					<RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
					<span>Cobrir Tudo</span>
				</button>
			</div>
		</div>
	);
}
