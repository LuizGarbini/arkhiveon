import { describe, expect, it } from "vitest";
import {
	createFolder,
	deleteFolder,
	folderButtonLabel,
	folderSaveMessage,
	groupSceneBar,
	groupScenes,
	groupScenesForBar,
	moveScene,
	moveSceneToFolder,
	nextOrderIndex,
	normalizeFolderName,
	reconcileFolderName,
	reconcileSceneFolder,
	releaseFolderScenes,
	renameFolder,
} from "./scene-folders";
import type { VTTSceneFolder } from "./types";

function folder(
	id: string,
	orderIndex: number,
	createdAt = id,
	name = id,
): VTTSceneFolder {
	return { id, campaignId: "c", name, orderIndex, createdAt };
}

function scene(
	id: string,
	orderIndex: number,
	folderId: string | null,
	createdAt = id,
	isActive = false,
) {
	return { id, orderIndex, folderId, createdAt, isActive, name: id };
}

describe("pastas de cenas", () => {
	const folders = [folder("A", 1, "a"), folder("B", 0, "b")];
	const scenes = [
		scene("s1", 2, null, "1"),
		scene("s2", 0, "A", "2"),
		scene("s3", 0, "A", "1"),
		scene("s4", 1, "missing", "4"),
		scene("s5", 0, null, "0"),
	];

	it("cria a pasta e não duplica o mesmo id", () => {
		const created = createFolder(folders, folder("C", 5, "c", "Cidade"));
		expect(created.map((item) => item.id)).toEqual(["A", "B", "C"]);
		const again = createFolder(created, folder("C", 5, "c", "Cidade nova"));
		expect(again).toHaveLength(3);
		expect(again.find((item) => item.id === "C")?.name).toBe("Cidade nova");
		expect(nextOrderIndex(created)).toBe(6);
		expect(nextOrderIndex([])).toBe(0);
	});

	it("move a cena para a pasta e de volta para a raiz", () => {
		const inside = moveScene(scenes, "s1", "B", folders);
		expect(inside).toHaveLength(scenes.length);
		expect(inside.find((item) => item.id === "s1")).toMatchObject({
			folderId: "B",
			orderIndex: 2,
		});
		const outside = moveScene(inside, "s1", null, folders);
		expect(outside.find((item) => item.id === "s1")?.folderId).toBeNull();
		expect(outside.map((item) => item.id)).toEqual(
			scenes.map((item) => item.id),
		);
	});

	it("apagar a pasta devolve as cenas para a raiz, na mesma ordem", () => {
		const removed = deleteFolder(scenes, folders, "A");
		expect(removed.folders.map((item) => item.id)).toEqual(["B"]);
		expect(removed.scenes).toHaveLength(scenes.length);
		for (const item of removed.scenes) {
			expect(item.folderId === "A").toBe(false);
		}
		expect(removed.scenes.find((item) => item.id === "s2")?.orderIndex).toBe(0);
		expect(removed.scenes.find((item) => item.id === "s3")?.orderIndex).toBe(0);
		const grouped = groupScenes(removed.scenes, removed.folders);
		expect(grouped.rootScenes.map((item) => item.id)).toEqual([
			"s5",
			"s3",
			"s2",
			"s4",
			"s1",
		]);
		expect(grouped.folders.map((entry) => entry.folder.id)).toEqual(["B"]);
	});

	it("a ordem é estável e pasta desconhecida não tira a cena da barra", () => {
		const grouped = groupScenes(scenes, folders);
		const shown =
			grouped.rootScenes.length +
			grouped.folders.reduce((count, entry) => count + entry.scenes.length, 0);
		expect(shown).toBe(scenes.length);
		expect(grouped.rootScenes.map((item) => item.id)).toEqual([
			"s5",
			"s4",
			"s1",
		]);
		expect(grouped.folders.map((entry) => entry.folder.id)).toEqual(["B", "A"]);
		expect(grouped.folders[1]?.scenes.map((item) => item.id)).toEqual([
			"s3",
			"s2",
		]);
		expect(grouped.folders[0]?.scenes).toEqual([]);
	});

	it("pasta desconhecida no movimento não altera nem remove a cena", () => {
		const kept = moveScene(scenes, "s2", "nope", folders);
		expect(kept).toHaveLength(scenes.length);
		expect(kept.find((item) => item.id === "s2")?.folderId).toBe("A");
		const refused = moveSceneToFolder(scenes, "s2", "nope", folders);
		expect(refused.ok).toBe(false);
		expect(scenes).toHaveLength(5);
		const moved = moveSceneToFolder(scenes, "s1", "B", folders);
		expect(
			moved.ok && moved.scenes.find((item) => item.id === "s1")?.folderId,
		).toBe("B");
		expect(
			renameFolder(folders, "B", "Bosque").find((item) => item.id === "B")
				?.name,
		).toBe("Bosque");
	});

	it("jogador vê a pasta da cena em jogo e não vê pasta vazia", () => {
		const bar = groupSceneBar(
			[
				scene("live", 0, "A", "a", true),
				scene("prep", 1, "A", "b", false),
				scene("lost", 2, "missing", "c", true),
			],
			[folder("A", 0), folder("empty", 1)],
			false,
		);
		expect(bar.folders.map((entry) => entry.folder.id)).toEqual(["A"]);
		expect(bar.folders[0]?.scenes.map((item) => item.id)).toEqual(["live"]);
		expect(bar.rootScenes.map((item) => item.id)).toEqual(["lost"]);
	});

	it("movimento em andamento não perde a pasta nem a cena quando chega outra edição", () => {
		const pending = new Map<string, string | null>([["s1", "A"]]);
		const remote = { id: "s1", name: "Remota", folderId: null, gridSize: 80 };
		const kept = reconcileSceneFolder(remote, pending);
		expect(kept).toMatchObject({
			id: "s1",
			name: "Remota",
			folderId: "A",
			gridSize: 80,
		});
		expect(pending.has("s1")).toBe(true);
		const echoed = reconcileSceneFolder({ ...remote, folderId: "A" }, pending);
		expect(echoed.folderId).toBe("A");
		expect(pending.has("s1")).toBe(false);

		const names = new Map([["A", "Masmorra"]]);
		expect(reconcileFolderName(folder("A", 0, "a", "Velha"), names).name).toBe(
			"Masmorra",
		);
		expect(
			reconcileFolderName(folder("A", 0, "a", "Masmorra"), names).name,
		).toBe("Masmorra");
		expect(names.has("A")).toBe(false);
	});

	it("a barra esconde cenas da pasta e mantém a cena de pasta desconhecida", () => {
		const bar = groupScenesForBar(scenes, folders, {
			includeEmptyFolders: true,
		});
		const ids = bar.entries.flatMap((entry) =>
			entry.kind === "scene"
				? [entry.scene.id]
				: entry.scenes.map((scene) => scene.id),
		);
		expect(ids).toHaveLength(scenes.length);
		expect(ids).toContain("s4");
		expect(
			bar.entries.find(
				(entry) => entry.kind === "folder" && entry.folder.id === "B",
			),
		).toMatchObject({ scenes: [] });
		const hidden = groupScenesForBar(scenes, folders);
		expect(
			hidden.entries.some(
				(entry) => entry.kind === "folder" && entry.folder.id === "B",
			),
		).toBe(false);
		expect(folderButtonLabel("Masmorra", 12, false)).toBe(
			"Pasta Masmorra, 12 cenas",
		);
		expect(folderButtonLabel("Masmorra", 1, false)).toBe(
			"Pasta Masmorra, 1 cena",
		);
		const same = releaseFolderScenes(scenes, "B");
		expect(same).toBe(scenes);
	});

	it("recusa nome vazio e avisa quando a pasta ainda não existe no banco", () => {
		expect(normalizeFolderName("  Taverna  ")).toEqual({
			ok: true,
			name: "Taverna",
		});
		expect(normalizeFolderName("   ").ok).toBe(false);
		expect(normalizeFolderName("x".repeat(81)).ok).toBe(false);
		expect(folderSaveMessage({ code: "PGRST205" }, "falhou")).toBe(
			"As pastas de cena ainda não estão disponíveis nesta mesa.",
		);
		expect(folderSaveMessage({ code: "42501" }, "falhou")).toBe("falhou");
	});
});
