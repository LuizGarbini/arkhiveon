/**
 * Núcleo do backfill das capas da Biblioteca (F4).
 * Seleção, resumo e orquestração com dependências injetadas — assim os
 * testes não falam com o Supabase real nem com o R2.
 */
import {
	LIBRARY_THUMB_MAX_BYTES,
	LIBRARY_THUMB_MIME,
} from "../../../supabase/functions/_shared/library-guard";
import {
	type LibraryThumbStatus,
	parseLibraryThumbStatus,
	shouldGenerateLibraryThumb,
} from "./library-thumb";

export const BACKFILL_DEFAULT_CONCURRENCY = 2;
export const BACKFILL_MAX_CONCURRENCY = 4;
export const BACKFILL_MAX_ATTEMPTS = 3;
/** Teto padrão só do script. O envio no cliente continua 64/32 MB. */
export const BACKFILL_DEFAULT_MAX_MB = 160;
export const BACKFILL_DEFAULT_MAX_BYTES = BACKFILL_DEFAULT_MAX_MB * 1024 * 1024;
export const PROD_PROJECT_REF = "axnektdqoxjhbbfsidfj";

export type BackfillRole = "owner" | "editor" | "viewer";

export type BackfillCampaign = {
	id: string;
	name: string;
	role: BackfillRole;
};

export type BackfillFile = {
	id: string;
	campaignId: string;
	campaignName: string;
	title: string;
	sizeBytes: number;
	thumbStatus: LibraryThumbStatus;
	role: BackfillRole;
};

export type BackfillCliOptions = {
	apply: boolean;
	retryFailed: boolean;
	confirmProd: boolean;
	limit: number | null;
	campaignId: string | null;
	concurrency: number;
	maxMb: number;
};

export type BackfillInventoryCounts = {
	ready: number;
	pending: number;
	failed: number;
	overLimit: number;
};

export type CampaignInventory = {
	campaignId: string;
	campaignName: string;
	role: BackfillRole;
	canWrite: boolean;
	counts: BackfillInventoryCounts;
	queued: number;
};

export type BackfillPlan = {
	inventory: CampaignInventory[];
	queue: BackfillFile[];
	totals: BackfillInventoryCounts & { files: number; queued: number };
};

export type BackfillFileResult = {
	fileId: string;
	campaignId: string;
	title: string;
	outcome: "ready" | "failed" | "skipped";
	reason: string;
};

export type BackfillReport = {
	dryRun: boolean;
	plan: BackfillPlan;
	results: BackfillFileResult[];
	ready: number;
	failed: number;
	skipped: number;
	sizeLimit: number;
};

export type BackfillLogger = (line: string) => void;

export type BackfillDeps = {
	listCampaigns: () => Promise<BackfillCampaign[]>;
	listFiles: (campaignId: string) => Promise<
		Array<{
			id: string;
			title: string;
			sizeBytes: number;
			thumbStatus: unknown;
		}>
	>;
	downloadPdf: (fileId: string) => Promise<Uint8Array>;
	renderWebp: (pdfBytes: Uint8Array) => Promise<Uint8Array>;
	invoke: (body: Record<string, unknown>) => Promise<unknown>;
	put: (
		url: string,
		body: Uint8Array,
		headers: Record<string, string>,
	) => Promise<void>;
	log: BackfillLogger;
	sizeLimit: number;
};

export function canWriteLibraryThumbs(role: BackfillRole): boolean {
	return role === "owner" || role === "editor";
}

export function parseBackfillRole(value: unknown): BackfillRole {
	return value === "owner" || value === "editor" || value === "viewer"
		? value
		: "viewer";
}

export function isProdSupabaseUrl(url: string): boolean {
	return url.toLowerCase().includes(PROD_PROJECT_REF);
}

export function isServiceRoleJwt(token: string): boolean {
	const parts = token.split(".");
	if (parts.length < 2) return false;
	try {
		const padded = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4);
		const payload = JSON.parse(
			Buffer.from(padded, "base64").toString("utf8"),
		) as { role?: unknown };
		return payload.role === "service_role";
	} catch {
		return false;
	}
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JWT_RE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._-]+/gi;

/** Tira e-mail, JWT e Bearer de qualquer texto que vá para o terminal. */
export function redactBackfillOutput(text: string): string {
	return text
		.replace(JWT_RE, "[token]")
		.replace(BEARER_RE, "Bearer [token]")
		.replace(EMAIL_RE, "[email]");
}

export function parseBackfillArgs(argv: string[]): BackfillCliOptions {
	const options: BackfillCliOptions = {
		apply: false,
		retryFailed: false,
		confirmProd: false,
		limit: null,
		campaignId: null,
		concurrency: BACKFILL_DEFAULT_CONCURRENCY,
		maxMb: BACKFILL_DEFAULT_MAX_MB,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--apply") options.apply = true;
		else if (arg === "--dry-run") options.apply = false;
		else if (arg === "--retry-failed") options.retryFailed = true;
		else if (arg === "--confirm-prod") options.confirmProd = true;
		else if (arg === "--limit") {
			const raw = argv[++i];
			const limit = Number(raw);
			if (!Number.isInteger(limit) || limit <= 0) {
				throw new Error("Use --limit com um número inteiro maior que 0.");
			}
			options.limit = limit;
		} else if (arg === "--campaign") {
			const id = argv[++i];
			if (!id) throw new Error("Use --campaign com o id da campanha.");
			options.campaignId = id;
		} else if (arg === "--concurrency") {
			const raw = argv[++i];
			const value = Number(raw);
			if (
				!Number.isInteger(value) ||
				value < 1 ||
				value > BACKFILL_MAX_CONCURRENCY
			) {
				throw new Error(
					`Use --concurrency entre 1 e ${BACKFILL_MAX_CONCURRENCY}.`,
				);
			}
			options.concurrency = value;
		} else if (arg === "--max-mb") {
			const raw = argv[++i];
			const value = Number(raw);
			if (!Number.isInteger(value) || value < 1 || value > 1024) {
				throw new Error("Use --max-mb com um número inteiro entre 1 e 1024.");
			}
			options.maxMb = value;
		} else if (arg === "--help" || arg === "-h") {
			throw new HelpRequested();
		} else {
			throw new Error(`Opção desconhecida: ${arg}`);
		}
	}
	return options;
}

export class HelpRequested extends Error {
	constructor() {
		super("help");
		this.name = "HelpRequested";
	}
}

export function assertApplyAllowed(
	url: string,
	options: { apply: boolean; confirmProd: boolean },
): void {
	if (!options.apply) return;
	if (isProdSupabaseUrl(url) && !options.confirmProd) {
		throw new Error(
			"Este endereço é o de produção. O dry-run pode rodar; o --apply só com --confirm-prod, e só o Luiz executa.",
		);
	}
}

function emptyCounts(): BackfillInventoryCounts {
	return { ready: 0, pending: 0, failed: 0, overLimit: 0 };
}

export function selectBackfillFiles(
	files: BackfillFile[],
	options: Pick<BackfillCliOptions, "retryFailed" | "limit" | "campaignId"> & {
		sizeLimit: number;
	},
): BackfillPlan {
	const scoped = options.campaignId
		? files.filter((file) => file.campaignId === options.campaignId)
		: files;

	const byCampaign = new Map<string, CampaignInventory>();
	const ensure = (file: BackfillFile): CampaignInventory => {
		const current = byCampaign.get(file.campaignId);
		if (current) return current;
		const created: CampaignInventory = {
			campaignId: file.campaignId,
			campaignName: file.campaignName,
			role: file.role,
			canWrite: canWriteLibraryThumbs(file.role),
			counts: emptyCounts(),
			queued: 0,
		};
		byCampaign.set(file.campaignId, created);
		return created;
	};

	for (const file of scoped) {
		const row = ensure(file);
		if (file.thumbStatus === "ready") row.counts.ready += 1;
		else if (file.thumbStatus === "failed") row.counts.failed += 1;
		else row.counts.pending += 1;
		if (
			file.thumbStatus !== "ready" &&
			!shouldGenerateLibraryThumb(file.sizeBytes, options.sizeLimit)
		) {
			row.counts.overLimit += 1;
		}
	}

	const wanted = (status: LibraryThumbStatus): boolean => {
		if (status === "ready") return false;
		if (status === "failed") return Boolean(options.retryFailed);
		return status === "pending";
	};

	let queue = scoped.filter(
		(file) => canWriteLibraryThumbs(file.role) && wanted(file.thumbStatus),
	);
	queue.sort(
		(a, b) =>
			a.campaignName.localeCompare(b.campaignName, "pt") ||
			a.id.localeCompare(b.id),
	);
	if (options.limit != null) queue = queue.slice(0, options.limit);

	const queuedByCampaign = new Map<string, number>();
	for (const file of queue) {
		queuedByCampaign.set(
			file.campaignId,
			(queuedByCampaign.get(file.campaignId) ?? 0) + 1,
		);
	}
	for (const row of byCampaign.values()) {
		row.queued = queuedByCampaign.get(row.campaignId) ?? 0;
	}

	const inventory = [...byCampaign.values()].sort((a, b) =>
		a.campaignName.localeCompare(b.campaignName, "pt"),
	);
	const totals = inventory.reduce(
		(acc, row) => {
			acc.ready += row.counts.ready;
			acc.pending += row.counts.pending;
			acc.failed += row.counts.failed;
			acc.overLimit += row.counts.overLimit;
			acc.files += row.counts.ready + row.counts.pending + row.counts.failed;
			return acc;
		},
		{ ...emptyCounts(), files: 0, queued: queue.length },
	);
	return { inventory, queue, totals };
}

export function formatBackfillPlan(
	plan: BackfillPlan,
	options: { apply: boolean; sizeLimit: number },
): string {
	const lines: string[] = [];
	const mode = options.apply
		? "APPLY (vai gravar capas)"
		: "DRY-RUN (não grava)";
	lines.push(`Modo: ${mode}`);
	lines.push(
		`Teto: ${Math.round(options.sizeLimit / (1024 * 1024))} MB (só do script; o envio no navegador continua 64 MB no computador e 32 MB no toque).`,
	);
	if (plan.inventory.length === 0) {
		lines.push("Nenhuma campanha visível com PDF pronto.");
	}
	for (const row of plan.inventory) {
		const roleLabel =
			row.role === "owner"
				? "mestre"
				: row.role === "editor"
					? "editor"
					: "jogador";
		const write = row.canWrite ? "" : " — sem permissão para gravar capa";
		lines.push(`Campanha “${row.campaignName}” (${roleLabel})${write}`);
		lines.push(
			`  capas: ${row.counts.ready} prontas, ${row.counts.pending} pendentes, ${row.counts.failed} falhas` +
				(row.counts.overLimit ? `, ${row.counts.overLimit} acima do teto` : ""),
		);
		if (row.canWrite) {
			lines.push(`  na fila deste lote: ${row.queued}`);
		}
	}
	lines.push(
		`Total: ${plan.totals.files} PDFs prontos; capas ${plan.totals.ready} prontas, ${plan.totals.pending} pendentes, ${plan.totals.failed} falhas.`,
	);
	lines.push(`A processar neste lote: ${plan.totals.queued}.`);
	if (!options.apply) {
		lines.push(
			"Nenhuma chamada de escrita foi feita. Para gravar, rode de novo com --apply (em produção, também --confirm-prod).",
		);
	}
	return lines.join("\n");
}

export function formatBackfillReport(report: BackfillReport): string {
	const lines = [
		formatBackfillPlan(report.plan, {
			apply: !report.dryRun,
			sizeLimit: report.sizeLimit,
		}),
	];
	if (!report.dryRun) {
		lines.push(
			`Resumo: ${report.ready} capas prontas, ${report.failed} falhas, ${report.skipped} puladas.`,
		);
	}
	return lines.join("\n");
}

async function collectFiles(
	deps: BackfillDeps,
	options: BackfillCliOptions,
): Promise<BackfillFile[]> {
	const campaigns = await deps.listCampaigns();
	const files: BackfillFile[] = [];
	for (const campaign of campaigns) {
		if (options.campaignId && campaign.id !== options.campaignId) continue;
		const rows = await deps.listFiles(campaign.id);
		for (const row of rows) {
			files.push({
				id: row.id,
				campaignId: campaign.id,
				campaignName: campaign.name,
				title: row.title,
				sizeBytes: row.sizeBytes,
				thumbStatus: parseLibraryThumbStatus(row.thumbStatus),
				role: campaign.role,
			});
		}
	}
	return files;
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

async function markFailed(deps: BackfillDeps, fileId: string): Promise<void> {
	await deps.invoke({ action: "report-thumb-failed", fileId });
}

async function processFile(
	file: BackfillFile,
	deps: BackfillDeps,
): Promise<BackfillFileResult> {
	const base = {
		fileId: file.id,
		campaignId: file.campaignId,
		title: file.title,
	};
	if (!shouldGenerateLibraryThumb(file.sizeBytes, deps.sizeLimit)) {
		await markFailed(deps, file.id);
		deps.log(
			`failed  “${file.title}” na campanha “${file.campaignName}”: acima do teto.`,
		);
		return { ...base, outcome: "failed", reason: "acima do teto" };
	}

	let lastError = "falha desconhecida";
	for (let attempt = 1; attempt <= BACKFILL_MAX_ATTEMPTS; attempt++) {
		try {
			const pdfBytes = await deps.downloadPdf(file.id);
			const webp = await deps.renderWebp(pdfBytes);
			if (webp.byteLength === 0 || webp.byteLength > LIBRARY_THUMB_MAX_BYTES) {
				throw new Error("A capa ficou acima de 150 KB.");
			}
			const ticket = (await deps.invoke({
				action: "request-thumb-upload",
				fileId: file.id,
				size: webp.byteLength,
			})) as { uploadUrl?: string; headers?: Record<string, string> };
			if (!ticket?.uploadUrl) throw new Error("A função não devolveu o link.");
			await deps.put(ticket.uploadUrl, webp, ticket.headers ?? {});
			await deps.invoke({ action: "confirm-thumb", fileId: file.id });
			deps.log(`ok      “${file.title}” na campanha “${file.campaignName}”.`);
			return { ...base, outcome: "ready", reason: "pronta" };
		} catch (error) {
			lastError = error instanceof Error ? error.message : "falha desconhecida";
			if (attempt < BACKFILL_MAX_ATTEMPTS) {
				await sleep(500 * 2 ** (attempt - 1));
			}
		}
	}
	try {
		await markFailed(deps, file.id);
	} catch {
		// A capa permanece pending se a marcação falhar; a próxima execução retoma.
	}
	deps.log(
		`failed  “${file.title}” na campanha “${file.campaignName}”: ${redactBackfillOutput(lastError)}`,
	);
	return {
		...base,
		outcome: "failed",
		reason: redactBackfillOutput(lastError),
	};
}

async function mapPool<T, R>(
	items: T[],
	concurrency: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	if (items.length === 0) return [];
	const results = new Array<R>(items.length);
	let next = 0;
	const workers = Array.from(
		{ length: Math.min(concurrency, items.length) },
		async () => {
			while (next < items.length) {
				const index = next;
				next += 1;
				results[index] = await fn(items[index]);
			}
		},
	);
	await Promise.all(workers);
	return results;
}

export async function runLibraryThumbsBackfill(
	deps: BackfillDeps,
	options: BackfillCliOptions,
): Promise<BackfillReport> {
	const files = await collectFiles(deps, options);
	const plan = selectBackfillFiles(files, {
		retryFailed: options.retryFailed,
		limit: options.limit,
		campaignId: options.campaignId,
		sizeLimit: deps.sizeLimit,
	});
	deps.log(
		formatBackfillPlan(plan, {
			apply: options.apply,
			sizeLimit: deps.sizeLimit,
		}),
	);
	if (!options.apply) {
		return {
			dryRun: true,
			plan,
			results: [],
			ready: 0,
			failed: 0,
			skipped: 0,
			sizeLimit: deps.sizeLimit,
		};
	}
	const results = await mapPool(plan.queue, options.concurrency, (file) =>
		processFile(file, deps),
	);
	const ready = results.filter((row) => row.outcome === "ready").length;
	const failed = results.filter((row) => row.outcome === "failed").length;
	const skipped = results.filter((row) => row.outcome === "skipped").length;
	const report: BackfillReport = {
		dryRun: false,
		plan,
		results,
		ready,
		failed,
		skipped,
		sizeLimit: deps.sizeLimit,
	};
	deps.log(
		`Resumo: ${ready} capas prontas, ${failed} falhas, ${skipped} puladas.`,
	);
	return report;
}

export { LIBRARY_THUMB_MIME };
