import { Sliders, X } from "lucide-react";
import { useId } from "react";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
	VTTDiagonalRule,
	VTTGridScaleUnit,
	VTTGridType,
} from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

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
	const scenes = useVTTStore((s) => s.scenes);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const showGridSettings = useVTTStore((s) => s.showGridSettings);
	const setShowGridSettings = useVTTStore((s) => s.setShowGridSettings);
	const diagonalRule = useVTTStore((s) => s.diagonalRule);
	const setDiagonalRule = useVTTStore((s) => s.setDiagonalRule);
	const gridScaleId = useId();
	const gridUnitId = useId();

	const activeScene = scenes.find((s) => s.id === activeSceneId);
	if (!showGridSettings || !activeScene) return null;

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
		<div className="absolute left-3 top-32 z-40 max-h-[calc(100dvh-13rem)] overflow-y-auto w-[min(20rem,calc(100%-1.5rem))] sm:left-20 p-4 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-md shadow-2xl text-foreground pointer-events-auto select-none animate-in fade-in zoom-in-95 duration-150 space-y-3.5">
			<div className="flex items-center justify-between pb-2 border-b border-border/70">
				<div className="flex items-center gap-2">
					<Sliders className="h-4 w-4 text-primary" />
					<h4 className="font-display text-xs font-bold text-foreground tracking-wide">
						Ajuste do Grid
					</h4>
				</div>
				<button
					type="button"
					aria-label="Fechar configurações do grid"
					onClick={() => setShowGridSettings(false)}
					className="flex size-11 items-center justify-center rounded-xl text-muted-foreground focus-visible:ring-2 hover:text-foreground"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Grid Type */}
			<Field label="Tipo de Grid">
				<Select
					aria-label="Tipo de Grid"
					value={activeScene.gridType}
					onChange={(e) =>
						onUpdateSceneSettings({
							gridType: e.target.value as VTTGridType,
							gridSize: activeScene.gridSize,
							gridColor: activeScene.gridColor,
							gridOpacity: activeScene.gridOpacity,
							gridScaleDistance: activeScene.gridScaleDistance,
							gridScaleUnit: activeScene.gridScaleUnit,
						})
					}
					className="h-11 text-base"
				>
					<option value="square">Quadrado (Padrão)</option>
					<option value="hex_pointy">Hexagonal (Pontudo)</option>
					<option value="hex_flat">Hexagonal (Plano)</option>
					<option value="none">Desativado (Livre)</option>
				</Select>
			</Field>

			{/* Scale & unit used by the ruler and templates */}
			<div className="grid grid-cols-2 gap-2">
				<Field label="Escala" htmlFor={gridScaleId}>
					<Input
						id={gridScaleId}
						type="number"
						step="0.5"
						min="0.5"
						inputMode="decimal"
						value={activeScene.gridScaleDistance}
						onChange={(e) =>
							onUpdateSceneSettings({
								gridType: activeScene.gridType,
								gridSize: activeScene.gridSize,
								gridColor: activeScene.gridColor,
								gridOpacity: activeScene.gridOpacity,
								gridScaleDistance: Number(e.target.value) || 1,
								gridScaleUnit: activeScene.gridScaleUnit,
							})
						}
						className="h-11 text-base tabular-nums"
					/>
				</Field>
				<Field label="Unidade" htmlFor={gridUnitId}>
					<Select
						id={gridUnitId}
						value={activeScene.gridScaleUnit}
						onChange={(e) =>
							onUpdateSceneSettings({
								gridType: activeScene.gridType,
								gridSize: activeScene.gridSize,
								gridColor: activeScene.gridColor,
								gridOpacity: activeScene.gridOpacity,
								gridScaleDistance: activeScene.gridScaleDistance,
								gridScaleUnit: e.target.value as VTTGridScaleUnit,
							})
						}
						className="h-11 text-base"
					>
						<option value="m">Metros</option>
						<option value="ft">Pés</option>
						<option value="sq">Quadrados</option>
					</Select>
				</Field>
			</div>

			{/* Diagonal rule used by the ruler distance */}
			<fieldset className="space-y-1.5">
				<legend className="text-[10px] font-bold text-muted-foreground">
					Diagonal
				</legend>
				<div className="grid grid-cols-2 gap-1.5">
					{(
						[
							{ id: "5105", label: "5-10-5" },
							{ id: "euclidean", label: "Euclidiano" },
						] satisfies { id: VTTDiagonalRule; label: string }[]
					).map((rule) => (
						<button
							type="button"
							key={rule.id}
							aria-pressed={diagonalRule === rule.id}
							onClick={() => setDiagonalRule(rule.id)}
							className={cn(
								"min-h-11 rounded-xl border px-3 text-xs font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]",
								diagonalRule === rule.id
									? "border-primary/40 bg-primary/15 text-foreground"
									: "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground",
							)}
						>
							{rule.label}
						</button>
					))}
				</div>
			</fieldset>

			{/* Grid Size Slider */}
			{activeScene.gridType !== "none" && (
				<>
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
							<span>Tamanho da Célula</span>
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
							aria-label="Tamanho da célula"
							aria-valuetext={`${activeScene.gridSize} pixels`}
							onChange={(e) =>
								onUpdateSceneSettings({
									gridType: activeScene.gridType,
									gridSize: Number(e.target.value),
									gridColor: activeScene.gridColor,
									gridOpacity: activeScene.gridOpacity,
									gridScaleDistance: activeScene.gridScaleDistance,
									gridScaleUnit: activeScene.gridScaleUnit,
								})
							}
							className="vtt-range w-full cursor-pointer"
						/>
					</div>

					{/* Grid Opacity Slider */}
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
							<span>Opacidade do Grid</span>
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
							aria-label="Opacidade do grid"
							aria-valuetext={`${Math.round(activeScene.gridOpacity * 100)}%`}
							onChange={(e) =>
								onUpdateSceneSettings({
									gridType: activeScene.gridType,
									gridSize: activeScene.gridSize,
									gridColor: activeScene.gridColor,
									gridOpacity: Number(e.target.value),
									gridScaleDistance: activeScene.gridScaleDistance,
									gridScaleUnit: activeScene.gridScaleUnit,
								})
							}
							className="vtt-range w-full cursor-pointer"
						/>
					</div>

					{/* Grid Color Palette */}
					<div className="space-y-1.5">
						<span className="text-[10px] font-bold text-muted-foreground">
							Cor do Grid
						</span>
						<div className="flex flex-wrap items-center gap-2">
							{presetColors.map((color) => (
								<button
									type="button"
									key={color}
									aria-label={`Cor do grid ${color}`}
									aria-pressed={activeScene.gridColor === color}
									onClick={() =>
										onUpdateSceneSettings({
											gridType: activeScene.gridType,
											gridSize: activeScene.gridSize,
											gridColor: color,
											gridOpacity: activeScene.gridOpacity,
											gridScaleDistance: activeScene.gridScaleDistance,
											gridScaleUnit: activeScene.gridScaleUnit,
										})
									}
									style={{ backgroundColor: color }}
									className={`h-11 w-11 rounded-full border transition-all cursor-pointer ${
										activeScene.gridColor === color
											? "border-primary scale-110 shadow-xs"
											: "border-border opacity-70 hover:opacity-100"
									}`}
								/>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
