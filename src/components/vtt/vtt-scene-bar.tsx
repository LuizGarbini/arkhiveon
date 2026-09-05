import { Link } from "@tanstack/react-router";
import { ArrowLeft, Compass, Eye, Plus, Sparkles, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/form-tabs";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { VTTPresenceBar } from "@/components/vtt/vtt-presence-bar";
import { cn } from "@/lib/utils";
import type { VTTGridScaleUnit, VTTGridType, VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTSceneBarProps {
	campaignId: string;
	campaignName: string;
	onCreateScene: (sceneData: Partial<VTTScene>) => Promise<void>;
	onActivateScene: (sceneId: string) => Promise<void>;
	onFocusPoint?: (x: number, y: number) => void;
}

export function VTTSceneBar({
	campaignId,
	campaignName,
	onCreateScene,
	onActivateScene,
	onFocusPoint,
}: VTTSceneBarProps) {
	const {
		scenes,
		activeSceneId,
		setActiveSceneId,
		isGM,
		showRosterDrawer,
		setShowRosterDrawer,
	} = useVTTStore();

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [newSceneName, setNewSceneName] = useState("");
	const [newMapUrl, setNewMapUrl] = useState("");
	const [newGridType, setNewGridType] = useState<VTTGridType>("square");
	const [newGridSize, setNewGridSize] = useState(70);
	const [newScaleDistance, setNewScaleDistance] = useState(1.5);
	const [newScaleUnit, setNewScaleUnit] = useState<VTTGridScaleUnit>("m");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const activeScene = scenes.find((s) => s.id === activeSceneId);

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newSceneName.trim()) return;

		setIsSubmitting(true);
		try {
			await onCreateScene({
				campaignId,
				name: newSceneName.trim(),
				mapImageUrl: newMapUrl.trim() || null,
				gridType: newGridType,
				gridSize: Number(newGridSize) || 70,
				gridScaleDistance: Number(newScaleDistance) || 1.5,
				gridScaleUnit: newScaleUnit,
				width: 4000,
				height: 4000,
				isActive: scenes.length === 0,
			});

			setIsCreateModalOpen(false);
			setNewSceneName("");
			setNewMapUrl("");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<div className="absolute top-0 inset-x-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border/70 bg-card/80 px-4 py-2 backdrop-blur-md pointer-events-auto select-none">
				{/* Left: Back Link & Campaign Name */}
				<div className="flex items-center gap-2.5 shrink-0">
					<Link
						to="/dashboard"
						className="flex min-h-11 items-center gap-1.5 rounded-xl border border-border/70 bg-background/50 px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Voltar</span>
					</Link>

					<div className="h-4 w-px bg-border/70" />

					<div className="flex items-center gap-2">
						<span className="font-display font-bold text-sm text-foreground truncate max-w-[140px] sm:max-w-[200px]">
							{campaignName}
						</span>
						<span className="px-2 py-0.5 rounded-full border border-primary/40 bg-primary/20 text-primary text-[9px] font-extrabold tracking-wider uppercase">
							Tabletop
						</span>
					</div>
				</div>

				{/* Center: Scenes Tabs (Horizontal list) */}
				<div className="flex items-center gap-1.5 overflow-x-auto max-w-xl scrollbar-none py-0.5">
					{scenes.map((scene) => {
						const isSelected = scene.id === activeSceneId;
						return (
							<button
								type="button"
								key={scene.id}
								onClick={() => setActiveSceneId(scene.id)}
								className={cn(
									"flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 border cursor-pointer",
									isSelected
										? "border-primary/60 bg-primary/15 text-foreground shadow-xs"
										: "border-transparent bg-background/40 text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								{scene.isActive && (
									<span
										className="h-2 w-2 rounded-full bg-primary"
										title="Cena Ativa para os Jogadores"
									/>
								)}
								<span className="truncate max-w-[120px]">{scene.name}</span>
							</button>
						);
					})}
				</div>

				{/* Right: GM Scene Actions & Roster Toggle */}
				<div className="flex items-center gap-2 shrink-0">
					<VTTPresenceBar onFocusPoint={onFocusPoint} />

					{activeScene && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => setShowRosterDrawer(!showRosterDrawer)}
							className={cn(
								"h-11 gap-1.5 rounded-xl text-xs transition-all duration-150 ease-out",
								showRosterDrawer
									? "border-primary bg-primary text-primary-foreground"
									: "border-border/70 bg-background/50 text-foreground hover:bg-muted",
							)}
						>
							<Users className="h-3.5 w-3.5" />
							<span className="hidden md:inline">Personagens & NPCs</span>
						</Button>
					)}

					{isGM && (
						<>
							{activeScene && !activeScene.isActive && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => onActivateScene(activeScene.id)}
									className="h-11 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
								>
									<Eye className="h-3.5 w-3.5" />
									<span className="hidden md:inline">Ativar p/ Jogadores</span>
								</Button>
							)}

							<Button
								type="button"
								size="sm"
								onClick={() => setIsCreateModalOpen(true)}
								className="h-11 gap-1.5 rounded-xl text-xs font-bold shadow-md shadow-primary/20"
							>
								<Plus className="h-3.5 w-3.5" />
								<span className="hidden sm:inline">Nova Cena</span>
							</Button>
						</>
					)}
				</div>
			</div>

			{/* Create Scene Modal */}
			<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display text-lg flex items-center gap-2">
							<Compass className="h-5 w-5 text-primary" />
							Criar Nova Cena de Combate
						</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							Defina o nome, imagem do mapa e configurações de grid para a nova
							cena.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleCreate} className="space-y-4 pt-2">
						<Field label="Nome da Cena">
							<Input
								placeholder="Ex: Taverna do Javali Bêbado"
								value={newSceneName}
								onChange={(e) => setNewSceneName(e.target.value)}
								required
								className="h-9 text-xs"
							/>
						</Field>

						<Field label="URL da Imagem do Mapa (Opcional)">
							<Input
								placeholder="https://exemplo.com/mapa.jpg"
								value={newMapUrl}
								onChange={(e) => setNewMapUrl(e.target.value)}
								className="h-9 text-xs"
							/>
						</Field>

						<div className="grid grid-cols-2 gap-3">
							<Field label="Tipo de Grid">
								<Select
									value={newGridType}
									onChange={(e) =>
										setNewGridType(e.target.value as VTTGridType)
									}
									className="h-9 text-xs"
								>
									<option value="square">Quadrado (Padrão)</option>
									<option value="hex_pointy">Hexagonal (Pontudo)</option>
									<option value="hex_flat">Hexagonal (Plano)</option>
									<option value="none">Sem Grid (Livre)</option>
								</Select>
							</Field>

							<Field label="Tamanho da Célula (px)">
								<Input
									type="number"
									min={30}
									max={200}
									value={newGridSize}
									onChange={(e) => setNewGridSize(Number(e.target.value))}
									className="h-9 text-xs"
								/>
							</Field>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<Field label="Escala por Célula">
								<Input
									type="number"
									step="0.5"
									min="0.5"
									value={newScaleDistance}
									onChange={(e) => setNewScaleDistance(Number(e.target.value))}
									className="h-9 text-xs"
								/>
							</Field>

							<Field label="Unidade de Medida">
								<Select
									value={newScaleUnit}
									onChange={(e) =>
										setNewScaleUnit(e.target.value as VTTGridScaleUnit)
									}
									className="h-9 text-xs"
								>
									<option value="m">Metros (m)</option>
									<option value="ft">Pés (ft)</option>
									<option value="sq">Quadrados (sq)</option>
								</Select>
							</Field>
						</div>

						<div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => setIsCreateModalOpen(false)}
								disabled={isSubmitting}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								size="sm"
								disabled={isSubmitting}
								className="gap-1.5"
							>
								<Sparkles className="h-3.5 w-3.5" />
								{isSubmitting ? "Criando..." : "Criar Cena"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
}
