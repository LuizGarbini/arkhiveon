import { ChevronDown, Minus, Plus, Sliders, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { GRID_BAR_MOBILE_CLASS } from "@/lib/vtt/grid-bar-layout";
import {
	clampGridSize,
	DEFAULT_GRID_SCALE_DISTANCE,
	GRID_SIZE_MAX,
	GRID_SIZE_MIN,
} from "@/lib/vtt/grid-math";
import type {
	VTTDiagonalRule,
	VTTGridScaleUnit,
	VTTGridType,
	VTTSceneSettingsPatch,
} from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

/** Espera depois do último passo do slider antes de gravar. */
const GRID_SIZE_SAVE_DEBOUNCE_MS = 300;

const PRESET_COLORS = [
	"#ffffff",
	"#000000",
	"#38bdf8",
	"#a855f7",
	"#22c55e",
	"#f59e0b",
	"#ef4444",
];

interface VTTGridSettingsProps {
	/** Grava só os campos do patch; resolve `false` se o servidor recusar. */
	onUpdateSceneSettings: (
		patch: VTTSceneSettingsPatch,
	) => Promise<boolean> | boolean | undefined;
}

export function VTTGridSettings({
	onUpdateSceneSettings,
}: VTTGridSettingsProps) {
	const activeScene = useVTTStore((s) =>
		s.scenes.find((scene) => scene.id === s.activeSceneId),
	);
	const showGridSettings = useVTTStore((s) => s.showGridSettings);
	const isGM = useVTTStore((s) => s.isGM);
	const setShowGridSettings = useVTTStore((s) => s.setShowGridSettings);
	const diagonalRule = useVTTStore((s) => s.diagonalRule);
	const setDiagonalRule = useVTTStore((s) => s.setDiagonalRule);
	const updateSceneLocal = useVTTStore((s) => s.updateScene);
	const gridMoreOpen = useVTTStore((s) => s.gridMoreOpen);
	const setGridMoreOpen = useVTTStore((s) => s.setGridMoreOpen);
	const moreId = useId();
	const gridScaleId = useId();
	const gridUnitId = useId();
	const gridSizeId = useId();
	const gridSizeHintId = useId();

	// Texto do campo numérico enquanto o mestre digita (null = mostra a cena).
	const [sizeDraft, setSizeDraft] = useState<string | null>(null);
	const [savingSize, setSavingSize] = useState(false);
	// Valor gravado antes do arraste/edição em curso, para reverter no erro.
	const sizeBeforeEditRef = useRef<number | null>(null);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Ajuste do grid é só do mestre, mesmo se a flag do painel vazar.
	if (!isGM || !showGridSettings || !activeScene) return null;

	const sceneId = activeScene.id;
	const gridSize = activeScene.gridSize;

	const commitGridSize = async (value: number) => {
		if (saveTimerRef.current) {
			clearTimeout(saveTimerRef.current);
			saveTimerRef.current = null;
		}
		const next = clampGridSize(value);
		const before = sizeBeforeEditRef.current ?? gridSize;
		sizeBeforeEditRef.current = null;
		if (next === before) {
			updateSceneLocal(sceneId, { gridSize: before });
			return;
		}
		setSavingSize(true);
		try {
			const ok = await onUpdateSceneSettings({ gridSize: next });
			if (ok === false) updateSceneLocal(sceneId, { gridSize: before });
		} finally {
			setSavingSize(false);
		}
	};

	// Arraste: pré-visualização só local (store → canvas); grava com debounce.
	const previewGridSize = (value: number) => {
		if (sizeBeforeEditRef.current === null)
			sizeBeforeEditRef.current = gridSize;
		const next = clampGridSize(value);
		updateSceneLocal(sceneId, { gridSize: next });
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(() => {
			void commitGridSize(next);
		}, GRID_SIZE_SAVE_DEBOUNCE_MS);
	};

	const commitSizeDraft = () => {
		if (sizeDraft === null) return;
		const parsed = Number.parseInt(sizeDraft, 10);
		setSizeDraft(null);
		if (Number.isNaN(parsed)) return;
		void commitGridSize(parsed);
	};

	return (
		<section
			aria-label="Ajuste do grid"
			className={cn(
				"absolute z-40 rounded-2xl border border-border/70 bg-card text-foreground shadow-2xl pointer-events-auto select-none animate-in fade-in duration-150",
				// 390 px: barra de ~130 px só com a célula; o resto em "Mais ajustes".
				// O zoom sobe para cima dela (vtt-zoom-controls), nunca fica coberto.
				"inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] p-2.5",
				"max-sm:flex max-sm:flex-col max-sm:overflow-hidden",
				GRID_BAR_MOBILE_CLASS[gridMoreOpen ? "open" : "closed"],
				"sm:inset-x-auto sm:bottom-auto sm:left-20 sm:top-32 sm:w-80 sm:max-h-[calc(100dvh-13rem)] sm:overflow-y-auto sm:p-4 sm:space-y-3.5 sm:zoom-in-95",
			)}
		>
			<div className="hidden items-center justify-between pb-2 border-b border-border/70 sm:flex">
				<div className="flex items-center gap-2">
					<Sliders className="h-4 w-4 text-primary" />
					<h4 className="font-display text-xs font-bold text-foreground tracking-wide">
						Ajuste do Grid
					</h4>
				</div>
				<CloseButton onClose={() => setShowGridSettings(false)} />
			</div>

			{/* Tamanho da célula: campo inteiro 10–400 + −/+ + slider auxiliar */}
			<Field
				label="Tamanho da célula (px)"
				htmlFor={gridSizeId}
				className="gap-1 sm:gap-1.5"
			>
				<div className="flex items-center gap-1.5">
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Diminuir célula"
						disabled={savingSize || gridSize <= GRID_SIZE_MIN}
						onClick={() => void commitGridSize(gridSize - 1)}
						className="size-11 shrink-0 rounded-xl"
					>
						<Minus className="h-4 w-4" />
					</Button>
					<Input
						id={gridSizeId}
						type="number"
						inputMode="numeric"
						step={1}
						min={GRID_SIZE_MIN}
						max={GRID_SIZE_MAX}
						aria-describedby={gridSizeHintId}
						disabled={savingSize}
						value={sizeDraft ?? String(gridSize)}
						onChange={(e) => setSizeDraft(e.target.value)}
						onBlur={commitSizeDraft}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								commitSizeDraft();
							}
							if (e.key === "Escape") setSizeDraft(null);
						}}
						className="h-11 text-center text-base tabular-nums"
					/>
					<Button
						type="button"
						variant="outline"
						size="icon"
						aria-label="Aumentar célula"
						disabled={savingSize || gridSize >= GRID_SIZE_MAX}
						onClick={() => void commitGridSize(gridSize + 1)}
						className="size-11 shrink-0 rounded-xl"
					>
						<Plus className="h-4 w-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Mais ajustes"
						aria-expanded={gridMoreOpen}
						aria-controls={moreId}
						onClick={() => setGridMoreOpen(!gridMoreOpen)}
						className="size-11 shrink-0 rounded-xl sm:hidden"
					>
						<ChevronDown
							className={cn(
								"h-4 w-4 transition-transform duration-150",
								gridMoreOpen && "rotate-180",
							)}
						/>
					</Button>
					<div className="sm:hidden">
						<CloseButton onClose={() => setShowGridSettings(false)} />
					</div>
				</div>
				<Slider
					min={GRID_SIZE_MIN}
					max={GRID_SIZE_MAX}
					step={1}
					value={gridSize}
					disabled={savingSize}
					thumbLabel="Tamanho da célula"
					onValueChange={(value) => previewGridSize(value)}
					onValueCommitted={(value) => void commitGridSize(value)}
				/>
				<p
					id={gridSizeHintId}
					aria-live="polite"
					className={cn(
						// Linha reservada (2 linhas) e quebra de texto: "Salvando…" não
						// muda a altura da barra e o aviso de grid livre nunca é cortado.
						"min-h-[2lh] text-pretty break-words text-[11px] leading-snug text-muted-foreground",
					)}
				>
					{savingSize
						? "Salvando…"
						: activeScene.gridType === "none"
							? `Grid livre: a célula de ${gridSize} px ainda vale para a régua e os tokens.`
							: `De ${GRID_SIZE_MIN} a ${GRID_SIZE_MAX} px.`}
				</p>
			</Field>

			<div
				id={moreId}
				className={cn(
					"space-y-3.5",
					gridMoreOpen
						? "mt-2.5 min-h-0 flex-1 overflow-y-auto border-t border-border/70 pt-2.5"
						: "hidden",
					"sm:mt-0 sm:block sm:h-auto sm:overflow-visible sm:border-0 sm:pt-0",
				)}
			>
				{/* Grid Type */}
				<Field label="Tipo de Grid">
					<Select
						aria-label="Tipo de Grid"
						value={activeScene.gridType}
						onChange={(e) =>
							onUpdateSceneSettings({
								gridType: e.target.value as VTTGridType,
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

				{/* Distância por célula & unidade usadas pela régua e templates */}
				<div className="grid grid-cols-2 gap-2">
					<Field label="Distância por célula" htmlFor={gridScaleId}>
						<Input
							id={gridScaleId}
							type="number"
							step="0.5"
							min="0.5"
							inputMode="decimal"
							value={activeScene.gridScaleDistance}
							onChange={(e) => {
								const value = Number(e.target.value);
								onUpdateSceneSettings({
									gridScaleDistance:
										value > 0 ? value : DEFAULT_GRID_SCALE_DISTANCE,
								});
							}}
							className="h-11 text-base tabular-nums"
						/>
					</Field>
					<Field label="Unidade" htmlFor={gridUnitId}>
						<Select
							id={gridUnitId}
							value={activeScene.gridScaleUnit}
							onChange={(e) =>
								onUpdateSceneSettings({
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

				{activeScene.gridType !== "none" && (
					<>
						{/* Grid Opacity Slider */}
						<div className="space-y-1">
							<div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
								<span>Opacidade do Grid</span>
								<span className="font-mono text-foreground">
									{Math.round(activeScene.gridOpacity * 100)}%
								</span>
							</div>
							<Slider
								min={0}
								max={1}
								step={0.05}
								value={activeScene.gridOpacity}
								thumbLabel="Opacidade do grid"
								onValueCommitted={(value) =>
									onUpdateSceneSettings({ gridOpacity: value })
								}
								onValueChange={(value) =>
									updateSceneLocal(sceneId, { gridOpacity: value })
								}
							/>
						</div>

						{/* Grid Color Palette */}
						<div className="space-y-1.5">
							<span className="text-[10px] font-bold text-muted-foreground">
								Cor do Grid
							</span>
							<div className="flex flex-wrap items-center gap-2">
								{PRESET_COLORS.map((color) => (
									<button
										type="button"
										key={color}
										aria-label={`Cor do grid ${color}`}
										aria-pressed={activeScene.gridColor === color}
										onClick={() => onUpdateSceneSettings({ gridColor: color })}
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
		</section>
	);
}

function CloseButton({ onClose }: { onClose: () => void }) {
	return (
		<button
			type="button"
			aria-label="Fechar configurações do grid"
			onClick={onClose}
			className="flex size-11 items-center justify-center rounded-xl text-muted-foreground focus-visible:ring-2 hover:text-foreground"
		>
			<X className="h-4 w-4" />
		</button>
	);
}
