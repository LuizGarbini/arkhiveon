import {
	Eye,
	Grid,
	Hand,
	Hexagon,
	Map as MapIcon,
	MousePointer2,
	Radio,
	Ruler,
	ShieldAlert,
	Users,
} from "lucide-react";
import type { ComponentType } from "react";
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
		{ id: "token", label: "Camada de tokens", icon: Users },
		{ id: "gm", label: "Camada do mestre", icon: ShieldAlert },
	];

	return (
		<div
			className={cn(
				vttHudClass,
				"absolute left-3 top-14 z-30 flex w-[52px] flex-col items-center gap-1 p-1 pointer-events-auto select-none sm:left-4 sm:top-16",
			)}
		>
			{tools
				.filter((tool) => !tool.gmOnly || isGM)
				.map((tool) => {
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
									"absolute bottom-1 right-1 font-mono text-[8px] font-bold leading-none opacity-70",
									isActive
										? "text-primary-foreground"
										: "text-muted-foreground",
								)}
							>
								{tool.shortcut}
							</span>
						</button>
					);
				})}

			{isGM && (
				<>
					<div className="my-0.5 h-px w-6 bg-border/70" />
					{layers.map((layer) => {
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
					})}
					<div className="my-0.5 h-px w-6 bg-border/70" />
					<button
						type="button"
						onClick={() => setShowGridSettings(!showGridSettings)}
						title="Configurações do grid"
						className={cn(
							vttIconButtonClass,
							showGridSettings
								? vttIconButtonActiveClass
								: vttIconButtonIdleClass,
						)}
					>
						<Grid className="h-4 w-4" />
					</button>
				</>
			)}
		</div>
	);
}
