import { Sliders, X } from "lucide-react";
import { useId } from "react";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { VTTGridScaleUnit, VTTGridType } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import {
	vttChipClass,
	vttIconButtonClass,
	vttIconButtonIdleClass,
	vttPanelClass,
} from "./vtt-chrome";

interface VTTGridSettingsProps {
	onUpdateSceneSettings: (settings: {
		gridType: VTTGridType;
		gridSize: number;
		gridColor: string;
		gridOpacity: number;
		gridScaleDistance: number;
		gridScaleUnit: VTTGridScaleUnit;
	}) => void;
}

export function VTTGridSettings({
	onUpdateSceneSettings,
}: VTTGridSettingsProps) {
	const gridTypeId = useId();
	const gridScaleId = useId();
	const gridUnitId = useId();
	const {
		scenes,
		activeSceneId,
		showGridSettings,
		setShowGridSettings,
		diagonalRule,
		setDiagonalRule,
	} = useVTTStore();

	const activeScene = scenes.find((s) => s.id === activeSceneId);
	if (!showGridSettings || !activeScene) return null;

	const patch = (
		updates: Partial<{
			gridType: VTTGridType;
			gridSize: number;
			gridColor: string;
			gridOpacity: number;
			gridScaleDistance: number;
			gridScaleUnit: VTTGridScaleUnit;
		}>,
	) => {
		onUpdateSceneSettings({
			gridType: activeScene.gridType,
			gridSize: activeScene.gridSize,
			gridColor: activeScene.gridColor,
			gridOpacity: activeScene.gridOpacity,
			gridScaleDistance: activeScene.gridScaleDistance,
			gridScaleUnit: activeScene.gridScaleUnit,
			...updates,
		});
	};

	const presetColors = [
		"#ffffff",
		"#000000",
		"#38bdf8",
		"#a855f7",
		"#22c55e",
		"#f59e0b",
		"#ef4444",
	];

	return (
		<div
			className={cn(
				vttPanelClass,
				"absolute left-16 top-16 z-40 w-72 space-y-3.5 p-4 pointer-events-auto select-none",
			)}
		>
			<div className="flex items-center justify-between border-b border-border/60 pb-2">
				<div className="flex items-center gap-2">
					<Sliders className="h-4 w-4 text-primary" />
					<h4 className="font-display text-xs font-bold tracking-wide">
						Ajuste do grid
					</h4>
				</div>
				<button
					type="button"
					onClick={() => setShowGridSettings(false)}
					className={cn(vttIconButtonClass, vttIconButtonIdleClass)}
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<Field label="Tipo de grid" htmlFor={gridTypeId}>
				<Select
					id={gridTypeId}
					value={activeScene.gridType}
					onChange={(e) => patch({ gridType: e.target.value as VTTGridType })}
					className="h-[44px] text-[16px] md:text-[16px]"
				>
					<option value="square">Quadrado (padrão)</option>
					<option value="hex_pointy">Hexagonal (pontudo)</option>
					<option value="hex_flat">Hexagonal (plano)</option>
					<option value="none">Desativado (livre)</option>
				</Select>
			</Field>

			<div className="grid grid-cols-2 gap-2">
				<Field label="Escala" htmlFor={gridScaleId}>
					<Input
						id={gridScaleId}
						type="number"
						step="0.5"
						min="0.5"
						value={activeScene.gridScaleDistance}
						onChange={(e) =>
							patch({ gridScaleDistance: Number(e.target.value) || 1 })
						}
						className="h-[44px] text-[16px] md:text-[16px]"
					/>
				</Field>
				<Field label="Unidade" htmlFor={gridUnitId}>
					<Select
						id={gridUnitId}
						value={activeScene.gridScaleUnit}
						onChange={(e) =>
							patch({
								gridScaleUnit: e.target.value as VTTGridScaleUnit,
							})
						}
						className="h-[44px] text-[16px] md:text-[16px]"
					>
						<option value="m">Metros</option>
						<option value="ft">Pés</option>
						<option value="sq">Quadrados</option>
					</Select>
				</Field>
			</div>

			<div className="space-y-1.5">
				<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
					Diagonal
				</span>
				<div className="grid grid-cols-2 gap-1.5">
					<button
						type="button"
						onClick={() => setDiagonalRule("5105")}
						className={cn(
							vttChipClass,
							diagonalRule === "5105"
								? "border-primary/40 bg-primary/15"
								: "border-border/70 bg-background/50 text-muted-foreground",
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
								? "border-primary/40 bg-primary/15"
								: "border-border/70 bg-background/50 text-muted-foreground",
						)}
					>
						Euclidiano
					</button>
				</div>
			</div>

			{activeScene.gridType !== "none" && (
				<>
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
							<span>Tamanho da célula</span>
							<span className="font-mono text-foreground">
								{activeScene.gridSize}px
							</span>
						</div>
						<input
							type="range"
							min={30}
							max={180}
							step={5}
							value={activeScene.gridSize}
							onChange={(e) => patch({ gridSize: Number(e.target.value) })}
							className="h-[44px] w-full accent-primary"
						/>
					</div>
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
							<span>Opacidade</span>
							<span className="font-mono text-foreground">
								{Math.round(activeScene.gridOpacity * 100)}%
							</span>
						</div>
						<input
							type="range"
							min={0}
							max={1}
							step={0.05}
							value={activeScene.gridOpacity}
							onChange={(e) => patch({ gridOpacity: Number(e.target.value) })}
							className="h-[44px] w-full accent-primary"
						/>
					</div>
					<div className="space-y-1.5">
						<span className="text-[10px] font-bold text-muted-foreground">
							Cor do grid
						</span>
						<div className="flex items-center gap-2">
							{presetColors.map((color) => (
								<button
									type="button"
									key={color}
									onClick={() => patch({ gridColor: color })}
									style={{ backgroundColor: color }}
									className={cn(
										"h-8 w-8 rounded-full border transition-all",
										activeScene.gridColor === color
											? "scale-110 border-primary"
											: "border-border/70 opacity-70 hover:opacity-100",
									)}
								/>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
