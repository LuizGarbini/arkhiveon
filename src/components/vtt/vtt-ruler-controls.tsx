import { Eraser, Ruler, Undo2 } from "lucide-react";
import {
	Kbd,
	segmentClass,
	VTTOptionsBar,
	VTTOptionsDivider,
	VTTSegmented,
} from "@/components/vtt/vtt-options-bar";
import { cn } from "@/lib/utils";
import {
	formatCells,
	formatDistance,
	type RulerContext,
	rulerRemeasure,
	rulerUndo,
} from "@/lib/vtt/ruler-path";
import type { VTTDiagonalRule } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const DIAGONAL_RULES: { id: VTTDiagonalRule; label: string; hint: string }[] = [
	{ id: "chebyshev", label: "Simples", hint: "Diagonal conta 1 casa (5e)" },
	{ id: "5105", label: "5-10-5", hint: "Diagonais alternam 1 e 2 casas" },
	{ id: "euclidean", label: "Euclidiano", hint: "Distância real em linha" },
];

const actionClass =
	"flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground";

export function VTTRulerControls() {
	const activeTool = useVTTStore((s) => s.activeTool);
	const measurement = useVTTStore((s) => s.activeMeasurement);
	const diagonalRule = useVTTStore((s) => s.diagonalRule);
	const scenes = useVTTStore((s) => s.scenes);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const scene = scenes.find((s) => s.id === activeSceneId);

	if (activeTool !== "ruler" || !scene) return null;

	const ctx = (rule: VTTDiagonalRule): RulerContext => ({
		gridSize: scene.gridSize,
		scaleDistance: scene.gridScaleDistance,
		unit: scene.gridScaleUnit,
		diagonalRule: rule,
	});
	const { setActiveMeasurement, setDiagonalRule, setActiveTool } =
		useVTTStore.getState();
	const segments = measurement?.segments ?? [];
	const cells = formatCells(measurement?.cells, diagonalRule);

	return (
		<VTTOptionsBar
			label="Régua"
			icon={Ruler}
			closeLabel="Fechar régua"
			onClose={() => setActiveTool("select")}
			wrapOnPhone
			footer={
				<p className="pointer-events-none flex flex-wrap items-center justify-center gap-x-3 gap-y-1 self-center rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md">
					<span className="[@media(hover:none)]:hidden">
						Clique marca um ponto
					</span>
					<span className="[@media(hover:hover)]:hidden">
						Toque marca um ponto · toque duplo fixa · arraste para medir
					</span>
					<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
						<Kbd>Duplo clique</Kbd> ou <Kbd>Enter</Kbd> fixa
					</span>
					<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
						<Kbd>⌫</Kbd> ou botão direito desfaz
					</span>
					<span className="flex items-center gap-1 [@media(hover:none)]:hidden">
						<Kbd>Esc</Kbd> limpa
					</span>
				</p>
			}
		>
			<output
				aria-live="polite"
				className="flex min-w-[7.5rem] shrink-0 flex-col justify-center px-2.5 leading-tight max-sm:mr-auto"
			>
				<span className="text-[10px] font-medium text-muted-foreground">
					Distância{measurement?.pinned ? " · fixada" : ""}
				</span>
				{measurement ? (
					<span className="flex items-baseline gap-1.5 whitespace-nowrap">
						<span className="text-base font-semibold tabular-nums text-foreground">
							{formatDistance(measurement.distance, measurement.unit)}
						</span>
						{cells && (
							<span className="text-xs tabular-nums text-muted-foreground">
								{cells}
							</span>
						)}
					</span>
				) : (
					<span className="text-xs whitespace-nowrap text-foreground">
						Clique no mapa
					</span>
				)}
			</output>
			{segments.length > 1 && (
				<ol
					aria-label="Trechos"
					className="flex shrink-0 items-center gap-1 text-[11px] tabular-nums max-sm:hidden"
				>
					{segments.map((distance, index) => (
						<li
							// biome-ignore lint/suspicious/noArrayIndexKey: trechos são posicionais
							key={index}
							className="flex items-center gap-1 rounded-lg bg-background/60 px-2 py-1 ring-1 ring-inset ring-border/70"
						>
							<span className="text-muted-foreground">{index + 1}</span>
							<span className="text-foreground">
								{formatDistance(distance, measurement?.unit ?? "")}
							</span>
						</li>
					))}
				</ol>
			)}
			<VTTOptionsDivider className="max-sm:hidden" />
			<VTTSegmented
				legend="Regra de diagonal"
				className="max-sm:order-last max-sm:w-full"
			>
				{DIAGONAL_RULES.map((rule) => (
					<button
						type="button"
						key={rule.id}
						title={rule.hint}
						aria-pressed={diagonalRule === rule.id}
						onClick={() => {
							setDiagonalRule(rule.id);
							setActiveMeasurement(rulerRemeasure(measurement, ctx(rule.id)));
						}}
						className={cn(
							segmentClass(diagonalRule === rule.id),
							"max-sm:flex-1",
						)}
					>
						{rule.label}
					</button>
				))}
			</VTTSegmented>
			<VTTOptionsDivider className="max-sm:hidden" />
			<button
				type="button"
				aria-label="Desfazer último ponto"
				title="Desfazer último ponto"
				disabled={!measurement}
				onClick={() =>
					setActiveMeasurement(rulerUndo(measurement, ctx(diagonalRule)))
				}
				className={actionClass}
			>
				<Undo2 className="size-4" />
			</button>
			<button
				type="button"
				aria-label="Limpar régua"
				title="Limpar régua"
				disabled={!measurement}
				onClick={() => setActiveMeasurement(null)}
				className={actionClass}
			>
				<Eraser className="size-4" />
			</button>
		</VTTOptionsBar>
	);
}
