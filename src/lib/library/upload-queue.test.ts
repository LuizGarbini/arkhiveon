import { describe, expect, it } from "vitest";
import {
	clearFinished,
	enqueueFiles,
	hasActiveUploads,
	markDone,
	markError,
	markUploading,
	nextToStart,
	retryItem,
	setProgress,
	splitPdfCandidates,
	type UploadItem,
} from "./upload-queue";

const pdf = (name: string) =>
	new File(["%PDF-1.7"], name, { type: "application/pdf" });

function queueOf(n: number): UploadItem[] {
	let i = 0;
	return enqueueFiles(
		[],
		Array.from({ length: n }, (_, k) => pdf(`f${k}.pdf`)),
		() => `id${i++}`,
	);
}

describe("upload-queue", () => {
	it("separa PDFs do resto (tipo ou extensão sem tipo)", () => {
		const { pdfs, ignored } = splitPdfCandidates([
			pdf("a.pdf"),
			new File(["x"], "b.PDF", { type: "" }),
			new File(["x"], "c.png", { type: "image/png" }),
			new File(["x"], "d.pdf", { type: "image/png" }),
		]);
		expect(pdfs.map((f) => f.name)).toEqual(["a.pdf", "b.PDF"]);
		expect(ignored.map((f) => f.name)).toEqual(["c.png", "d.pdf"]);
	});

	it("enfileira como 'queued' com progresso 0", () => {
		const items = queueOf(2);
		expect(items.map((x) => [x.id, x.status, x.progress])).toEqual([
			["id0", "queued", 0],
			["id1", "queued", 0],
		]);
	});

	it("respeita concorrência 2", () => {
		let items = queueOf(4);
		expect(nextToStart(items)).toEqual(["id0", "id1"]);
		items = markUploading(markUploading(items, "id0"), "id1");
		expect(nextToStart(items)).toEqual([]);
		items = markDone(items, "id0");
		expect(nextToStart(items)).toEqual(["id2"]);
	});

	it("falha de um não para os outros, e retry volta pra fila", () => {
		let items = markUploading(markUploading(queueOf(3), "id0"), "id1");
		items = markError(items, "id0", "boom");
		expect(items[0]).toMatchObject({ status: "error", error: "boom" });
		expect(nextToStart(items)).toEqual(["id2"]);
		items = retryItem(items, "id0");
		expect(items[0]).toMatchObject({
			status: "queued",
			progress: 0,
			error: undefined,
		});
	});

	it("progresso é limitado a 0..1 e só vale enquanto envia", () => {
		let items = queueOf(1);
		expect(setProgress(items, "id0", 0.5)[0].progress).toBe(0);
		items = markUploading(items, "id0");
		expect(setProgress(items, "id0", 0.45)[0].progress).toBe(0.45);
		expect(setProgress(items, "id0", 3)[0].progress).toBe(1);
	});

	it("limpa só os concluídos; ativo = na fila ou enviando", () => {
		let items = queueOf(3);
		items = markDone(markUploading(items, "id0"), "id0");
		items = markError(markUploading(items, "id1"), "id1", "x");
		expect(hasActiveUploads(items)).toBe(true);
		items = clearFinished(items);
		expect(items.map((x) => x.id)).toEqual(["id1", "id2"]);
		expect(
			hasActiveUploads(markError(markUploading(items, "id2"), "id2", "y")),
		).toBe(false);
	});
});
