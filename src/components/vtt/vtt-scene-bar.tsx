import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	BookOpen,
	Compass,
	Eye,
	FolderPlus,
	Plus,
	Sparkles,
	Trash2,
	Users,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
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
import { SceneFolderStrip } from "@/components/vtt/scene-folder-strip";
import {
	useMapUpload,
	VTTMapDropzone,
	type VTTMapImage,
} from "@/components/vtt/vtt-map-dropzone";
import { VTTPresenceBar } from "@/components/vtt/vtt-presence-bar";
import { cn } from "@/lib/utils";
import { nearestScrollLeft } from "@/lib/vtt/scene-bar-scroll";
import { newSceneId } from "@/lib/vtt/scene-create";
import { checkSceneDelete } from "@/lib/vtt/scene-delete";
import { groupSceneBar, normalizeFolderName } from "@/lib/vtt/scene-folders";
import type {
	VTTGridScaleUnit,
	VTTGridType,
	VTTScene,
	VTTSceneFolder,
} from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

interface VTTSceneBarProps {
	campaignId: string;
	campaignName: string;
	onCreateScene: (sceneData: Partial<VTTScene>) => Promise<void>;
	onActivateScene: (sceneId: string) => Promise<void>;
	onDeleteScene: (sceneId: string) => Promise<void>;
	onCreateFolder: (input: { id: string; name: string }) => Promise<void>;
	onRenameFolder: (folderId: string, name: string) => Promise<void>;
	onDeleteFolder: (folderId: string) => Promise<void>;
	onMoveScene: (sceneId: string, folderId: string | null) => Promise<void>;
	onOpenJournal: () => void;
	onFocusPoint?: (x: number, y: number) => void;
}

export function VTTSceneBar({
	campaignId,
	campaignName,
	onCreateScene,
	onActivateScene,
	onDeleteScene,
	onCreateFolder,
	onRenameFolder,
	onDeleteFolder,
	onMoveScene,
	onFocusPoint,
	onOpenJournal,
}: VTTSceneBarProps) {
	const scenes = useVTTStore((s) => s.scenes);
	const sceneFolders = useVTTStore((s) => s.sceneFolders);
	const activeSceneId = useVTTStore((s) => s.activeSceneId);
	const setActiveSceneId = useVTTStore((s) => s.setActiveSceneId);
	const isGM = useVTTStore((s) => s.isGM);
	const showRosterDrawer = useVTTStore((s) => s.showRosterDrawer);
	const setShowRosterDrawer = useVTTStore((s) => s.setShowRosterDrawer);

	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [newSceneName, setNewSceneName] = useState("");
	const [newMap, setNewMap] = useState<VTTMapImage | null>(null);
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
	const [createFolderOpen, setCreateFolderOpen] = useState(false);
	const [folderName, setFolderName] = useState("");
	const [folderToRename, setFolderToRename] = useState<VTTSceneFolder | null>(
		null,
	);
	const [renameName, setRenameName] = useState("");
	const [folderToDelete, setFolderToDelete] = useState<VTTSceneFolder | null>(
		null,
	);
	const [folderBusy, setFolderBusy] = useState<
		"create" | "rename" | "delete" | null
	>(null);
	const [folderError, setFolderError] = useState<string | null>(null);
	const [movingSceneId, setMovingSceneId] = useState<string | null>(null);
	const draftFolderIdRef = useRef<string | null>(null);
	const folderNameId = useId();
	const renameFolderId = useId();
	// Id of the scene being drafted in the dialog, kept across retries so a
	// create that already landed is not inserted twice.
	const draftSceneIdRef = useRef<string | null>(null);
	// Map file dropped or picked in the create dialog. The scene is only
	// created on "Criar Cena"; cancelling mid-upload creates nothing.
	const mapUpload = useMapUpload(campaignId, (map) => {
		setNewMap(map);
		setNewSceneName((name) => name || map.name);
	});

	const closeCreateModal = () => {
		mapUpload.cancel();
		setIsCreateModalOpen(false);
		setError(null);
		setNewMap(null);
	};

	const activeScene = scenes.find((s) => s.id === activeSceneId);
	const liveScene = scenes.find((s) => s.isActive);
	// O co-mestre vê a mesa como jogador: não cria nem organiza cenas.
	const canManageScenes = isGM;
	const sceneBar = useMemo(() => {
		const grouped = groupSceneBar(scenes, sceneFolders, canManageScenes);
		const entries = [
			...grouped.rootScenes.map((scene) => ({
				kind: "scene" as const,
				scene,
			})),
			...grouped.folders.map((entry) => ({
				kind: "folder" as const,
				folder: entry.folder,
				scenes: entry.scenes,
			})),
		];
		return { entries };
	}, [scenes, sceneFolders, canManageScenes]);
	const liveSceneId = liveScene?.id ?? null;
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

	const handleMoveScene = async (sceneId: string, folderId: string | null) => {
		if (movingSceneId) return;
		setMovingSceneId(sceneId);
		setError(null);
		try {
			await onMoveScene(sceneId, folderId);
		} catch (moveError) {
			setError(
				moveError instanceof Error
					? moveError.message
					: "Não foi possível mover a cena.",
			);
		} finally {
			setMovingSceneId(null);
		}
	};

	const handleCreateFolder = async (event: React.FormEvent) => {
		event.preventDefault();
		if (folderBusy) return;
		const parsed = normalizeFolderName(folderName);
		if (!parsed.ok) {
			setFolderError(parsed.reason);
			return;
		}
		draftFolderIdRef.current ??= newSceneId();
		setFolderBusy("create");
		setFolderError(null);
		try {
			await onCreateFolder({
				id: draftFolderIdRef.current,
				name: parsed.name,
			});
			draftFolderIdRef.current = null;
			setCreateFolderOpen(false);
			setFolderName("");
		} catch (createError) {
			setFolderError(
				createError instanceof Error
					? createError.message
					: "Não foi possível criar a pasta.",
			);
		} finally {
			setFolderBusy(null);
		}
	};

	const handleRenameFolder = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!folderToRename || folderBusy) return;
		const parsed = normalizeFolderName(renameName);
		if (!parsed.ok) {
			setFolderError(parsed.reason);
			return;
		}
		setFolderBusy("rename");
		setFolderError(null);
		try {
			await onRenameFolder(folderToRename.id, parsed.name);
			setFolderToRename(null);
		} catch (renameError) {
			setFolderError(
				renameError instanceof Error
					? renameError.message
					: "Não foi possível renomear a pasta.",
			);
		} finally {
			setFolderBusy(null);
		}
	};

	const handleDeleteFolder = async () => {
		if (!folderToDelete || folderBusy) return;
		setFolderBusy("delete");
		setFolderError(null);
		try {
			await onDeleteFolder(folderToDelete.id);
			setFolderToDelete(null);
		} catch (deleteFolderError) {
			setFolderError(
				deleteFolderError instanceof Error
					? deleteFolderError.message
					: "Não foi possível excluir a pasta.",
			);
		} finally {
			setFolderBusy(null);
		}
	};

	const handleCreate = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!newSceneName.trim() || isSubmitting || mapUpload.isUploading) return;

		draftSceneIdRef.current ??= newSceneId();
		setIsSubmitting(true);
		setError(null);
		try {
			await onCreateScene({
				id: draftSceneIdRef.current,
				campaignId,
				name: newSceneName.trim(),
				mapImageUrl: newMap?.url ?? null,
				gridType: newGridType,
				gridSize: Number(newGridSize) || 70,
				gridScaleDistance: Number(newScaleDistance) || 1.5,
				gridScaleUnit: newScaleUnit,
				width: newMap?.width ?? 4000,
				height: newMap?.height ?? 4000,
				isActive: scenes.length === 0,
			});

			draftSceneIdRef.current = null;
			setIsCreateModalOpen(false);
			setNewSceneName("");
			setNewMap(null);
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
							className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-foreground"
						>
							<ArrowLeft className="size-4" />
						</Link>
						<div className="min-w-0 leading-tight">
							<h1 className="truncate font-display text-base font-semibold sm:text-lg">
								{campaignName}
							</h1>
							<p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
								<span
									aria-hidden
									className={cn(
										"size-1.5 shrink-0 rounded-full",
										liveScene ? "bg-primary" : "bg-muted-foreground/60",
									)}
								/>
								<span className="truncate">
									{liveScene
										? `Jogadores veem: ${liveScene.name}`
										: "Nenhuma cena em jogo"}
								</span>
							</p>
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
				<div className="grid h-14 min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-t border-border/50 px-3 sm:px-5">
					<div className="flex min-w-0 items-center gap-2">
						<span className="hidden shrink-0 pr-1 text-xs font-medium text-muted-foreground sm:block">
							Cenas
						</span>
						<nav
							ref={sceneNavRef}
							aria-label="Cenas da mesa"
							className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						>
							<SceneFolderStrip
								entries={sceneBar.entries}
								activeSceneId={activeSceneId}
								canManage={canManageScenes}
								folders={sceneFolders}
								movingSceneId={movingSceneId}
								onSelectScene={setActiveSceneId}
								onMoveScene={(sceneId, folderId) => {
									void handleMoveScene(sceneId, folderId);
								}}
								onRenameFolder={(folder) => {
									setFolderError(null);
									setRenameName(folder.name);
									setFolderToRename(folder);
								}}
								onDeleteFolder={(folder) => {
									setFolderError(null);
									setFolderToDelete(folder);
								}}
							/>
							{sceneBar.entries.length === 0 && (
								<span className="truncate text-xs text-muted-foreground">
									{canManageScenes
										? "Sua história começa com uma cena. Crie uma pasta para a barra não crescer."
										: "Sua história começa com uma cena"}
								</span>
							)}
						</nav>
					</div>
					{isGM && (
						<div
							data-scene-actions
							className="flex shrink-0 items-center gap-2"
						>
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
								type="button"
								variant="outline"
								aria-label="Nova pasta"
								onClick={() => {
									setFolderError(null);
									setFolderName("");
									draftFolderIdRef.current = null;
									setCreateFolderOpen(true);
								}}
								className="h-11 shrink-0 rounded-xl px-3"
							>
								<FolderPlus className="size-4" />
								<span className="hidden sm:inline">Nova pasta</span>
							</Button>
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
						</div>
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

			<Dialog
				open={createFolderOpen}
				onOpenChange={(open) => {
					if (open) setCreateFolderOpen(true);
					else if (!folderBusy) setCreateFolderOpen(false);
				}}
			>
				<DialogContent className="vtt-dialog max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 font-display text-lg">
							<FolderPlus className="h-5 w-5 text-primary" />
							Nova pasta
						</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							As cenas dentro da pasta ficam recolhidas. A barra mostra a pasta,
							não cada mapa.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleCreateFolder} className="space-y-4 pt-2">
						<Field label="Nome da pasta" htmlFor={folderNameId}>
							<Input
								id={folderNameId}
								value={folderName}
								onChange={(event) => setFolderName(event.target.value)}
								required
								spellCheck={false}
								autoComplete="off"
								maxLength={80}
								placeholder="Ex: Masmorra, Cidade, Viagem"
								className="h-11 text-base"
							/>
						</Field>
						{folderError && createFolderOpen ? (
							<p role="alert" className="text-sm text-destructive">
								{folderError}
							</p>
						) : null}
						<div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
							<Button
								type="button"
								variant="ghost"
								className="h-11 px-4"
								disabled={folderBusy === "create"}
								onClick={() => setCreateFolderOpen(false)}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								className="h-11 px-4"
								disabled={folderBusy === "create" || !folderName.trim()}
							>
								{folderBusy === "create" ? "Criando..." : "Criar pasta"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={folderToRename !== null}
				onOpenChange={(open) => {
					if (!open && folderBusy !== "rename") setFolderToRename(null);
				}}
			>
				<DialogContent className="vtt-dialog max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display text-lg">
							Renomear pasta
						</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							As cenas continuam dentro dela.
						</DialogDescription>
					</DialogHeader>
					<form onSubmit={handleRenameFolder} className="space-y-4 pt-2">
						<Field label="Nome da pasta" htmlFor={renameFolderId}>
							<Input
								id={renameFolderId}
								value={renameName}
								onChange={(event) => setRenameName(event.target.value)}
								required
								spellCheck={false}
								autoComplete="off"
								maxLength={80}
								className="h-11 text-base"
							/>
						</Field>
						{folderError && folderToRename ? (
							<p role="alert" className="text-sm text-destructive">
								{folderError}
							</p>
						) : null}
						<div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
							<Button
								type="button"
								variant="ghost"
								className="h-11 px-4"
								disabled={folderBusy === "rename"}
								onClick={() => setFolderToRename(null)}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								className="h-11 px-4"
								disabled={folderBusy === "rename" || !renameName.trim()}
							>
								{folderBusy === "rename" ? "Salvando..." : "Salvar"}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog
				open={folderToDelete !== null}
				onOpenChange={(open) => {
					if (!open && folderBusy !== "delete") setFolderToDelete(null);
				}}
			>
				<DialogContent className="vtt-dialog max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2 pr-12 font-display text-lg">
							<Trash2 className="h-5 w-5 shrink-0 text-destructive" />
							<span className="min-w-0 break-words">
								Excluir a pasta “{folderToDelete?.name}”?
							</span>
						</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							As cenas voltam para a barra, fora da pasta. O mapa não é apagado.
						</DialogDescription>
					</DialogHeader>
					{folderError && folderToDelete ? (
						<p role="alert" className="text-sm text-destructive">
							{folderError}
						</p>
					) : null}
					<div className="flex items-center justify-end gap-2 border-t border-border/40 pt-3">
						<Button
							type="button"
							variant="ghost"
							className="h-11 px-4"
							disabled={folderBusy === "delete"}
							onClick={() => setFolderToDelete(null)}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							variant="destructive"
							className="h-11 px-4"
							disabled={folderBusy === "delete"}
							onClick={() => {
								void handleDeleteFolder();
							}}
						>
							{folderBusy === "delete" ? "Excluindo..." : "Excluir pasta"}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Delete Scene Confirmation */}
			<Dialog
				open={sceneToDelete !== null}
				onOpenChange={(open) => {
					if (!open && !isDeleting) setSceneToDelete(null);
				}}
			>
				<DialogContent className="vtt-dialog max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display text-lg flex items-center gap-2 pr-12">
							<Trash2 className="h-5 w-5 shrink-0 text-destructive" />
							<span className="min-w-0 break-words">
								Excluir a cena “{sceneToDelete?.name}”?
							</span>
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
					if (open) setIsCreateModalOpen(true);
					else if (!isSubmitting) closeCreateModal();
				}}
			>
				<DialogContent className="vtt-dialog max-w-md">
					<DialogHeader>
						<DialogTitle className="font-display text-lg flex items-center gap-2">
							<Compass className="h-5 w-5 text-primary" />
							Preparar uma nova cena
						</DialogTitle>
						<DialogDescription className="text-xs text-muted-foreground">
							Defina o nome, o mapa e as configurações de grid da nova cena.
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

						<Field label="Mapa (opcional)">
							<VTTMapDropzone
								campaignId={campaignId}
								upload={mapUpload}
								value={newMap}
								onRemove={() => setNewMap(null)}
								label="Enviar mapa da nova cena"
							/>
						</Field>

						<div className="grid grid-cols-2 gap-3">
							<Field label="Tipo de Grid">
								<Select
									value={newGridType}
									onChange={(e) =>
										setNewGridType(e.target.value as VTTGridType)
									}
									className="h-[44px] min-h-[44px] text-base"
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
									className="h-[44px] min-h-[44px] text-base"
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
								className="h-11 px-4"
								onClick={closeCreateModal}
								disabled={isSubmitting}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								disabled={isSubmitting || mapUpload.isUploading}
								className="h-11 gap-1.5 px-4"
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
