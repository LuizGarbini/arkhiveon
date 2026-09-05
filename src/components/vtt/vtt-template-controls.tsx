import { Circle, Hexagon, Minus, Square, Triangle, X, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import type { VTTTemplateKind } from "@/lib/vtt/template-math";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import {
	vttChipClass,
	vttDockPanelClass,
	vttIconButtonClass,
	vttIconButtonIdleClass,
} from "./vtt-chrome";

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

export function VTTTemplateControls() {
	const {
		activeTool,
		showTemplateControls,
		setShowTemplateControls,
		setActiveTool,
		activeTemplateKind,
		setActiveTemplateKind,
		clearPlacedTemplates,
		placedTemplates,
	} = useVTTStore();

	if (!showTemplateControls && activeTool !== "template") return null;

	const handleClose = () => {
		setShowTemplateControls(false);
		if (activeTool === "template") setActiveTool("select");
	};

	return (
		<div className={cn(vttDockPanelClass, "flex flex-col gap-3")}>
			<div className="flex items-center justify-between border-b border-border/60 pb-2">
				<div className="flex items-center gap-2 text-xs font-bold">
					<Hexagon className="h-4 w-4 text-primary" />
					<span>Moldes de magia</span>
				</div>
				<button
					type="button"
					onClick={handleClose}
					title="Fechar moldes"
					className={cn(vttIconButtonClass, vttIconButtonIdleClass, "-mr-1")}
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
							onClick={() => {
								setActiveTemplateKind(kind.id);
								setActiveTool("template");
							}}
							className={cn(
								vttChipClass,
								"w-full justify-start",
								isActive
									? "border-primary/50 bg-primary/15 text-foreground"
									: "border-border/70 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground",
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
				onClick={() => clearPlacedTemplates()}
				disabled={placedTemplates.length === 0}
				className={cn(
					vttChipClass,
					"w-full border-border/70 bg-background/50 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40",
				)}
			>
				<Minus className="h-4 w-4" />
				Limpar moldes ({placedTemplates.length})
			</button>
		</div>
	);
}
