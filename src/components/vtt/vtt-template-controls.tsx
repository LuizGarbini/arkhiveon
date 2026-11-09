import { Circle, Eraser, Hexagon, Square, Triangle, Zap } from "lucide-react";
import type { ComponentType } from "react";
import {
	segmentClass,
	VTTOptionsBar,
	VTTOptionsDivider,
	VTTSegmented,
} from "@/components/vtt/vtt-options-bar";
import { cn } from "@/lib/utils";
import { formatDistance } from "@/lib/vtt/ruler-path";
import type { VTTTemplateKind } from "@/lib/vtt/template-math";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const KINDS: {
	id: VTTTemplateKind;
	label: string;
	hint: string;
	icon: ComponentType<{ className?: string }>;
	iconClass?: string;
}[] = [
	{
		id: "cone15",
		label: "Cone 15°",
		hint: "Sopro estreito",
		icon: Triangle,
		iconClass: "scale-x-50",
	},
	{ id: "cone60", label: "Cone 60°", hint: "Cone clássico", icon: Triangle },
	{ id: "sphere", label: "Esfera", hint: "Raio esférico", icon: Circle },
	{
		id: "line",
		label: "Linha",
		hint: "Relâmpago, 1 casa de largura",
		icon: Zap,
	},
	{ id: "cube", label: "Cubo", hint: "Área quadrada", icon: Square },
];

/** Alcances comuns em casas (1,5 m: 3 · 4,5 · 6 · 9 · 18 m). */
const SIZE_CELLS = [2, 3, 4, 6, 12];

export function VTTTemplateControls({
	onClearTemplates,
}: {
	onClearTemplates: (ids: string[]) => void;
}) {
	const activeTool = useVTTStore((s) => s.activeTool);
	const showTemplateControls = useVTTStore((s) => s.showTemplateControls);
	const setShowTemplateControls = useVTTStore((s) => s.setShowTemplateControls);
	const setActiveTool = useVTTStore((s) => s.setActiveTool);
	const activeTemplateKind = useVTTStore((s) => s.activeTemplateKind);
	const setActiveTemplateKind = useVTTStore((s) => s.setActiveTemplateKind);
	const templateSizeCells = useVTTStore((s) => s.templateSizeCells);
	const setTemplateSizeCells = useVTTStore((s) => s.setTemplateSizeCells);
	const clearPlacedTemplates = useVTTStore((s) => s.clearPlacedTemplates);
	const placedTemplates = useVTTStore((s) => s.placedTemplates);
	const scenes = useVTTStore((s) => s.scenes);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const scene = scenes.find((s) => s.id === activeSceneId);

	if (!showTemplateControls) return null;

	const scale = scene?.gridScaleDistance ?? 1.5;
	const unit = scene?.gridScaleUnit ?? "m";
	const handleClose = () => {
		setShowTemplateControls(false);
		if (activeTool === "template") setActiveTool("select");
	};

	return (
		<VTTOptionsBar
			label="Moldes"
			icon={Hexagon}
			closeLabel="Fechar moldes de magia"
			onClose={handleClose}
			footer={
				<div className="pointer-events-auto flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain rounded-2xl border border-border/70 bg-card/95 p-1 shadow-xl backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<span className="shrink-0 px-2.5 text-xs font-medium text-muted-foreground">
						Alcance
					</span>
					<VTTSegmented legend="Alcance do molde">
						<button
							type="button"
							aria-pressed={templateSizeCells === null}
							title="O arrasto define o alcance"
							onClick={() => setTemplateSizeCells(null)}
							className={segmentClass(templateSizeCells === null)}
						>
							Arrastar
						</button>
						{SIZE_CELLS.map((cells) => (
							<button
								type="button"
								key={cells}
								aria-pressed={templateSizeCells === cells}
								onClick={() => {
									setTemplateSizeCells(cells);
									setActiveTool("template");
								}}
								className={cn(
									segmentClass(templateSizeCells === cells),
									"tabular-nums",
								)}
							>
								{formatDistance(cells * scale, unit)}
							</button>
						))}
					</VTTSegmented>
					<VTTOptionsDivider />
					<button
						type="button"
						aria-label={`Limpar moldes (${placedTemplates.length})`}
						onClick={() => {
							onClearTemplates(placedTemplates.map((template) => template.id));
							clearPlacedTemplates();
						}}
						disabled={placedTemplates.length === 0}
						className="ml-auto inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
					>
						<Eraser className="size-4" />
						Limpar
						<span className="tabular-nums">({placedTemplates.length})</span>
					</button>
				</div>
			}
		>
			<VTTSegmented legend="Forma do molde">
				{KINDS.map((kind) => {
					const Icon = kind.icon;
					const isActive = activeTemplateKind === kind.id;
					return (
						<button
							type="button"
							key={kind.id}
							title={kind.hint}
							aria-pressed={isActive}
							onClick={() => {
								setActiveTemplateKind(kind.id);
								setActiveTool("template");
							}}
							className={segmentClass(isActive)}
						>
							<Icon
								className={cn(
									"size-4",
									isActive ? "text-primary" : "",
									kind.iconClass,
								)}
							/>
							{kind.label}
						</button>
					);
				})}
			</VTTSegmented>
		</VTTOptionsBar>
	);
}
