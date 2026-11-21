import { describe, expect, it, vi } from "vitest";
import {
	buildLibraryKey,
	buildPendingLibraryKey,
	buildPendingThumbKey,
	buildThumbKey,
	type CampaignRole,
	LIBRARY_THUMB_MAX_BYTES,
	LIBRARY_THUMB_MIME,
	LIBRARY_THUMB_TTL_SECONDS,
} from "../../../supabase/functions/_shared/library-guard";
import {
	handleLibraryRequest,
	isMissingStoredObject,
	type LibraryFileRow,
	type LibraryHandlerDeps,
	type SignGetInput,
	type SignPutInput,
} from "../../../supabase/functions/library-r2/handler";

const CAMP_A = "20000000-0000-4000-8000-0000000000a1";
const CAMP_B = "20000000-0000-4000-8000-0000000000b1";
const FILE_READY = "30000000-0000-4000-8000-0000000000a1";
const FILE_PENDING = "30000000-0000-4000-8000-0000000000a2";
const FILE_OTHER = "30000000-0000-4000-8000-0000000000b1";
const OWNER = "11111111-1111-4111-8111-111111111111";
const EDITOR = "22222222-2222-4222-8222-222222222222";
const VIEWER = "33333333-3333-4333-8333-333333333333";
const OTHER = "44444444-4444-4444-8444-444444444444";
const GHOST = "55555555-5555-4555-8555-555555555555";

function idAt(n: number): string {
	return `30000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;
}

function webpBytes(size = 32): Uint8Array {
	const bytes = new Uint8Array(size);
	bytes.set(new TextEncoder().encode("RIFF"), 0);
	bytes.set(new TextEncoder().encode("WEBP"), 8);
	return bytes;
}

function readyRow(
	id: string,
	campaignId: string,
	thumb: "pending" | "ready" | "failed" = "pending",
): LibraryFileRow {
	return {
		id,
		campaign_id: campaignId,
		r2_key: buildLibraryKey(campaignId, id),
		size_bytes: 1000,
		status: "ready",
		created_at: "2026-11-21T00:00:00.000Z",
		thumb_status: thumb,
		thumb_path: thumb === "ready" ? buildThumbKey(campaignId, id) : null,
		thumb_updated_at: thumb === "ready" ? "2026-11-20T00:00:00.000Z" : null,
	};
}

function accessFor(
	userId: string,
	campaignId: string,
): { pilot: boolean; role: CampaignRole | null } {
	if (userId === GHOST) return { pilot: true, role: null };
	const campaign = campaignId.toLowerCase();
	if (campaign === CAMP_A) {
		if (userId === OWNER) return { pilot: true, role: "owner" };
		if (userId === EDITOR) return { pilot: true, role: "editor" };
		if (userId === VIEWER) return { pilot: true, role: "viewer" };
		return { pilot: false, role: null };
	}
	if (campaign === CAMP_B && userId === OTHER) {
		return { pilot: true, role: "owner" };
	}
	return { pilot: false, role: null };
}

function harness(userId: string | null) {
	const rows = new Map<string, LibraryFileRow>();
	const objects = new Map<string, { bytes: Uint8Array; contentType: string }>();
	const updates: Array<{
		id: string;
		patch: Record<string, string>;
		match: Record<string, string>;
	}> = [];

	const signPut = vi.fn(async (input: SignPutInput) => {
		return `https://r2.test/put?key=${encodeURIComponent(input.key)}&len=${input.contentLength}`;
	});
	const signGet = vi.fn(async (input: SignGetInput) => {
		return `https://r2.test/get?key=${encodeURIComponent(input.key)}&exp=${input.expiresIn}`;
	});
	const headObject = vi.fn(async (key: string) => {
		const stored = objects.get(key);
		if (!stored) {
			const missing = new Error("missing");
			missing.name = "NotFound";
			throw missing;
		}
		return {
			contentLength: stored.bytes.length,
			contentType: stored.contentType,
		};
	});
	const readObjectRange = vi.fn(async (key: string, range: string) => {
		const stored = objects.get(key);
		if (!stored) {
			const missing = new Error("missing");
			missing.name = "NoSuchKey";
			throw missing;
		}
		const match = /^bytes=(\d+)-(\d+)$/.exec(range);
		if (!match) return stored.bytes;
		const start = Number(match[1]);
		const end = Number(match[2]);
		return stored.bytes.slice(start, end + 1);
	});
	const copyObject = vi.fn(
		async (sourceKey: string, destKey: string, contentType: string) => {
			const stored = objects.get(sourceKey);
			if (!stored) {
				const missing = new Error("missing");
				missing.name = "NoSuchKey";
				throw missing;
			}
			objects.set(destKey, { bytes: stored.bytes, contentType });
		},
	);
	const deleteObject = vi.fn(async (key: string) => {
		if (!objects.has(key)) {
			const missing = new Error("missing");
			missing.name = "NoSuchKey";
			throw missing;
		}
		objects.delete(key);
	});
	const getFile = vi.fn(async (id: string) => rows.get(id) ?? null);
	const listFilesByIds = vi.fn(async (ids: string[]) =>
		ids.flatMap((id) => {
			const row = rows.get(id);
			return row ? [row] : [];
		}),
	);
	const campaignAccess = vi.fn(async (id: string, campaignId: string) => {
		if (!userId || id !== userId) return { pilot: false, role: null };
		return accessFor(id, campaignId);
	});

	const deps: LibraryHandlerDeps = {
		getUser: async () => (userId ? { id: userId } : null),
		campaignAccess,
		getFile,
		listFilesByIds,
		insertFile: vi.fn(async () => {}),
		updateFile: async (id, patch, match) => {
			updates.push({ id, patch, match });
			const row = rows.get(id);
			if (!row) return 0;
			const current = row as unknown as Record<string, unknown>;
			for (const [key, value] of Object.entries(match)) {
				if (current[key] !== value) return 0;
			}
			Object.assign(row, patch);
			return 1;
		},
		deleteFileRow: async (id) => {
			rows.delete(id);
		},
		listStalePending: async () => [],
		headObject,
		readObjectRange,
		copyObject,
		deleteObject,
		signPut,
		signGet,
		now: () => new Date("2026-11-21T12:00:00.000Z"),
		randomUUID: () => "66666666-6666-4666-8666-666666666666",
		testMode: false,
	};

	return {
		deps,
		rows,
		objects,
		updates,
		signPut,
		signGet,
		headObject,
		readObjectRange,
		copyObject,
		deleteObject,
		getFile,
		listFilesByIds,
		campaignAccess,
	};
}

const writeBodies = [
	{ action: "request-thumb-upload", fileId: FILE_READY, size: 32 },
	{ action: "confirm-thumb", fileId: FILE_READY },
	{ action: "report-thumb-failed", fileId: FILE_READY },
] as const;

describe("library-r2 handler · capas", () => {
	it("sem JWT responde 401 e não lê a linha", async () => {
		const h = harness(null);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A, "ready"));
		const res = await handleLibraryRequest(h.deps, {
			action: "confirm-thumb",
			fileId: FILE_READY,
		});
		expect(res.status).toBe(401);
		expect(h.getFile).not.toHaveBeenCalled();
		expect(h.signPut).not.toHaveBeenCalled();
	});

	it("conta B leva 403 nas quatro ações de capa e não assina nem grava", async () => {
		const h = harness(OTHER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A, "ready"));
		const bodies = [
			...writeBodies,
			{
				action: "request-thumb-reads",
				campaignId: CAMP_A,
				fileIds: [FILE_READY],
			},
		];
		for (const body of bodies) {
			const res = await handleLibraryRequest(h.deps, body);
			expect(res.status).toBe(403);
			expect(res.body.uploadUrl).toBeUndefined();
			expect(res.body.urls).toBeUndefined();
		}
		expect(h.signPut).not.toHaveBeenCalled();
		expect(h.signGet).not.toHaveBeenCalled();
		expect(h.copyObject).not.toHaveBeenCalled();
		expect(h.deleteObject).not.toHaveBeenCalled();
		expect(h.updates).toEqual([]);
		expect(h.listFilesByIds).not.toHaveBeenCalled();
		expect(h.rows.get(FILE_READY)?.thumb_status).toBe("ready");
	});

	it("piloto visível sem papel também leva 403 nas quatro", async () => {
		const h = harness(GHOST);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A, "ready"));
		for (const body of [
			...writeBodies,
			{
				action: "request-thumb-reads",
				campaignId: CAMP_A,
				fileIds: [FILE_READY],
			},
		]) {
			expect((await handleLibraryRequest(h.deps, body)).status).toBe(403);
		}
		expect(h.signGet).not.toHaveBeenCalled();
		expect(h.updates).toEqual([]);
	});

	it("jogador leva 403 nas três de escrita", async () => {
		const h = harness(VIEWER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A, "ready"));
		for (const body of writeBodies) {
			const res = await handleLibraryRequest(h.deps, body);
			expect(res.status).toBe(403);
		}
		expect(h.signPut).not.toHaveBeenCalled();
		expect(h.headObject).not.toHaveBeenCalled();
		expect(h.updates).toEqual([]);
		expect(h.rows.get(FILE_READY)?.thumb_status).toBe("ready");
	});

	it("jogador recebe 200 na leitura e não vê outra campanha nem PDF pendente", async () => {
		const h = harness(VIEWER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A, "ready"));
		h.rows.set(FILE_PENDING, readyRow(FILE_PENDING, CAMP_A, "pending"));
		h.rows.set(FILE_OTHER, readyRow(FILE_OTHER, CAMP_B, "ready"));
		const hiddenPdf = readyRow(idAt(9), CAMP_A, "ready");
		hiddenPdf.status = "pending";
		h.rows.set(hiddenPdf.id, hiddenPdf);

		const res = await handleLibraryRequest(h.deps, {
			action: "request-thumb-reads",
			campaignId: CAMP_A,
			fileIds: [FILE_READY, FILE_PENDING, FILE_OTHER, hiddenPdf.id, FILE_READY],
		});

		expect(res.status).toBe(200);
		expect(res.body.expiresIn).toBe(LIBRARY_THUMB_TTL_SECONDS);
		expect(res.body.urls).toEqual({
			[FILE_READY]: expect.stringContaining("r2.test/get"),
		});
		expect(h.campaignAccess).toHaveBeenCalledTimes(1);
		expect(h.listFilesByIds).toHaveBeenCalledTimes(1);
		expect(h.listFilesByIds).toHaveBeenCalledWith([
			FILE_READY,
			FILE_PENDING,
			FILE_OTHER,
			hiddenPdf.id,
		]);
		expect(h.signGet).toHaveBeenCalledWith({
			key: buildThumbKey(CAMP_A, FILE_READY),
			expiresIn: LIBRARY_THUMB_TTL_SECONDS,
			responseContentType: LIBRARY_THUMB_MIME,
			responseContentDisposition: "inline",
		});
	});

	it("editor assina o PUT da capa no limite de 150 KB", async () => {
		const h = harness(EDITOR);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A));
		const res = await handleLibraryRequest(h.deps, {
			action: "request-thumb-upload",
			fileId: FILE_READY,
			size: LIBRARY_THUMB_MAX_BYTES,
		});
		expect(res.status).toBe(200);
		expect(res.body.expiresIn).toBe(LIBRARY_THUMB_TTL_SECONDS);
		expect(res.body.headers).toEqual({
			"Content-Type": LIBRARY_THUMB_MIME,
			"Content-Length": String(LIBRARY_THUMB_MAX_BYTES),
		});
		expect(h.signPut).toHaveBeenCalledWith({
			key: buildPendingThumbKey(CAMP_A, FILE_READY),
			contentType: LIBRARY_THUMB_MIME,
			contentLength: LIBRARY_THUMB_MAX_BYTES,
			expiresIn: LIBRARY_THUMB_TTL_SECONDS,
		});
	});

	it("capa acima de 150 KB ou vazia é recusada antes de assinar", async () => {
		const h = harness(OWNER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A));
		const big = await handleLibraryRequest(h.deps, {
			action: "request-thumb-upload",
			fileId: FILE_READY,
			size: LIBRARY_THUMB_MAX_BYTES + 1,
		});
		const zero = await handleLibraryRequest(h.deps, {
			action: "request-thumb-upload",
			fileId: FILE_READY,
			size: 0,
		});
		expect(big.status).toBe(413);
		expect(zero.status).toBe(400);
		expect(big.body.uploadUrl).toBeUndefined();
		expect(h.signPut).not.toHaveBeenCalled();
	});

	it("PDF que não está ready recusa upload e confirm da capa", async () => {
		const h = harness(OWNER);
		const row = readyRow(FILE_PENDING, CAMP_A);
		row.status = "pending";
		h.rows.set(FILE_PENDING, row);
		const upload = await handleLibraryRequest(h.deps, {
			action: "request-thumb-upload",
			fileId: FILE_PENDING,
			size: 32,
		});
		const confirm = await handleLibraryRequest(h.deps, {
			action: "confirm-thumb",
			fileId: FILE_PENDING,
		});
		expect(upload.status).toBe(403);
		expect(confirm.status).toBe(403);
		expect(h.signPut).not.toHaveBeenCalled();
		expect(h.headObject).not.toHaveBeenCalled();
		expect(h.deleteObject).not.toHaveBeenCalled();
	});

	it("confirm promove WebP válido e apaga a pending", async () => {
		const h = harness(OWNER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A));
		const pending = buildPendingThumbKey(CAMP_A, FILE_READY);
		const finalKey = buildThumbKey(CAMP_A, FILE_READY);
		h.objects.set(pending, {
			bytes: webpBytes(64),
			contentType: LIBRARY_THUMB_MIME,
		});
		const res = await handleLibraryRequest(h.deps, {
			action: "confirm-thumb",
			fileId: FILE_READY,
		});
		expect(res).toEqual({
			status: 200,
			body: { fileId: FILE_READY, thumbStatus: "ready" },
		});
		expect(h.readObjectRange).toHaveBeenCalledWith(pending, "bytes=0-11");
		expect(h.copyObject).toHaveBeenCalledWith(
			pending,
			finalKey,
			LIBRARY_THUMB_MIME,
		);
		expect(h.objects.has(pending)).toBe(false);
		expect(h.objects.has(finalKey)).toBe(true);
		expect(h.rows.get(FILE_READY)).toMatchObject({
			thumb_status: "ready",
			thumb_path: finalKey,
			thumb_updated_at: "2026-11-21T12:00:00.000Z",
		});
	});

	it("WebP falso responde 422, apaga a pending e não grava a linha", async () => {
		const h = harness(OWNER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A, "failed"));
		const pending = buildPendingThumbKey(CAMP_A, FILE_READY);
		const fake = webpBytes(24);
		fake.set(new TextEncoder().encode("WAVE"), 8);
		h.objects.set(pending, { bytes: fake, contentType: LIBRARY_THUMB_MIME });
		const res = await handleLibraryRequest(h.deps, {
			action: "confirm-thumb",
			fileId: FILE_READY,
		});
		expect(res.status).toBe(422);
		expect(h.objects.has(pending)).toBe(false);
		expect(h.copyObject).not.toHaveBeenCalled();
		expect(h.updates).toEqual([]);
		expect(h.rows.get(FILE_READY)?.thumb_status).toBe("failed");
		expect(h.deleteObject).toHaveBeenCalledWith(pending);
	});

	it("objeto acima de 150 KB no confirm é 422 e a pending some", async () => {
		const h = harness(OWNER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A));
		const pending = buildPendingThumbKey(CAMP_A, FILE_READY);
		h.objects.set(pending, {
			bytes: webpBytes(LIBRARY_THUMB_MAX_BYTES + 1),
			contentType: LIBRARY_THUMB_MIME,
		});
		const res = await handleLibraryRequest(h.deps, {
			action: "confirm-thumb",
			fileId: FILE_READY,
		});
		expect(res.status).toBe(422);
		expect(h.objects.has(pending)).toBe(false);
		expect(h.copyObject).not.toHaveBeenCalled();
		expect(h.updates).toEqual([]);
		expect(h.rows.get(FILE_READY)?.thumb_status).toBe("pending");
	});

	it("61 ids em request-thumb-reads responde 400 e não consulta", async () => {
		const h = harness(OWNER);
		const fileIds = Array.from({ length: 61 }, (_, index) => idAt(index + 1));
		const res = await handleLibraryRequest(h.deps, {
			action: "request-thumb-reads",
			campaignId: CAMP_A,
			fileIds,
		});
		expect(res.status).toBe(400);
		expect(h.listFilesByIds).not.toHaveBeenCalled();
		expect(h.campaignAccess).not.toHaveBeenCalled();
		expect(h.signGet).not.toHaveBeenCalled();
	});

	it("report-thumb-failed em linha ready não altera; pending vira failed", async () => {
		const h = harness(OWNER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A, "ready"));
		h.rows.set(FILE_PENDING, readyRow(FILE_PENDING, CAMP_A, "pending"));
		const ready = await handleLibraryRequest(h.deps, {
			action: "report-thumb-failed",
			fileId: FILE_READY,
		});
		expect(ready.status).toBe(200);
		expect(ready.body.thumbStatus).toBe("ready");
		expect(h.rows.get(FILE_READY)?.thumb_status).toBe("ready");
		expect(h.updates[0]).toEqual({
			id: FILE_READY,
			patch: { thumb_status: "failed" },
			match: { thumb_status: "pending" },
		});
		const failed = await handleLibraryRequest(h.deps, {
			action: "report-thumb-failed",
			fileId: FILE_PENDING,
		});
		expect(failed.body.thumbStatus).toBe("failed");
		expect(h.rows.get(FILE_PENDING)?.thumb_status).toBe("failed");
		expect(h.rows.get(FILE_PENDING)?.thumb_path).toBeNull();
	});

	it("delete apaga a miniatura final e a pending, mesmo se uma não existe", async () => {
		const h = harness(OWNER);
		const row = readyRow(FILE_READY, CAMP_A, "ready");
		h.rows.set(FILE_READY, row);
		const thumb = buildThumbKey(CAMP_A, FILE_READY);
		const pendingThumb = buildPendingThumbKey(CAMP_A, FILE_READY);
		h.objects.set(thumb, {
			bytes: webpBytes(),
			contentType: LIBRARY_THUMB_MIME,
		});
		const res = await handleLibraryRequest(h.deps, {
			action: "delete",
			fileId: FILE_READY,
		});
		expect(res).toEqual({
			status: 200,
			body: { fileId: FILE_READY, deleted: true },
		});
		expect(h.objects.has(thumb)).toBe(false);
		expect(h.rows.has(FILE_READY)).toBe(false);
		expect(h.deleteObject).toHaveBeenCalledWith(row.r2_key);
		expect(h.deleteObject).toHaveBeenCalledWith(
			buildPendingLibraryKey(CAMP_A, FILE_READY),
		);
		expect(h.deleteObject).toHaveBeenCalledWith(thumb);
		expect(h.deleteObject).toHaveBeenCalledWith(pendingThumb);
	});

	it("não assina capa cujo caminho não é o da migração", async () => {
		const h = harness(OWNER);
		const row = readyRow(FILE_READY, CAMP_A, "ready");
		row.thumb_path = "library/outro/arquivo.thumb.webp";
		h.rows.set(FILE_READY, row);
		const res = await handleLibraryRequest(h.deps, {
			action: "request-thumb-reads",
			campaignId: CAMP_A,
			fileIds: [FILE_READY],
		});
		expect(res.status).toBe(200);
		expect(res.body.urls).toEqual({});
		expect(h.signGet).not.toHaveBeenCalled();
	});

	it("NoSuchKey no objeto não é erro de delete", () => {
		const missing = new Error("missing");
		missing.name = "NoSuchKey";
		expect(isMissingStoredObject(missing)).toBe(true);
		expect(isMissingStoredObject(new Error("rede"))).toBe(false);
	});
});

describe("library-r2 handler · PDF que já existia", () => {
	it("confirm-upload ainda exige %PDF- e apaga a linha se não for", async () => {
		const h = harness(OWNER);
		const row = readyRow(FILE_PENDING, CAMP_A);
		row.status = "pending";
		const fake = new TextEncoder().encode("nao e pdf");
		row.size_bytes = fake.length;
		h.rows.set(FILE_PENDING, row);
		h.objects.set(buildPendingLibraryKey(CAMP_A, FILE_PENDING), {
			bytes: fake,
			contentType: "application/pdf",
		});
		const res = await handleLibraryRequest(h.deps, {
			action: "confirm-upload",
			fileId: FILE_PENDING,
		});
		expect(res.status).toBe(422);
		expect(h.rows.has(FILE_PENDING)).toBe(false);
	});

	it("jogador ainda lê o PDF ready", async () => {
		const h = harness(VIEWER);
		h.rows.set(FILE_READY, readyRow(FILE_READY, CAMP_A));
		const res = await handleLibraryRequest(h.deps, {
			action: "request-read",
			fileId: FILE_READY,
		});
		expect(res.status).toBe(200);
		expect(res.body.expiresIn).toBe(300);
		expect(h.signGet).toHaveBeenCalledWith(
			expect.objectContaining({ key: buildLibraryKey(CAMP_A, FILE_READY) }),
		);
	});
});
