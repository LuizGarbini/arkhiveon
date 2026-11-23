import { describe, expect, it, vi } from "vitest";
import { LIBRARY_THUMB_DESKTOP_MAX_BYTES } from "./library-thumb";
import {
	assertApplyAllowed,
	type BackfillDeps,
	type BackfillFile,
	isProdSupabaseUrl,
	isServiceRoleJwt,
	PROD_PROJECT_REF,
	parseBackfillArgs,
	redactBackfillOutput,
	runLibraryThumbsBackfill,
	selectBackfillFiles,
} from "./library-thumbs-backfill";

function file(
	partial: Partial<BackfillFile> & Pick<BackfillFile, "id">,
): BackfillFile {
	return {
		campaignId: "camp-a",
		campaignName: "A Coroa",
		title: partial.id,
		sizeBytes: 1_000_000,
		thumbStatus: "pending",
		role: "owner",
		...partial,
	};
}

describe("parseBackfillArgs", () => {
	it("começa em dry-run e só grava com --apply", () => {
		expect(parseBackfillArgs([]).apply).toBe(false);
		expect(parseBackfillArgs(["--dry-run"]).apply).toBe(false);
		expect(parseBackfillArgs(["--apply"]).apply).toBe(true);
		expect(
			parseBackfillArgs(["--apply", "--retry-failed", "--limit", "5"]).limit,
		).toBe(5);
		expect(parseBackfillArgs(["--concurrency", "2"]).concurrency).toBe(2);
	});

	it("recusa opção desconhecida e limite inválido", () => {
		expect(() => parseBackfillArgs(["--explode"])).toThrow(/desconhecida/);
		expect(() => parseBackfillArgs(["--limit", "0"])).toThrow(/limit/);
	});
});

describe("seleção e idempotência", () => {
	const catalog: BackfillFile[] = [
		file({ id: "ready-1", thumbStatus: "ready", title: "Pronto" }),
		file({ id: "pend-1", thumbStatus: "pending", title: "Pendente um" }),
		file({ id: "pend-2", thumbStatus: "pending", title: "Pendente dois" }),
		file({ id: "fail-1", thumbStatus: "failed", title: "Falhou" }),
		file({
			id: "view-1",
			thumbStatus: "pending",
			title: "Do jogador",
			role: "viewer",
			campaignId: "camp-b",
			campaignName: "Outra",
		}),
		file({
			id: "big-1",
			thumbStatus: "pending",
			title: "Grande",
			sizeBytes: LIBRARY_THUMB_DESKTOP_MAX_BYTES + 1,
		}),
	];

	it("por padrão só pega pending e pula ready, failed e quem não pode gravar", () => {
		const plan = selectBackfillFiles(catalog, {
			retryFailed: false,
			limit: null,
			campaignId: null,
			sizeLimit: LIBRARY_THUMB_DESKTOP_MAX_BYTES,
		});
		expect(plan.queue.map((row) => row.id).sort()).toEqual([
			"big-1",
			"pend-1",
			"pend-2",
		]);
		expect(plan.queue.some((row) => row.id === "ready-1")).toBe(false);
		expect(plan.queue.some((row) => row.id === "fail-1")).toBe(false);
		expect(plan.queue.some((row) => row.id === "view-1")).toBe(false);
		expect(plan.totals.ready).toBe(1);
		expect(plan.totals.pending).toBe(4);
		expect(plan.totals.failed).toBe(1);
		expect(plan.totals.overLimit).toBe(1);
		expect(plan.totals.queued).toBe(3);
	});

	it("com --retry-failed inclui as falhas, mas continua pulando ready", () => {
		const plan = selectBackfillFiles(catalog, {
			retryFailed: true,
			limit: null,
			campaignId: null,
			sizeLimit: LIBRARY_THUMB_DESKTOP_MAX_BYTES,
		});
		expect(plan.queue.map((row) => row.id).sort()).toEqual([
			"big-1",
			"fail-1",
			"pend-1",
			"pend-2",
		]);
		expect(plan.queue.some((row) => row.thumbStatus === "ready")).toBe(false);
	});

	it("segunda execução com tudo ready não deixa ninguém na fila", () => {
		const onlyReady = catalog.map((row) => ({
			...row,
			thumbStatus: "ready" as const,
		}));
		const plan = selectBackfillFiles(onlyReady, {
			retryFailed: true,
			limit: null,
			campaignId: null,
			sizeLimit: LIBRARY_THUMB_DESKTOP_MAX_BYTES,
		});
		expect(plan.queue).toEqual([]);
		expect(plan.totals.queued).toBe(0);
	});

	it("obedece --limit e --campaign", () => {
		const limited = selectBackfillFiles(catalog, {
			retryFailed: false,
			limit: 1,
			campaignId: null,
			sizeLimit: LIBRARY_THUMB_DESKTOP_MAX_BYTES,
		});
		expect(limited.queue).toHaveLength(1);
		const onlyB = selectBackfillFiles(catalog, {
			retryFailed: false,
			limit: null,
			campaignId: "camp-b",
			sizeLimit: LIBRARY_THUMB_DESKTOP_MAX_BYTES,
		});
		expect(onlyB.queue).toEqual([]);
		expect(onlyB.totals.pending).toBe(1);
	});
});

describe("redação e produção", () => {
	it("tira e-mail, JWT e Bearer da saída", () => {
		const text = redactBackfillOutput(
			"contato luiz@example.com token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb e Bearer abc.def",
		);
		expect(text).not.toMatch(/example\.com/);
		expect(text).not.toMatch(/eyJ/);
		expect(text).not.toMatch(/Bearer abc/);
		expect(text).toMatch(/\[email\]/);
		expect(text).toMatch(/\[token\]/);
	});

	it("reconhece o projeto de produção e recusa service role", () => {
		expect(isProdSupabaseUrl(`https://${PROD_PROJECT_REF}.supabase.co`)).toBe(
			true,
		);
		expect(isProdSupabaseUrl("https://example.supabase.co")).toBe(false);
		expect(() =>
			assertApplyAllowed(`https://${PROD_PROJECT_REF}.supabase.co`, {
				apply: false,
				confirmProd: false,
			}),
		).not.toThrow();
		expect(() =>
			assertApplyAllowed(`https://${PROD_PROJECT_REF}.supabase.co`, {
				apply: true,
				confirmProd: false,
			}),
		).toThrow(/produção/);
		expect(() =>
			assertApplyAllowed(`https://${PROD_PROJECT_REF}.supabase.co`, {
				apply: true,
				confirmProd: true,
			}),
		).not.toThrow();
		const service = [
			"eyJhbGciOiJub25lIn0",
			Buffer.from(JSON.stringify({ role: "service_role" })).toString(
				"base64url",
			),
			"sig",
		].join(".");
		const anon = [
			"eyJhbGciOiJub25lIn0",
			Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url"),
			"sig",
		].join(".");
		expect(isServiceRoleJwt(service)).toBe(true);
		expect(isServiceRoleJwt(anon)).toBe(false);
	});
});

function webpBytes(): Uint8Array {
	const bytes = new Uint8Array(80);
	bytes.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
	return bytes;
}

describe("runLibraryThumbsBackfill (mock da edge)", () => {
	const campaigns = [
		{ id: "camp-a", name: "A Coroa", role: "owner" as const },
		{ id: "camp-b", name: "Outra", role: "viewer" as const },
	];
	const rows: Record<
		string,
		Array<{
			id: string;
			title: string;
			sizeBytes: number;
			thumbStatus: string;
		}>
	> = {
		"camp-a": [
			{ id: "ready-1", title: "Pronto", sizeBytes: 1000, thumbStatus: "ready" },
			{
				id: "pend-1",
				title: "Pendente",
				sizeBytes: 2000,
				thumbStatus: "pending",
			},
			{
				id: "big-1",
				title: "Grande",
				sizeBytes: LIBRARY_THUMB_DESKTOP_MAX_BYTES + 10,
				thumbStatus: "pending",
			},
			{ id: "fail-1", title: "Falhou", sizeBytes: 2000, thumbStatus: "failed" },
		],
		"camp-b": [
			{
				id: "other-1",
				title: "Alheio",
				sizeBytes: 2000,
				thumbStatus: "pending",
			},
		],
	};

	function makeDeps() {
		const writes: Record<string, unknown>[] = [];
		const downloads: string[] = [];
		const puts: number[] = [];
		const renders: number[] = [];
		const thumbs = new Map(
			Object.values(rows)
				.flat()
				.map((row) => [row.id, row.thumbStatus]),
		);
		const deps: BackfillDeps = {
			listCampaigns: async () => campaigns,
			listFiles: async (campaignId) =>
				(rows[campaignId] ?? []).map((row) => ({
					...row,
					thumbStatus: thumbs.get(row.id) ?? row.thumbStatus,
				})),
			downloadPdf: async (fileId) => {
				downloads.push(fileId);
				return new Uint8Array([0x25, 0x50, 0x44, 0x46]);
			},
			renderWebp: async () => {
				renders.push(1);
				return webpBytes();
			},
			invoke: async (body) => {
				writes.push(body);
				if (body.action === "request-read") {
					return { url: "https://example.test/pdf" };
				}
				if (body.action === "request-thumb-upload") {
					return { uploadUrl: "https://example.test/put", headers: {} };
				}
				if (body.action === "confirm-thumb") {
					thumbs.set(String(body.fileId), "ready");
					return { thumbStatus: "ready" };
				}
				if (body.action === "report-thumb-failed") {
					thumbs.set(String(body.fileId), "failed");
					return { thumbStatus: "failed" };
				}
				return {};
			},
			put: async () => {
				puts.push(1);
			},
			log: vi.fn(),
			sizeLimit: LIBRARY_THUMB_DESKTOP_MAX_BYTES,
		};
		return { deps, writes, downloads, puts, renders, thumbs };
	}

	it("dry-run não grava, não baixa e não renderiza", async () => {
		const ctx = makeDeps();
		const report = await runLibraryThumbsBackfill(ctx.deps, {
			apply: false,
			retryFailed: false,
			confirmProd: false,
			limit: null,
			campaignId: null,
			concurrency: 2,
		});
		expect(report.dryRun).toBe(true);
		expect(report.plan.totals.queued).toBe(2);
		expect(ctx.writes).toEqual([]);
		expect(ctx.downloads).toEqual([]);
		expect(ctx.puts).toEqual([]);
		expect(ctx.renders).toEqual([]);
		expect(ctx.thumbs.get("pend-1")).toBe("pending");
		expect(ctx.thumbs.get("big-1")).toBe("pending");
	});

	it("apply gera a pendente, marca a acima do teto como failed e pula ready; a segunda vez não trabalha", async () => {
		const ctx = makeDeps();
		const first = await runLibraryThumbsBackfill(ctx.deps, {
			apply: true,
			retryFailed: false,
			confirmProd: false,
			limit: null,
			campaignId: null,
			concurrency: 2,
		});
		expect(first.ready).toBe(1);
		expect(first.failed).toBe(1);
		expect(ctx.thumbs.get("pend-1")).toBe("ready");
		expect(ctx.thumbs.get("big-1")).toBe("failed");
		expect(ctx.thumbs.get("ready-1")).toBe("ready");
		expect(ctx.thumbs.get("fail-1")).toBe("failed");
		expect(ctx.downloads).toEqual(["pend-1"]);
		expect(
			ctx.writes.some(
				(body) =>
					body.action === "report-thumb-failed" && body.fileId === "big-1",
			),
		).toBe(true);
		expect(
			ctx.writes.some(
				(body) => body.action === "confirm-thumb" && body.fileId === "pend-1",
			),
		).toBe(true);
		expect(ctx.writes.some((body) => body.fileId === "other-1")).toBe(false);

		const writesAfterFirst = ctx.writes.length;
		const second = await runLibraryThumbsBackfill(ctx.deps, {
			apply: true,
			retryFailed: false,
			confirmProd: false,
			limit: null,
			campaignId: null,
			concurrency: 2,
		});
		expect(second.plan.totals.queued).toBe(0);
		expect(second.ready).toBe(0);
		expect(second.failed).toBe(0);
		expect(ctx.writes.length).toBe(writesAfterFirst);
	});

	it("com --retry-failed tenta de novo as que falharam", async () => {
		const ctx = makeDeps();
		const report = await runLibraryThumbsBackfill(ctx.deps, {
			apply: true,
			retryFailed: true,
			confirmProd: false,
			limit: null,
			campaignId: null,
			concurrency: 2,
		});
		expect(report.plan.queue.map((row) => row.id).sort()).toEqual([
			"big-1",
			"fail-1",
			"pend-1",
		]);
		expect(ctx.downloads.sort()).toEqual(["fail-1", "pend-1"]);
		expect(ctx.thumbs.get("fail-1")).toBe("ready");
	});
});
