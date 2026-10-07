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
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import type { VTTLayer } from "@/lib/vtt/types";
import { useVTTStore, type VTTTool } from "@/lib/vtt/vtt-store";

export function VTTToolbar() {
	const activeTool = useVTTStore((s) => s.activeTool);
	const setActiveTool = useVTTStore((s) => s.setActiveTool);
	const activeLayer = useVTTStore((s) => s.activeLayer);
	const setActiveLayer = useVTTStore((s) => s.setActiveLayer);
	const isGM = useVTTStore((s) => s.isGM);
	const showGridSettings = useVTTStore((s) => s.showGridSettings);
	const setShowGridSettings = useVTTStore((s) => s.setShowGridSettings);
	const setShowFogControls = useVTTStore((s) => s.setShowFogControls);

	// Global Keyboard Shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement ||
				e.target instanceof HTMLSelectElement ||
				(e.target instanceof HTMLElement && e.target.isContentEditable) ||
				e.ctrlKey ||
				e.metaKey ||
				e.altKey
			) {
				return;
			}

			const key = e.key.toLowerCase();
			if (key === "v") setActiveTool("select");
			if (key === "h") setActiveTool("pan");
			if (key === "r") setActiveTool("ruler");
			if (key === "g") setActiveTool("ping");
			if (key === "t") setActiveTool("template");
			if (key === "f" && isGM) {
				setActiveTool("fog");
				setShowFogControls(true);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isGM, setActiveTool, setShowFogControls]);

	const tools: {
		id: VTTTool;
		label: string;
		icon: React.ComponentType<{ className?: string }>;
		shortcut: string;
		gmOnly?: boolean;
	}[] = [
		{
			id: "select",
			label: "Selecionar & Mover",
			icon: MousePointer2,
			shortcut: "V",
		},
		{ id: "pan", label: "Mão / Mover Câmera", icon: Hand, shortcut: "H" },
		{ id: "ruler", label: "Régua de Medição", icon: Ruler, shortcut: "R" },
		{ id: "ping", label: "Ponteiro Laser (Ping)", icon: Radio, shortcut: "G" },
		{
			id: "template",
			label: "Moldes de magia",
			icon: Hexagon,
			shortcut: "T",
		},
		{
			id: "fog",
			label: "Névoa de Guerra",
			icon: Eye,
			shortcut: "F",
			gmOnly: true,
		},
	];

	const layers: {
		id: VTTLayer;
		label: string;
		icon: React.ComponentType<{ className?: string }>;
	}[] = [
		{ id: "map", label: "Camada do Mapa", icon: MapIcon },
		{ id: "token", label: "Camada de Tokens", icon: Users },
		{ id: "gm", label: "Camada do Mestre", icon: ShieldAlert },
	];

	return (
		<div className="absolute left-3 top-32 overflow-y-auto max-h-[calc(100dvh-14rem)] z-30 flex flex-col items-center w-14 p-1 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-md shadow-2xl pointer-events-auto select-none gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
			{/* Main Toolset */}
			<div className="flex flex-col items-center gap-1 w-full">
				{tools
					.filter((t) => !t.gmOnly || isGM)
					.map((tool) => {
						const Icon = tool.icon;
						const isActive = activeTool === tool.id;
						return (
							<button
								type="button"
								key={tool.id}
								onClick={() => {
									setActiveTool(tool.id);
									setShowFogControls(tool.id === "fog");
									if (tool.id === "fog") {
										setShowFogControls(true);
									}
								}}
								aria-label={tool.label}
								aria-pressed={isActive}
								title={`${tool.label} (${tool.shortcut})`}
								className={cn(
									"group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary cursor-pointer",
									isActive
										? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
										: "text-muted-foreground hover:bg-accent hover:text-foreground",
								)}
							>
								<Icon className="h-4.5 w-4.5" />
								{/* Shortcut hint badge */}
								<span
									className={cn(
										"absolute bottom-1 right-1 text-[8px] font-extrabold font-mono leading-none opacity-60",
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
			</div>

			{/* Divider for Layers (GM Only) */}
			{isGM && (
				<>
					<div className="w-6 h-px bg-border/70 my-0.5" />

					{/* Layer Switcher */}
					<div className="flex flex-col items-center gap-1 w-full">
						{layers.map((layer) => {
							const Icon = layer.icon;
							const isActive = activeLayer === layer.id;
							return (
								<button
									type="button"
									key={layer.id}
									onClick={() => setActiveLayer(layer.id)}
									aria-label={layer.label}
									aria-pressed={isActive}
									title={layer.label}
									className={cn(
										"flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary cursor-pointer",
										isActive
											? "bg-primary/15 text-primary ring-1 ring-primary/40"
											: "text-muted-foreground hover:bg-accent hover:text-foreground",
									)}
								>
									<Icon className="h-4 w-4" />
								</button>
							);
						})}
					</div>

					<div className="w-6 h-px bg-border/70 my-0.5" />

					{/* Grid Settings Toggle */}
					<button
						type="button"
						onClick={() => setShowGridSettings(!showGridSettings)}
						aria-label="Configurações do Grid"
						aria-expanded={showGridSettings}
						title="Configurações do Grid"
						className={cn(
							"flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary cursor-pointer",
							showGridSettings
								? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
								: "text-muted-foreground hover:bg-accent hover:text-foreground",
						)}
					>
						<Grid className="h-4.5 w-4.5" />
					</button>
				</>
			)}
		</div>
	);
}
