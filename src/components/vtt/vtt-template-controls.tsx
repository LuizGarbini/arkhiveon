import { Circle, Hexagon, Minus, Square, Triangle, X, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { VTTTemplateKind } from "@/lib/vtt/template-math";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const chipClass =
	"inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] cursor-pointer touch-manipulation";

const KINDS: {
	id: VTTTemplateKind;
	label: string;
	hint: string;
	icon: ComponentType<{ className?: string }>;
}[] = [
	{ id: "cone15", label: "Cone 15°", hint: "Sopro estreito", icon: Triangle },
	{ id: "cone60", label: "Cone 60°", hint: "Cone clássico", icon: Triangle },
	{ id: "sphere", label: "Esfera", hint: "Raio esférico", icon: Circle },
	{ id: "line", label: "Linha", hint: "Relâmpago 1 célula", icon: Zap },
	{ id: "cube", label: "Cubo", hint: "Área quadrada", icon: Square },
];

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
	const clearPlacedTemplates = useVTTStore((s) => s.clearPlacedTemplates);
	const placedTemplates = useVTTStore((s) => s.placedTemplates);

	if (!showTemplateControls) return null;

	const handleClose = () => {
		setShowTemplateControls(false);
		if (activeTool === "template") setActiveTool("select");
	};

	return (
		<div className="absolute left-3 top-32 z-40 flex max-h-[calc(100dvh-13rem)] w-[min(20rem,calc(100%-1.5rem))] flex-col gap-3 overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-3 text-foreground shadow-2xl backdrop-blur-md pointer-events-auto select-none animate-in fade-in slide-in-from-left-4 duration-200 sm:left-20">
			<div className="flex items-center justify-between border-b border-border/60 pb-2">
				<div className="flex items-center gap-2 text-xs font-bold">
					<Hexagon className="h-4 w-4 text-primary" />
					<span>Moldes de magia</span>
				</div>
				<button
					type="button"
					onClick={handleClose}
					title="Fechar moldes"
					aria-label="Fechar moldes de magia"
					className={cn(
						"flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] cursor-pointer",
						"-mr-1",
					)}
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			<p className="text-[11px] leading-relaxed text-muted-foreground">
				Clique no ponto de origem e arraste para definir alcance e direção.
			</p>

			<div className="grid grid-cols-1 gap-1.5">
				{KINDS.map((kind) => {
					const Icon = kind.icon;
					const isActive = activeTemplateKind === kind.id;
					return (
						<button
							type="button"
							key={kind.id}
							aria-pressed={isActive}
							onClick={() => {
								setActiveTemplateKind(kind.id);
								setActiveTool("template");
							}}
							className={cn(
								chipClass,
								"w-full justify-start",
								isActive
									? "border-primary/50 bg-primary/15 text-foreground"
									: "border-border/70 bg-background/50 text-muted-foreground hover:bg-accent hover:text-foreground",
							)}
						>
							<Icon className="h-4 w-4 text-primary" />
							<span>{kind.label}</span>
							<span className="ml-auto text-[10px] font-medium text-muted-foreground">
								{kind.hint}
							</span>
						</button>
					);
				})}
			</div>

			<button
				type="button"
				onClick={() => {
					onClearTemplates(placedTemplates.map((template) => template.id));
					clearPlacedTemplates();
				}}
				disabled={placedTemplates.length === 0}
				className={cn(
					chipClass,
					"w-full border-border/70 bg-background/50 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40",
				)}
			>
				<Minus className="h-4 w-4" />
				Limpar moldes ({placedTemplates.length})
			</button>
		</div>
	);
}
