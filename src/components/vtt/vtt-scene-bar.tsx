import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	Compass,
	Eye,
	MoreHorizontal,
	Plus,
	Sparkles,
	Users,
} from "lucide-react";
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
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Select } from "@/components/ui/select";
import { VTTPresenceBar } from "@/components/vtt/vtt-presence-bar";
import { cn } from "@/lib/utils";
import type { VTTGridScaleUnit, VTTGridType, VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import {
	vttHudClass,
	vttIconButtonActiveClass,
	vttIconButtonClass,
	vttIconButtonIdleClass,
} from "./vtt-chrome";

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
			<div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start gap-2 p-2 md:p-3">
				<div
					className={cn(
						vttHudClass,
						"pointer-events-auto flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2 py-1",
					)}
				>
					<Link
						to="/dashboard"
						className={cn(
							vttIconButtonClass,
							vttIconButtonIdleClass,
							"w-auto shrink-0 gap-1.5 px-3",
						)}
					>
						<ArrowLeft className="h-3.5 w-3.5" />
						<span className="hidden sm:inline text-xs font-semibold">
							Voltar
						</span>
					</Link>

					<div className="hidden h-4 w-px shrink-0 bg-border/70 md:block" />

					<span className="hidden max-w-[140px] truncate font-display text-sm font-bold lg:inline">
						{campaignName}
					</span>

					<Select
						value={activeSceneId ?? ""}
						onChange={(e) => setActiveSceneId(e.target.value || null)}
						className="h-11 min-w-0 flex-1 md:max-w-64"
						aria-label="Cena ativa"
					>
						{scenes.length === 0 ? (
							<option value="">Sem cenas</option>
						) : (
							scenes.map((scene) => (
								<option key={scene.id} value={scene.id}>
									{scene.isActive ? "● " : ""}
									{scene.name}
								</option>
							))
						)}
					</Select>
				</div>

				<div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
					<VTTPresenceBar onFocusPoint={onFocusPoint} />

					{activeScene && (
						<button
							type="button"
							onClick={() => setShowRosterDrawer(!showRosterDrawer)}
							title="Personagens e NPCs"
							className={cn(
								vttHudClass,
								vttIconButtonClass,
								"w-auto gap-1.5 px-3",
								showRosterDrawer
									? vttIconButtonActiveClass
									: vttIconButtonIdleClass,
							)}
						>
							<Users className="h-4 w-4" />
							<span className="hidden lg:inline text-xs font-semibold">
								Elenco
							</span>
						</button>
					)}

					{isGM && (
						<Popover>
							<PopoverTrigger
								title="Ações da mesa"
								className={cn(
									vttHudClass,
									vttIconButtonClass,
									vttIconButtonIdleClass,
								)}
							>
								<MoreHorizontal className="h-4 w-4" />
							</PopoverTrigger>
							<PopoverContent
								align="end"
								className="w-56 space-y-1.5 rounded-2xl border border-border/70 bg-card/95 p-2"
							>
								{activeScene && !activeScene.isActive && (
									<button
										type="button"
										onClick={() => void onActivateScene(activeScene.id)}
										className={cn(
											vttIconButtonClass,
											vttIconButtonIdleClass,
											"h-11 w-full justify-start gap-2 px-3",
										)}
									>
										<Eye className="h-4 w-4 text-primary" />
										<span className="text-xs font-semibold">
											Ativar para jogadores
										</span>
									</button>
								)}
								<button
									type="button"
									onClick={() => setIsCreateModalOpen(true)}
									className={cn(
										vttIconButtonClass,
										vttIconButtonIdleClass,
										"h-11 w-full justify-start gap-2 px-3",
									)}
								>
									<Plus className="h-4 w-4 text-primary" />
									<span className="text-xs font-semibold">Nova cena</span>
								</button>
							</PopoverContent>
						</Popover>
					)}
				</div>
			</div>

			<Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display text-lg flex items-center gap-2">
							<Compass className="h-5 w-5 text-primary" />
							Criar nova cena
						</DialogTitle>
						<DialogDescription className="text-sm text-muted-foreground">
							Nome, mapa e grid da nova cena de combate.
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleCreate} className="space-y-4 pt-2">
						<Field label="Nome da Cena">
							<Input
								placeholder="Ex: Taverna do Javali Bêbado"
								value={newSceneName}
								onChange={(e) => setNewSceneName(e.target.value)}
								required
								className="h-11"
							/>
						</Field>

						<Field label="URL da Imagem do Mapa (Opcional)">
							<Input
								placeholder="https://exemplo.com/mapa.jpg"
								value={newMapUrl}
								onChange={(e) => setNewMapUrl(e.target.value)}
								className="h-11"
							/>
						</Field>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Field label="Tipo de Grid">
								<Select
									value={newGridType}
									onChange={(e) =>
										setNewGridType(e.target.value as VTTGridType)
									}
									className="h-11"
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
									className="h-11"
								/>
							</Field>
						</div>

						<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
							<Field label="Escala por Célula">
								<Input
									type="number"
									step="0.5"
									min="0.5"
									value={newScaleDistance}
									onChange={(e) => setNewScaleDistance(Number(e.target.value))}
									className="h-11"
								/>
							</Field>

							<Field label="Unidade de Medida">
								<Select
									value={newScaleUnit}
									onChange={(e) =>
										setNewScaleUnit(e.target.value as VTTGridScaleUnit)
									}
									className="h-11"
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
