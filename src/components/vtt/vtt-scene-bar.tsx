import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	BookOpen,
	Compass,
	Eye,
	Plus,
	Sparkles,
	Trash2,
	Users,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { nearestScrollLeft } from "@/lib/vtt/scene-bar-scroll";
import { newSceneId } from "@/lib/vtt/scene-create";
import { checkSceneDelete } from "@/lib/vtt/scene-delete";
import type { VTTGridScaleUnit, VTTGridType, VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTSceneBarProps {
	campaignId: string;
	campaignName: string;
	onCreateScene: (sceneData: Partial<VTTScene>) => Promise<void>;
	onActivateScene: (sceneId: string) => Promise<void>;
	onDeleteScene: (sceneId: string) => Promise<void>;
	onOpenJournal: () => void;
	onFocusPoint?: (x: number, y: number) => void;
}

export function VTTSceneBar({
	campaignId,
	campaignName,
	onCreateScene,
	onActivateScene,
	onDeleteScene,
	onFocusPoint,
	onOpenJournal,
}: VTTSceneBarProps) {
	const scenes = useVTTStore((s) => s.scenes);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const setActiveSceneId = useVTTStore((s) => s.setActiveSceneId);
	const isGM = useVTTStore((s) => s.isGM);
	const showRosterDrawer = useVTTStore((s) => s.showRosterDrawer);
	const setShowRosterDrawer = useVTTStore((s) => s.setShowRosterDrawer);

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [newSceneName, setNewSceneName] = useState("");
	const [newMapUrl, setNewMapUrl] = useState("");
	const [newGridType, setNewGridType] = useState<VTTGridType>("square");
	const [newGridSize, setNewGridSize] = useState(70);
	const [newScaleDistance, setNewScaleDistance] = useState(1.5);
	const [newScaleUnit, setNewScaleUnit] = useState<VTTGridScaleUnit>("m");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isActivating, setIsActivating] = useState(false);
	// Scene waiting for the GM to confirm its deletion.
	const [sceneToDelete, setSceneToDelete] = useState<VTTScene | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	// Id of the scene being drafted in the dialog, kept across retries so a
	// create that already landed is not inserted twice.
	const draftSceneIdRef = useRef<string | null>(null);

	const activeScene = scenes.find((s) => s.id === activeSceneId);
	const liveSceneId = scenes.find((s) => s.isActive)?.id ?? null;
	const sceneNavRef = useRef<HTMLElement>(null);

	// Keep the in-play scene ("Em jogo") visible in the scene bar on load and
	// whenever another scene goes live; selecting a scene never scrolls. Only
	// the bar's own scrollLeft changes, so the page and ancestors stay put.
	useEffect(() => {
		const nav = sceneNavRef.current;
		if (!nav || !liveSceneId) return;
		const frame = requestAnimationFrame(() => {
			const button = [
				...nav.querySelectorAll<HTMLElement>("[data-scene-id]"),
			].find((el) => el.dataset.sceneId === liveSceneId);
			if (!button) return;
			const navRect = nav.getBoundingClientRect();
			const rect = button.getBoundingClientRect();
			const next = nearestScrollLeft(
				{
					scrollLeft: nav.scrollLeft,
					clientWidth: nav.clientWidth,
					scrollWidth: nav.scrollWidth,
				},
				{
					left: rect.left - navRect.left - nav.clientLeft + nav.scrollLeft,
					width: rect.width,
				},
			);
			if (next !== nav.scrollLeft) nav.scrollLeft = next;
		});
		return () => cancelAnimationFrame(frame);
	}, [liveSceneId]);

	const deleteCheck = sceneToDelete
		? checkSceneDelete(sceneToDelete, scenes)
		: null;

	const handleConfirmDelete = async () => {
		if (!sceneToDelete || !deleteCheck?.allowed || isDeleting) return;
		setIsDeleting(true);
		setDeleteError(null);
		try {
			await onDeleteScene(sceneToDelete.id);
			setSceneToDelete(null);
		} catch (error) {
			setDeleteError(
				error instanceof Error
					? error.message
					: "Não foi possível excluir a cena. Ela foi mantida na mesa.",
			);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newSceneName.trim() || isSubmitting) return;

		draftSceneIdRef.current ??= newSceneId();
		setIsSubmitting(true);
		setError(null);
		try {
			await onCreateScene({
				id: draftSceneIdRef.current,
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

			draftSceneIdRef.current = null;
			setIsCreateModalOpen(false);
			setNewSceneName("");
			setNewMapUrl("");
		} catch (error) {
			setError(
				error instanceof Error
					? error.message
					: "Não foi possível criar a cena. Tente novamente.",
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<header className="absolute inset-x-0 top-0 z-30 border-b border-border/70 bg-card/95 backdrop-blur-md select-none">
				<div className="flex h-16 items-center justify-between gap-2 px-3 sm:px-5">
					<div className="flex min-w-0 items-center gap-3">
						<Link
							to="/dashboard"
							aria-label="Voltar à campanha"
							className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border/70 text-muted-foreground hover:bg-accent focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
						>
							<ArrowLeft className="size-4" />
						</Link>
						<div className="min-w-0">
							<p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
								Arkhiveon · Table Top
							</p>
							<h1 className="truncate font-display text-base font-bold sm:text-lg">
								{campaignName}
							</h1>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-2">
						<div className="hidden lg:block">
							<VTTPresenceBar onFocusPoint={onFocusPoint} />
						</div>
						{isGM && (
							<Button
								variant="outline"
								onClick={onOpenJournal}
								aria-label="Diário da campanha"
								className="size-11 rounded-xl px-0 sm:w-auto sm:px-3"
							>
								<BookOpen className="size-4" />
								<span className="hidden sm:inline">Diário</span>
							</Button>
						)}
						{activeScene && (
							<Button
								variant={showRosterDrawer ? "default" : "outline"}
								onClick={() => setShowRosterDrawer(!showRosterDrawer)}
								aria-label="Personagens e NPCs"
								aria-expanded={showRosterDrawer}
								className="size-11 rounded-xl px-0 sm:w-auto sm:px-3"
							>
								<Users className="size-4" />
								<span className="hidden sm:inline">Biblioteca</span>
							</Button>
						)}
					</div>
				</div>
				<div className="flex h-14 items-center gap-2 border-t border-border/50 px-3 sm:px-5">
					<span className="hidden text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:block">
						Cenas
					</span>
					<nav
						ref={sceneNavRef}
						aria-label="Cenas da mesa"
						className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
					>
						{scenes
							.filter((scene) => isGM || scene.isActive)
							.map((scene) => (
								<button
									type="button"
									key={scene.id}
									data-scene-id={scene.id}
									onClick={() => setActiveSceneId(scene.id)}
									aria-pressed={scene.id === activeSceneId}
									className={cn(
										"flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]",
										scene.id === activeSceneId
											? "border-primary/40 bg-primary/10 text-foreground"
											: "border-transparent text-muted-foreground hover:bg-accent",
									)}
								>
									<Compass className="size-4 shrink-0" />
									<span className="max-w-36 truncate">{scene.name}</span>
									<span
										className={cn(
											"shrink-0 whitespace-nowrap rounded-md px-1 py-0.5 text-[10px] sm:px-1.5 sm:py-1",
											scene.isActive
												? "bg-primary/15 text-primary"
												: "bg-muted text-muted-foreground",
										)}
									>
										{scene.isActive ? "Em jogo" : "Preparação"}
									</span>
								</button>
							))}
						{scenes.length === 0 && (
							<span className="text-xs text-muted-foreground">
								Sua história começa com uma cena
							</span>
						)}
					</nav>
					{isGM && (
						<>
							{activeScene && !activeScene.isActive && (
								<Button
									variant="outline"
									aria-label="Exibir cena aos jogadores"
									disabled={isActivating}
									className="h-11 shrink-0 rounded-xl px-3"
									onClick={async () => {
										setIsActivating(true);
										setError(null);
										try {
											await onActivateScene(activeScene.id);
										} catch (error) {
											setError(
												error instanceof Error
													? error.message
													: "Não foi possível exibir a cena.",
											);
										} finally {
											setIsActivating(false);
										}
									}}
								>
									<Eye className="size-4" />
									<span className="hidden md:inline">
										{isActivating ? "Exibindo…" : "Exibir aos jogadores"}
									</span>
								</Button>
							)}
							{activeScene && (
								<Button
									variant="outline"
									aria-label="Excluir cena"
									className="size-11 shrink-0 rounded-xl px-0 lg:w-auto lg:px-3"
									onClick={() => {
										setDeleteError(null);
										setSceneToDelete(activeScene);
									}}
								>
									<Trash2 className="size-4" />
									<span className="hidden lg:inline">Excluir</span>
								</Button>
							)}
							<Button
								aria-label="Nova cena"
								onClick={() => {
									setError(null);
									draftSceneIdRef.current = null;
									setIsCreateModalOpen(true);
								}}
								className="h-11 shrink-0 rounded-xl px-3"
							>
								<Plus className="size-4" />
								<span className="hidden sm:inline">Nova cena</span>
							</Button>
						</>
					)}
				</div>
				{error && !isCreateModalOpen && (
					<p
						role="alert"
						className="border-t border-destructive/30 bg-card px-4 py-2 text-sm text-destructive"
					>
						{error}
					</p>
				)}
			</header>

			{/* Delete Scene Confirmation */}
			<Dialog
				open={sceneToDelete !== null}
				onOpenChange={(open) => {
					if (!open && !isDeleting) setSceneToDelete(null);
				}}
			>
				<DialogContent className="vtt-dialog max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display text-lg flex items-center gap-2 pr-12 break-words">
							<Trash2 className="h-5 w-5 text-destructive" />
							Excluir a cena “{sceneToDelete?.name}”?
						</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							{deleteCheck?.allowed
								? "Os tokens e a névoa desta cena também são apagados. Não dá para desfazer."
								: "Esta cena não pode ser excluída agora."}
						</DialogDescription>
					</DialogHeader>
					{deleteCheck && !deleteCheck.allowed && (
						<p role="alert" className="text-sm text-foreground">
							{deleteCheck.reason}
						</p>
					)}
					{deleteCheck?.allowed && deleteCheck.warning && (
						<p className="text-sm text-foreground">{deleteCheck.warning}</p>
					)}
					{deleteError && (
						<p role="alert" className="text-sm text-destructive">
							{deleteError}
						</p>
					)}
					<div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
						<Button
							type="button"
							variant="ghost"
							className="h-11 px-4"
							disabled={isDeleting}
							onClick={() => setSceneToDelete(null)}
						>
							{deleteCheck?.allowed ? "Cancelar" : "Entendi"}
						</Button>
						{deleteCheck?.allowed && (
							<Button
								type="button"
								variant="destructive"
								className="h-11 gap-1.5 px-4"
								disabled={isDeleting}
								onClick={handleConfirmDelete}
							>
								<Trash2 className="h-3.5 w-3.5" />
								{isDeleting ? "Excluindo..." : "Excluir cena"}
							</Button>
						)}
					</div>
				</DialogContent>
			</Dialog>

			{/* Create Scene Modal */}
			<Dialog
				open={isCreateModalOpen}
				onOpenChange={(open) => {
					setIsCreateModalOpen(open);
					if (!open) setError(null);
				}}
			>
				<DialogContent className="vtt-dialog max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display text-lg flex items-center gap-2">
							<Compass className="h-5 w-5 text-primary" />
							Preparar uma nova cena
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
								className="h-11 text-base"
							/>
						</Field>

						<Field label="URL da Imagem do Mapa (Opcional)">
							<Input
								placeholder="https://exemplo.com/mapa.jpg"
								value={newMapUrl}
								onChange={(e) => setNewMapUrl(e.target.value)}
								className="h-11 text-base"
							/>
						</Field>

						<div className="grid grid-cols-2 gap-3">
							<Field label="Tipo de Grid">
								<Select
									value={newGridType}
									onChange={(e) =>
										setNewGridType(e.target.value as VTTGridType)
									}
									className="h-11 text-base"
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
									className="h-11 text-base"
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
									className="h-11 text-base"
								/>
							</Field>

							<Field label="Unidade de Medida">
								<Select
									value={newScaleUnit}
									onChange={(e) =>
										setNewScaleUnit(e.target.value as VTTGridScaleUnit)
									}
									className="h-11 text-base"
								>
									<option value="m">Metros (m)</option>
									<option value="ft">Pés (ft)</option>
									<option value="sq">Quadrados (sq)</option>
								</Select>
							</Field>
						</div>

						{error && (
							<p role="alert" className="text-sm text-destructive">
								{error}
							</p>
						)}
						<div className="flex items-center justify-end gap-2 pt-3 border-t border-border/40">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									setIsCreateModalOpen(false);
									setError(null);
								}}
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
