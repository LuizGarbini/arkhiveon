import {
	Eye,
	Grid,
	Hand,
	Map as MapIcon,
	MousePointer2,
	Pencil,
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
	const {
		activeTool,
		setActiveTool,
		activeLayer,
		setActiveLayer,
		isGM,
		showGridSettings,
		setShowGridSettings,
		setShowFogControls,
	} = useVTTStore();

	// Global Keyboard Shortcuts
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			const key = e.key.toLowerCase();
			if (key === "v") setActiveTool("select");
			if (key === "h") setActiveTool("pan");
			if (key === "r") setActiveTool("ruler");
			if (key === "g") setActiveTool("ping");
			if (key === "f" && isGM) {
				setActiveTool("fog");
				setShowFogControls(true);
			}
			if (key === "d") setActiveTool("draw");
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
			id: "fog",
			label: "Névoa de Guerra",
			icon: Eye,
			shortcut: "F",
			gmOnly: true,
		},
		{ id: "draw", label: "Desenhar Formas", icon: Pencil, shortcut: "D" },
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
		<div className="absolute left-3 sm:left-4 top-14 sm:top-16 z-30 flex flex-col items-center w-12 p-1 rounded-2xl border border-white/15 bg-black/80 backdrop-blur-2xl shadow-2xl pointer-events-auto select-none gap-1 animate-in fade-in slide-in-from-left-2 duration-200">
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
									if (tool.id === "fog") {
										setShowFogControls(true);
									}
								}}
								title={`${tool.label} (${tool.shortcut})`}
								className={cn(
									"group relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
									isActive
										? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
										: "text-white/70 hover:bg-white/10 hover:text-white",
								)}
							>
								<Icon className="h-4.5 w-4.5" />
								{/* Shortcut hint badge */}
								<span
									className={cn(
										"absolute bottom-1 right-1 text-[8px] font-extrabold font-mono leading-none opacity-60",
										isActive ? "text-primary-foreground" : "text-white/50",
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
					<div className="w-6 h-px bg-white/15 my-0.5" />

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
									title={layer.label}
									className={cn(
										"flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
										isActive
											? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
											: "text-white/60 hover:bg-white/10 hover:text-white",
									)}
								>
									<Icon className="h-4 w-4" />
								</button>
							);
						})}
					</div>

					<div className="w-6 h-px bg-white/15 my-0.5" />

					{/* Grid Settings Toggle */}
					<button
						type="button"
						onClick={() => setShowGridSettings(!showGridSettings)}
						title="Configurações do Grid"
						className={cn(
							"flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
							showGridSettings
								? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
								: "text-white/70 hover:bg-white/10 hover:text-white",
						)}
					>
						<Grid className="h-4.5 w-4.5" />
					</button>
				</>
			)}
		</div>
	);
}
