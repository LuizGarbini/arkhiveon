import type { VTTSceneFolder } from "./types";

/** Nome da pasta, igual ao check da migration 0077. */
export const SCENE_FOLDER_NAME_MAX = 80;

export interface SceneOrder {
	id: string;
	orderIndex: number;
	createdAt?: string;
}

export interface SceneInBar extends SceneOrder {
	folderId?: string | null;
}

export type SceneBarEntry<S> =
	| { kind: "scene"; scene: S }
	| { kind: "folder"; folder: VTTSceneFolder; scenes: S[] };

export interface SceneBarGroups<S> {
	rootScenes: S[];
	folders: Array<{ folder: VTTSceneFolder; scenes: S[] }>;
}

/** Ordem estável: índice, depois data de criação, depois id. */
export function compareSceneOrder(a: SceneOrder, b: SceneOrder): number {
	if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
	const createdA = a.createdAt ?? "";
	const createdB = b.createdAt ?? "";
	if (createdA < createdB) return -1;
	if (createdA > createdB) return 1;
	if (a.id < b.id) return -1;
	if (a.id > b.id) return 1;
	return 0;
}

export function nextOrderIndex(
	items: readonly { orderIndex: number }[],
): number {
	return items.reduce((max, item) => Math.max(max, item.orderIndex), -1) + 1;
}

export function normalizeFolderName(
	name: string,
): { ok: true; name: string } | { ok: false; reason: string } {
	const trimmed = name.trim();
	if (!trimmed) return { ok: false, reason: "Dê um nome para a pasta." };
	if (trimmed.length > SCENE_FOLDER_NAME_MAX) {
		return {
			ok: false,
			reason: "O nome da pasta pode ter até 80 caracteres.",
		};
	}
	return { ok: true, name: trimmed };
}

const MISSING_FOLDER_STORAGE = new Set([
	"PGRST205",
	"PGRST204",
	"42P01",
	"42703",
]);

export function folderSaveMessage(
	error: { code?: string } | null | undefined,
	fallback: string,
): string {
	if (error?.code && MISSING_FOLDER_STORAGE.has(error.code)) {
		return "As pastas de cena ainda não estão disponíveis nesta mesa.";
	}
	return fallback;
}

/** A rota usa este nome. */
export const sceneFolderWriteError = folderSaveMessage;

export function folderButtonLabel(
	name: string,
	count: number,
	hasLive: boolean,
): string {
	const noun = count === 1 ? "cena" : "cenas";
	const base = `Pasta ${name}, ${count} ${noun}`;
	return hasLive ? `${base}, em jogo` : base;
}

export function sceneCountLabel(count: number): string {
	return count === 1 ? "1 cena" : `${count} cenas`;
}

/**
 * Agrupa sem descartar cena. Pasta desconhecida (id que não está na lista)
 * conta como raiz: a cena continua na barra.
 */
export function groupScenes<S extends SceneInBar>(
	scenes: readonly S[],
	folders: readonly VTTSceneFolder[],
): SceneBarGroups<S> {
	const known = new Set(folders.map((folder) => folder.id));
	const byFolder = new Map<string, S[]>(
		folders.map((folder) => [folder.id, []]),
	);
	const root: S[] = [];
	for (const scene of scenes) {
		const folderId = scene.folderId ?? null;
		const bucket = folderId ? byFolder.get(folderId) : undefined;
		if (folderId && known.has(folderId) && bucket) bucket.push(scene);
		else root.push(scene);
	}
	const sort = <T extends SceneOrder>(items: readonly T[]) =>
		[...items].sort(compareSceneOrder);
	return {
		rootScenes: sort(root),
		folders: sort(folders).map((folder) => ({
			folder,
			scenes: sort(byFolder.get(folder.id) ?? []),
		})),
	};
}

/** Cenas da raiz primeiro, depois as pastas. Pasta vazia só para quem organiza. */
export function groupScenesForBar<S extends SceneInBar>(
	scenes: readonly S[],
	folders: readonly VTTSceneFolder[],
	options?: { includeEmptyFolders?: boolean },
): { entries: SceneBarEntry<S>[] } {
	const grouped = groupScenes(scenes, folders);
	const visibleFolders = options?.includeEmptyFolders
		? grouped.folders
		: grouped.folders.filter((entry) => entry.scenes.length > 0);
	return {
		entries: [
			...grouped.rootScenes.map(
				(scene): SceneBarEntry<S> => ({ kind: "scene", scene }),
			),
			...visibleFolders.map(
				(entry): SceneBarEntry<S> => ({
					kind: "folder",
					folder: entry.folder,
					scenes: entry.scenes,
				}),
			),
		],
	};
}

/**
 * Quem não é o mestre só vê as cenas que a barra já mostrava (as em jogo).
 * Pasta sem nenhuma dessas cenas fica de fora.
 */
export function groupSceneBar<S extends SceneInBar & { isActive: boolean }>(
	scenes: readonly S[],
	folders: readonly VTTSceneFolder[],
	canSeeEveryScene: boolean,
): SceneBarGroups<S> {
	const visible = canSeeEveryScene
		? scenes
		: scenes.filter((scene) => scene.isActive);
	const grouped = groupScenes(visible, folders);
	if (canSeeEveryScene) return grouped;
	return {
		rootScenes: grouped.rootScenes,
		folders: grouped.folders.filter((entry) => entry.scenes.length > 0),
	};
}

/** Id repetido substitui a pasta, para o eco do Realtime não duplicar. */
export function createFolder(
	folders: readonly VTTSceneFolder[],
	folder: VTTSceneFolder,
): VTTSceneFolder[] {
	const index = folders.findIndex((item) => item.id === folder.id);
	if (index < 0) return [...folders, folder];
	const next = folders.slice();
	next[index] = folder;
	return next;
}

export function renameFolder(
	folders: readonly VTTSceneFolder[],
	folderId: string,
	name: string,
): VTTSceneFolder[] {
	return folders.map((folder) =>
		folder.id === folderId ? { ...folder, name } : folder,
	);
}

/**
 * Apagar a pasta não apaga cenas: elas voltam para a raiz, na mesma ordem.
 * Se nenhuma cena estava na pasta, devolve o mesmo array.
 */
export function releaseFolderScenes<S extends { folderId?: string | null }>(
	scenes: readonly S[],
	folderId: string,
): readonly S[] {
	if (!scenes.some((scene) => scene.folderId === folderId)) return scenes;
	return scenes.map((scene) =>
		scene.folderId === folderId ? { ...scene, folderId: null } : scene,
	);
}

export function deleteFolder<S extends { folderId?: string | null }>(
	scenes: readonly S[],
	folders: readonly VTTSceneFolder[],
	folderId: string,
): { scenes: readonly S[]; folders: VTTSceneFolder[] } {
	return {
		folders: folders.filter((folder) => folder.id !== folderId),
		scenes: releaseFolderScenes(scenes, folderId),
	};
}

/**
 * Move a cena para uma pasta desta campanha, ou para a raiz (`null`).
 * Pasta desconhecida não muda a cena e não a tira da lista.
 */
export function moveScene<S extends { id: string; folderId?: string | null }>(
	scenes: readonly S[],
	sceneId: string,
	folderId: string | null,
	folders: readonly { id: string }[],
): S[] {
	const allowed =
		folderId === null || folders.some((folder) => folder.id === folderId);
	return scenes.map((scene) => {
		if (scene.id !== sceneId || !allowed) return scene;
		return { ...scene, folderId };
	});
}

export function moveSceneToFolder<
	S extends { id: string; folderId?: string | null },
>(
	scenes: readonly S[],
	sceneId: string,
	folderId: string | null,
	folders: readonly { id: string }[],
): { ok: true; scenes: S[] } | { ok: false; reason: string } {
	if (!scenes.some((scene) => scene.id === sceneId)) {
		return { ok: false, reason: "Cena não encontrada." };
	}
	if (folderId !== null && !folders.some((folder) => folder.id === folderId)) {
		return { ok: false, reason: "Essa pasta não está nesta campanha." };
	}
	return {
		ok: true,
		scenes: moveScene(scenes, sceneId, folderId, folders),
	};
}

/**
 * Uma linha de cena que chega no meio de um movimento fica com a pasta
 * local até o servidor confirmar a mesma pasta. O resto da linha entra.
 * A cena não some.
 */
export function reconcileSceneFolder<
	S extends { id: string; folderId?: string | null },
>(remote: S, pending: Map<string, string | null>): S {
	const wanted = pending.get(remote.id);
	const remoteFolder = remote.folderId ?? null;
	if (wanted === undefined) return { ...remote, folderId: remoteFolder };
	if (wanted === remoteFolder) pending.delete(remote.id);
	return { ...remote, folderId: wanted };
}

/** O mesmo para o nome da pasta, enquanto o renomear não voltou. */
export function reconcileFolderName(
	folder: VTTSceneFolder,
	pending: Map<string, string>,
): VTTSceneFolder {
	const wanted = pending.get(folder.id);
	if (wanted === undefined) return folder;
	if (wanted === folder.name) pending.delete(folder.id);
	return { ...folder, name: wanted };
}
