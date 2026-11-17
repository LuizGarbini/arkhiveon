import { Check, Folder, FolderInput } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
	folderButtonLabel,
	type SceneBarEntry,
	sceneCountLabel,
} from "@/lib/vtt/scene-folders";
import type { VTTScene, VTTSceneFolder } from "@/lib/vtt/types";

interface SceneFolderStripProps {
	entries: SceneBarEntry<VTTScene>[];
	activeSceneId: string | null;
	canManage: boolean;
	folders: readonly VTTSceneFolder[];
	movingSceneId: string | null;
	onSelectScene: (sceneId: string) => void;
	onMoveScene: (sceneId: string, folderId: string | null) => void;
	onRenameFolder: (folder: VTTSceneFolder) => void;
	onDeleteFolder: (folder: VTTSceneFolder) => void;
}

const chipIdle =
	"text-muted-foreground [@media(hover:hover)]:hover:bg-accent/60 [@media(hover:hover)]:hover:text-foreground";
const chipActive = "bg-accent text-foreground ring-1 ring-inset ring-border";

function sceneStatus(scene: VTTScene, folderName?: string): string {
	const state = scene.isActive ? "Em jogo" : "Preparação";
	return folderName ? `${folderName} · ${state}` : state;
}

export function SceneFolderStrip({
	entries,
	activeSceneId,
	canManage,
	folders,
	movingSceneId,
	onSelectScene,
	onMoveScene,
	onRenameFolder,
	onDeleteFolder,
}: SceneFolderStripProps) {
	return (
		<>
			{entries.map((entry) =>
				entry.kind === "folder" ? (
					<FolderChip
						key={`folder:${entry.folder.id}`}
						folder={entry.folder}
						scenes={entry.scenes}
						activeSceneId={activeSceneId}
						canManage={canManage}
						folders={folders}
						movingSceneId={movingSceneId}
						onSelectScene={onSelectScene}
						onMoveScene={onMoveScene}
						onRenameFolder={onRenameFolder}
						onDeleteFolder={onDeleteFolder}
					/>
				) : (
					<SceneChip
						key={`scene:${entry.scene.id}`}
						scene={entry.scene}
						active={entry.scene.id === activeSceneId}
						canManage={canManage}
						folders={folders}
						moving={movingSceneId === entry.scene.id}
						onSelectScene={onSelectScene}
						onMoveScene={onMoveScene}
					/>
				),
			)}
		</>
	);
}

function FolderChip({
	folder,
	scenes,
	activeSceneId,
	canManage,
	folders,
	movingSceneId,
	onSelectScene,
	onMoveScene,
	onRenameFolder,
	onDeleteFolder,
}: {
	folder: VTTSceneFolder;
	scenes: VTTScene[];
	activeSceneId: string | null;
	canManage: boolean;
	folders: readonly VTTSceneFolder[];
	movingSceneId: string | null;
	onSelectScene: (sceneId: string) => void;
	onMoveScene: (sceneId: string, folderId: string | null) => void;
	onRenameFolder: (folder: VTTSceneFolder) => void;
	onDeleteFolder: (folder: VTTSceneFolder) => void;
}) {
	const [moveFor, setMoveFor] = useState<string | null>(null);
	const only = !canManage && scenes.length === 1 ? scenes[0] : undefined;
	if (only) {
		return (
			<SceneChip
				scene={only}
				folderName={folder.name}
				active={only.id === activeSceneId}
				canManage={false}
				folders={folders}
				moving={false}
				onSelectScene={onSelectScene}
				onMoveScene={onMoveScene}
			/>
		);
	}
	const live = scenes.find((scene) => scene.isActive);
	const selected = scenes.some((scene) => scene.id === activeSceneId);
	return (
		<Popover
			onOpenChange={(open) => {
				if (!open) setMoveFor(null);
			}}
		>
			<PopoverTrigger
				type="button"
				data-scene-id={live?.id}
				aria-label={folderButtonLabel(
					folder.name,
					scenes.length,
					Boolean(live),
				)}
				aria-pressed={selected}
				className={cn(
					"flex h-11 min-w-[92px] flex-1 basis-0 items-center gap-2 overflow-hidden rounded-xl px-2.5 text-xs font-medium transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] sm:w-auto sm:min-w-0 sm:flex-none sm:shrink-0 sm:basis-auto sm:px-3",
					selected ? chipActive : chipIdle,
				)}
			>
				<Folder className="pointer-events-none size-3.5 shrink-0" />
				<span className="max-w-40 truncate">{folder.name}</span>
				<span className="pointer-events-none tabular-nums text-[10px] text-muted-foreground">
					{scenes.length}
				</span>
				{live ? (
					<span
						aria-hidden
						className="pointer-events-none size-1.5 shrink-0 rounded-full bg-primary"
					/>
				) : null}
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="max-h-80 w-80 gap-2 overflow-y-auto border-border/70 bg-card-elevated p-2"
			>
				<div className="flex items-center justify-between gap-2 px-1">
					<p className="min-w-0 truncate text-sm font-medium text-foreground">
						{folder.name}
					</p>
					<p className="shrink-0 tabular-nums text-xs text-muted-foreground">
						{sceneCountLabel(scenes.length)}
					</p>
				</div>
				{canManage ? (
					<div className="grid grid-cols-2 gap-1">
						<Button
							type="button"
							variant="outline"
							className="h-11"
							onClick={() => onRenameFolder(folder)}
						>
							Renomear
						</Button>
						<Button
							type="button"
							variant="outline"
							className="h-11"
							onClick={() => onDeleteFolder(folder)}
						>
							Excluir pasta
						</Button>
					</div>
				) : null}
				{scenes.length === 0 ? (
					<p className="px-1 py-2 text-sm text-muted-foreground">
						Pasta vazia. No menu da cena, escolha “Mover para pasta”.
					</p>
				) : (
					<ul className="flex flex-col">
						{scenes.map((scene) => (
							<li key={scene.id} className="flex flex-col">
								<div className="flex items-stretch">
									<button
										type="button"
										data-scene-id={scene.id}
										onClick={() => onSelectScene(scene.id)}
										aria-pressed={scene.id === activeSceneId}
										className={cn(
											"flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 text-left text-xs font-medium transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]",
											scene.id === activeSceneId ? chipActive : chipIdle,
										)}
									>
										<span
											aria-hidden
											className={cn(
												"pointer-events-none size-1.5 shrink-0 rounded-full",
												scene.isActive
													? "bg-primary"
													: "bg-muted-foreground/50",
											)}
										/>
										<span className="min-w-0 flex-1 truncate">
											{scene.name}
										</span>
										<span
											className={cn(
												"shrink-0 text-[10px]",
												scene.isActive
													? "text-primary"
													: "text-muted-foreground",
											)}
										>
											{scene.isActive ? "Em jogo" : "Preparação"}
										</span>
									</button>
									{canManage ? (
										<button
											type="button"
											aria-expanded={moveFor === scene.id}
											aria-label={`Mover ${scene.name} para pasta`}
											disabled={movingSceneId === scene.id}
											onClick={() =>
												setMoveFor((current) =>
													current === scene.id ? null : scene.id,
												)
											}
											className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:opacity-50 [@media(hover:hover)]:hover:bg-accent/60 [@media(hover:hover)]:hover:text-foreground"
										>
											<FolderInput className="pointer-events-none size-4" />
										</button>
									) : null}
								</div>
								{canManage && moveFor === scene.id ? (
									<FolderDestinations
										scene={scene}
										folders={folders}
										disabled={movingSceneId === scene.id}
										onMove={(folderId) => {
											setMoveFor(null);
											onMoveScene(scene.id, folderId);
										}}
									/>
								) : null}
							</li>
						))}
					</ul>
				)}
			</PopoverContent>
		</Popover>
	);
}

function SceneChip({
	scene,
	folderName,
	active,
	canManage,
	folders,
	moving,
	onSelectScene,
	onMoveScene,
}: {
	scene: VTTScene;
	folderName?: string;
	active: boolean;
	canManage: boolean;
	folders: readonly VTTSceneFolder[];
	moving: boolean;
	onSelectScene: (sceneId: string) => void;
	onMoveScene: (sceneId: string, folderId: string | null) => void;
}) {
	return (
		<div
			className={cn(
				"flex h-11 min-w-[92px] flex-1 basis-0 items-stretch sm:w-auto sm:min-w-0 sm:flex-none sm:basis-auto",
				canManage && "min-w-[136px]",
			)}
		>
			<button
				type="button"
				data-scene-id={scene.id}
				onClick={() => onSelectScene(scene.id)}
				aria-pressed={active}
				className={cn(
					"flex h-11 min-w-0 flex-1 items-center gap-2 overflow-hidden px-2.5 text-xs font-medium transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] sm:flex-none sm:px-3",
					canManage ? "rounded-l-xl" : "rounded-xl",
					active ? chipActive : chipIdle,
				)}
			>
				<span
					aria-hidden
					className={cn(
						"pointer-events-none size-1.5 shrink-0 rounded-full",
						scene.isActive ? "bg-primary" : "bg-muted-foreground/50",
					)}
				/>
				<span className="flex min-w-0 flex-col items-start leading-tight sm:flex-row sm:items-baseline sm:gap-2">
					<span className="max-w-full truncate sm:max-w-40">{scene.name}</span>
					<span
						className={cn(
							"truncate text-[10px] sm:text-[11px]",
							scene.isActive ? "text-primary" : "text-muted-foreground",
						)}
					>
						{sceneStatus(scene, folderName)}
					</span>
				</span>
			</button>
			{canManage ? (
				<DropdownMenu>
					<DropdownMenuTrigger
						type="button"
						aria-label={`Mover ${scene.name} para pasta`}
						disabled={moving}
						className={cn(
							"flex size-11 shrink-0 items-center justify-center rounded-r-xl transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:opacity-50",
							active ? chipActive : chipIdle,
						)}
					>
						<FolderInput className="pointer-events-none size-4" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-64 min-w-64">
						<DropdownMenuGroup>
							<DropdownMenuLabel>Mover para pasta</DropdownMenuLabel>
							<FolderMenuItems
								scene={scene}
								folders={folders}
								disabled={moving}
								onMove={(folderId) => onMoveScene(scene.id, folderId)}
							/>
						</DropdownMenuGroup>
					</DropdownMenuContent>
				</DropdownMenu>
			) : null}
		</div>
	);
}

function FolderDestinations({
	scene,
	folders,
	disabled,
	onMove,
}: {
	scene: VTTScene;
	folders: readonly VTTSceneFolder[];
	disabled: boolean;
	onMove: (folderId: string | null) => void;
}) {
	const current = scene.folderId ?? null;
	return (
		<div className="mb-1 flex flex-col gap-1 pl-7">
			<button
				type="button"
				disabled={disabled || current === null}
				onClick={() => onMove(null)}
				className="flex h-11 items-center gap-2 rounded-xl px-2.5 text-left text-xs font-medium text-foreground transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:opacity-50 [@media(hover:hover)]:hover:bg-accent/60"
			>
				{current === null ? (
					<Check className="pointer-events-none size-3.5 text-primary" />
				) : (
					<span className="size-3.5" />
				)}
				Fora da pasta
			</button>
			{folders.length === 0 ? (
				<p className="px-2.5 py-2 text-xs text-muted-foreground">
					Crie uma pasta primeiro.
				</p>
			) : (
				folders.map((folder) => {
					const here = current === folder.id;
					return (
						<button
							key={folder.id}
							type="button"
							disabled={disabled || here}
							onClick={() => onMove(folder.id)}
							className="flex h-11 items-center gap-2 rounded-xl px-2.5 text-left text-xs font-medium text-foreground transition-colors duration-150 ease-out select-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] disabled:opacity-50 [@media(hover:hover)]:hover:bg-accent/60"
						>
							{here ? (
								<Check className="pointer-events-none size-3.5 shrink-0 text-primary" />
							) : (
								<Folder className="pointer-events-none size-3.5 shrink-0 text-muted-foreground" />
							)}
							<span className="truncate">{folder.name}</span>
						</button>
					);
				})
			)}
		</div>
	);
}

function FolderMenuItems({
	scene,
	folders,
	disabled,
	onMove,
}: {
	scene: VTTScene;
	folders: readonly VTTSceneFolder[];
	disabled: boolean;
	onMove: (folderId: string | null) => void;
}) {
	const current = scene.folderId ?? null;
	return (
		<>
			<DropdownMenuItem
				className="min-h-11"
				disabled={disabled || current === null}
				onClick={() => onMove(null)}
			>
				{current === null ? (
					<Check className="text-primary" />
				) : (
					<span className="size-4" />
				)}
				Fora da pasta
			</DropdownMenuItem>
			{folders.length === 0 ? (
				<DropdownMenuItem className="min-h-11" disabled>
					Crie uma pasta primeiro
				</DropdownMenuItem>
			) : (
				folders.map((folder) => {
					const here = current === folder.id;
					return (
						<DropdownMenuItem
							key={folder.id}
							className="min-h-11"
							disabled={disabled || here}
							onClick={() => onMove(folder.id)}
						>
							{here ? (
								<Check className="text-primary" />
							) : (
								<Folder className="text-muted-foreground" />
							)}
							<span className="truncate">{folder.name}</span>
						</DropdownMenuItem>
					);
				})
			)}
		</>
	);
}
