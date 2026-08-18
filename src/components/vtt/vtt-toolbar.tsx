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
import type { VTTLayer } from "@/lib/vtt/types";
import { type VTTTool, useVTTStore } from "@/lib/vtt/vtt-store";
import { cn } from "@/lib/utils";

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
			if (key === "f" && isGM) setActiveTool("fog");
			if (key === "d") setActiveTool("draw");
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isGM, setActiveTool]);

	const tools: { id: VTTTool; label: string; icon: React.ComponentType<{ className?: string }>; shortcut: string; gmOnly?: boolean }[] = [
		{ id: "select", label: "Selecionar & Mover", icon: MousePointer2, shortcut: "V" },
		{ id: "pan", label: "Mão / Mover Câmera", icon: Hand, shortcut: "H" },
		{ id: "ruler", label: "Régua de Medição", icon: Ruler, shortcut: "R" },
		{ id: "ping", label: "Ponteiro Laser (Ping)", icon: Radio, shortcut: "G" },
		{ id: "fog", label: "Névoa de Guerra", icon: Eye, shortcut: "F", gmOnly: true },
		{ id: "draw", label: "Desenhar Formas", icon: Pencil, shortcut: "D" },
	];

	const layers: { id: VTTLayer; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
		{ id: "map", label: "Camada do Mapa", icon: MapIcon },
		{ id: "token", label: "Camada de Tokens", icon: Users },
		{ id: "gm", label: "Camada do Mestre", icon: ShieldAlert },
	];

	return (
		<div className="absolute left-4 top-20 z-30 flex flex-col gap-2 pointer-events-auto select-none animate-in fade-in slide-in-from-left-2 duration-200">
			{/* Main Toolset Card */}
			<div className="flex flex-col gap-1 p-1.5 rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl shadow-2xl">
				{tools
					.filter((t) => !t.gmOnly || isGM)
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

			{/* Layer Switcher Card (GM Only) */}
			{isGM && (
				<div className="flex flex-col gap-1 p-1.5 rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl shadow-2xl">
					<div className="px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest text-white/40">
						Camada
					</div>
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
									"flex h-9 w-10 items-center justify-center rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
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
			)}

			{/* Grid Configuration Toggle (GM Only) */}
			{isGM && (
				<div className="flex flex-col p-1.5 rounded-2xl border border-white/15 bg-black/60 backdrop-blur-xl shadow-2xl">
					<button
						type="button"
						onClick={() => setShowGridSettings(!showGridSettings)}
						title="Configurações do Grid"
						className={cn(
							"flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-150 active:scale-95 cursor-pointer",
							showGridSettings
								? "bg-primary text-primary-foreground"
								: "text-white/70 hover:bg-white/10 hover:text-white",
						)}
					>
						<Grid className="h-4.5 w-4.5" />
					</button>
				</div>
			)}
		</div>
	);
}
