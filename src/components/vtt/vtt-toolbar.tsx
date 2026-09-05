import {
	CircleDot,
	Eye,
	Grid,
	Hand,
	Hexagon,
	Map as MapIcon,
	MoreHorizontal,
	MousePointer2,
	Radio,
	Ruler,
	ShieldAlert,
} from "lucide-react";
import type { ComponentType } from "react";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { VTTLayer } from "@/lib/vtt/types";
import { useVTTStore, type VTTTool } from "@/lib/vtt/vtt-store";
import {
	vttHudClass,
	vttIconButtonActiveClass,
	vttIconButtonClass,
	vttIconButtonIdleClass,
} from "./vtt-chrome";

export function VTTToolbar() {
	const {
		activeTool,
		setActiveTool,
		activeLayer,
		setActiveLayer,
		isGM,
		showGridSettings,
		setShowGridSettings,
	} = useVTTStore();

	const tools: {
		id: VTTTool;
		label: string;
		icon: ComponentType<{ className?: string }>;
		shortcut: string;
		gmOnly?: boolean;
	}[] = [
		{
			id: "select",
			label: "Selecionar e mover",
			icon: MousePointer2,
			shortcut: "V",
		},
		{ id: "pan", label: "Mão / mover câmera", icon: Hand, shortcut: "H" },
		{ id: "ruler", label: "Régua de medição", icon: Ruler, shortcut: "R" },
		{ id: "ping", label: "Ponteiro laser (ping)", icon: Radio, shortcut: "G" },
		{
			id: "template",
			label: "Moldes de magia",
			icon: Hexagon,
			shortcut: "T",
		},
		{
			id: "fog",
			label: "Névoa de guerra",
			icon: Eye,
			shortcut: "F",
			gmOnly: true,
		},
	];

	const layers: {
		id: VTTLayer;
		label: string;
		icon: ComponentType<{ className?: string }>;
	}[] = [
		{ id: "map", label: "Camada do mapa", icon: MapIcon },
		{ id: "token", label: "Camada de tokens", icon: CircleDot },
		{ id: "gm", label: "Camada do mestre", icon: ShieldAlert },
	];

	const visibleTools = tools.filter((tool) => !tool.gmOnly || isGM);

	const renderToolButton = (tool: (typeof tools)[number]) => {
		const Icon = tool.icon;
		const isActive = activeTool === tool.id;
		return (
			<button
				type="button"
				key={tool.id}
				onClick={() => setActiveTool(tool.id)}
				title={`${tool.label} (${tool.shortcut})`}
				className={cn(
					vttIconButtonClass,
					"relative",
					isActive ? vttIconButtonActiveClass : vttIconButtonIdleClass,
				)}
			>
				<Icon className="h-4 w-4" />
				<span
					className={cn(
						"absolute bottom-1 right-1 hidden font-mono text-[8px] font-bold leading-none opacity-70 md:block",
						isActive ? "text-primary-foreground" : "text-muted-foreground",
					)}
				>
					{tool.shortcut}
				</span>
			</button>
		);
	};

	const renderLayerButton = (layer: (typeof layers)[number]) => {
		const Icon = layer.icon;
		const isActive = activeLayer === layer.id;
		return (
			<button
				type="button"
				key={layer.id}
				onClick={() => setActiveLayer(layer.id)}
				title={layer.label}
				className={cn(
					vttIconButtonClass,
					isActive ? vttIconButtonActiveClass : vttIconButtonIdleClass,
				)}
			>
				<Icon className="h-4 w-4" />
			</button>
		);
	};

	const gridButton = (
		<button
			type="button"
			onClick={() => setShowGridSettings(!showGridSettings)}
			title="Configurações do grid"
			className={cn(
				vttIconButtonClass,
				showGridSettings ? vttIconButtonActiveClass : vttIconButtonIdleClass,
			)}
		>
			<Grid className="h-4 w-4" />
		</button>
	);

	return (
		<div
			className={cn(
				vttHudClass,
				"absolute z-30 flex pointer-events-auto select-none",
				"bottom-3 left-1/2 -translate-x-1/2 flex-row items-center gap-0.5 p-1",
				"md:bottom-auto md:left-4 md:top-16 md:translate-x-0 md:flex-col",
			)}
		>
			{visibleTools.map(renderToolButton)}

			{isGM && (
				<>
					<div className="mx-0.5 hidden h-px w-6 bg-border/70 md:block" />
					<div className="hidden md:contents">
						{layers.map(renderLayerButton)}
						<div className="my-0.5 h-px w-6 bg-border/70" />
						{gridButton}
					</div>
					<div className="mx-0.5 h-6 w-px bg-border/70 md:hidden" />
					<Popover>
						<PopoverTrigger
							title="Camadas e grid"
							className={cn(
								vttIconButtonClass,
								"md:hidden",
								showGridSettings
									? vttIconButtonActiveClass
									: vttIconButtonIdleClass,
							)}
						>
							<MoreHorizontal className="h-4 w-4" />
						</PopoverTrigger>
						<PopoverContent
							side="top"
							align="end"
							className="flex w-auto flex-row gap-1 rounded-2xl border border-border/70 bg-card/95 p-1.5"
						>
							{layers.map(renderLayerButton)}
							<div className="mx-0.5 h-11 w-px bg-border/70" />
							{gridButton}
						</PopoverContent>
					</Popover>
				</>
			)}
		</div>
	);
}
