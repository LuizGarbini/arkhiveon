import { ArrowLeft, Compass, Eye, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
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
import type { VTTGridScaleUnit, VTTGridType, VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { cn } from "@/lib/utils";

interface VTTSceneBarProps {
	campaignId: string;
	campaignName: string;
	onCreateScene: (sceneData: Partial<VTTScene>) => Promise<void>;
	onActivateScene: (sceneId: string) => Promise<void>;
}

export function VTTSceneBar({
	campaignId,
	campaignName,
	onCreateScene,
	onActivateScene,
}: VTTSceneBarProps) {
	const { scenes, activeSceneId, setActiveSceneId, isGM } = useVTTStore();

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
			<div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/10 bg-black/60 backdrop-blur-xl pointer-events-auto select-none">
				{/* Left: Back Link & Campaign Name */}
				<div className="flex items-center gap-2.5 shrink-0">
					<Link
						to="/dashboard"
						className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all text-xs font-semibold"
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						<span className="hidden sm:inline">Voltar</span>
					</Link>

					<div className="h-4 w-px bg-white/10" />

					<div className="flex items-center gap-2">
						<span className="font-display font-bold text-sm text-white truncate max-w-[140px] sm:max-w-[200px]">
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
										? "border-primary/60 bg-primary/20 text-white shadow-xs"
										: "border-transparent bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
								)}
							>
								{scene.isActive && (
									<span
										className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"
										title="Cena Ativa para os Jogadores"
									/>
								)}
								<span className="truncate max-w-[120px]">{scene.name}</span>
							</button>
						);
					})}
				</div>

				{/* Right: GM Scene Actions */}
				<div className="flex items-center gap-2 shrink-0">
					{isGM && (
						<>
							{activeScene && !activeScene.isActive && (
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => onActivateScene(activeScene.id)}
									className="text-xs h-8 gap-1.5 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15"
								>
									<Eye className="h-3.5 w-3.5" />
									<span className="hidden md:inline">Ativar p/ Jogadores</span>
								</Button>
							)}

							<Button
								type="button"
								size="sm"
								onClick={() => setIsCreateModalOpen(true)}
								className="text-xs h-8 gap-1.5 rounded-xl font-bold shadow-md shadow-primary/20"
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
							Defina o nome, imagem do mapa e configurações de grid para a nova cena.
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
									onChange={(e) => setNewGridType(e.target.value as VTTGridType)}
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
									onChange={(e) => setNewScaleUnit(e.target.value as VTTGridScaleUnit)}
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
