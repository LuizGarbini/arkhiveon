/**
 * Backfill das capas da Biblioteca (F4).
 *
 * Usa a sessão do Luiz (anon key + login dele). Não lê .env, não usa
 * service role, não usa chave do R2. O padrão é --dry-run. Só grava com
 * --apply. Em produção, --apply exige também --confirm-prod, e só o Luiz roda.
 *
 *   pnpm library-thumbs-backfill
 *   pnpm library-thumbs-backfill --apply --confirm-prod
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { stdin as stdinFd, stdout as stdoutFd } from "node:process";
import { createInterface } from "node:readline";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../src/lib/database.types";
import { LIBRARY_THUMB_DESKTOP_MAX_BYTES } from "../src/lib/library/library-thumb";
import {
	assertApplyAllowed,
	type BackfillCampaign,
	type BackfillDeps,
	HelpRequested,
	isServiceRoleJwt,
	parseBackfillArgs,
	parseBackfillRole,
	redactBackfillOutput,
	runLibraryThumbsBackfill,
} from "../src/lib/library/library-thumbs-backfill";
import {
	LIBRARY_FILES_TABLE,
	LIBRARY_THUMB_MIME,
} from "../supabase/functions/_shared/library-guard";

const require = createRequire(import.meta.url);

const HELP = `Backfill das capas da Biblioteca.

Por padrão só mostra o que faria (--dry-run). Não grava nada.
Não lê arquivo .env. Informe a URL, a anon key e o login do Luiz
no ambiente da sessão ou no prompt. Nunca use a service role nem chave do R2.

  pnpm library-thumbs-backfill
  pnpm library-thumbs-backfill --apply --confirm-prod
  pnpm library-thumbs-backfill --apply --confirm-prod --limit 5
  pnpm library-thumbs-backfill --apply --confirm-prod --retry-failed

Opções:
  --dry-run          padrão: lista e conta, não grava
  --apply            grava capas (em produção exige --confirm-prod)
  --confirm-prod     confirma que você é o Luiz e quer gravar em produção
  --retry-failed     inclui capas que já falharam (por padrão só pending)
  --limit N          processa no máximo N arquivos
  --campaign ID      restringe a uma campanha
  --concurrency N    padrão 2, máximo 4
  -h, --help         esta ajuda

Variáveis da sessão (não grave em arquivo):
  LIBRARY_BACKFILL_URL ou SUPABASE_URL
  LIBRARY_BACKFILL_ANON_KEY ou SUPABASE_ANON_KEY
  LIBRARY_BACKFILL_EMAIL
  LIBRARY_BACKFILL_PASSWORD
`;

function sessionEnv(name: string, ...aliases: string[]): string {
	for (const key of [name, ...aliases]) {
		const value = process.env[key]?.trim();
		if (value) return value;
	}
	return "";
}

function readLine(question: string, hidden: boolean): Promise<string> {
	if (!hidden) {
		const rl = createInterface({ input: stdinFd, output: stdoutFd });
		return new Promise((resolve) => {
			rl.question(question, (answer) => {
				rl.close();
				resolve(answer.trim());
			});
		});
	}
	return new Promise((resolve, reject) => {
		stdoutFd.write(question);
		const chunks: Buffer[] = [];
		const wasRaw = stdinFd.isTTY ? stdinFd.isRaw : false;
		if (stdinFd.isTTY) stdinFd.setRawMode(true);
		stdinFd.resume();
		const onData = (chunk: Buffer) => {
			const code = chunk[0];
			if (code === 3) {
				cleanup();
				reject(new Error("Cancelado."));
				return;
			}
			if (code === 13 || code === 10) {
				cleanup();
				stdoutFd.write("\n");
				resolve(Buffer.concat(chunks).toString("utf8"));
				return;
			}
			if (code === 127) {
				chunks.pop();
				return;
			}
			chunks.push(chunk);
		};
		const cleanup = () => {
			stdinFd.off("data", onData);
			if (stdinFd.isTTY) stdinFd.setRawMode(wasRaw);
			stdinFd.pause();
		};
		stdinFd.on("data", onData);
	});
}

async function resolveCredentials(): Promise<{
	url: string;
	anonKey: string;
	email: string;
	password: string;
}> {
	const url =
		sessionEnv("LIBRARY_BACKFILL_URL", "SUPABASE_URL") ||
		(await readLine("URL do Supabase: ", false));
	const anonKey =
		sessionEnv("LIBRARY_BACKFILL_ANON_KEY", "SUPABASE_ANON_KEY") ||
		(await readLine("Anon key: ", true));
	const email =
		sessionEnv("LIBRARY_BACKFILL_EMAIL") ||
		(await readLine("E-mail da sessão: ", false));
	const password =
		sessionEnv("LIBRARY_BACKFILL_PASSWORD") ||
		(await readLine("Senha: ", true));
	if (!url || !anonKey || !email || !password) {
		throw new Error("Informe URL, anon key, e-mail e senha da sessão.");
	}
	if (isServiceRoleJwt(anonKey)) {
		throw new Error(
			"Esta chave é service role. O backfill só aceita a anon key.",
		);
	}
	return { url, anonKey, email, password };
}

function loadWasmBinary(): ArrayBuffer {
	const wasmPath = require.resolve("@embedpdf/pdfium/dist/pdfium.wasm");
	const bytes = readFileSync(wasmPath);
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	);
}

async function invokeLibrary(
	client: SupabaseClient<Database>,
	body: Record<string, unknown>,
): Promise<unknown> {
	const { data, error } = await client.functions.invoke("library-r2", { body });
	if (error) {
		const status = (error as { context?: { status?: number } }).context?.status;
		throw new Error(`A função recusou o pedido (${status ?? "sem status"}).`);
	}
	return data;
}

async function listCampaignsFromSession(
	client: SupabaseClient<Database>,
): Promise<BackfillCampaign[]> {
	const { data, error } = await client.rpc("get_user_accessible_campaigns");
	if (!error && data) {
		return data.map((row) => ({
			id: row.id,
			name: row.name,
			role: parseBackfillRole(row.my_role),
		}));
	}

	const { data: userRes, error: userError } = await client.auth.getUser();
	const userId = userRes?.user?.id;
	if (userError || !userId) {
		throw new Error("Não foi possível listar as campanhas.");
	}

	const { data: memberData, error: memberError } = await client
		.from("memberships")
		.select("role, campaign:campaigns ( id, name )")
		.eq("user_id", userId);
	if (memberError) {
		throw new Error("Não foi possível listar as campanhas.");
	}

	const campaigns: BackfillCampaign[] = [];
	for (const row of memberData ?? []) {
		const related = row.campaign;
		const camp = Array.isArray(related) ? related[0] : related;
		if (!camp?.id) continue;
		campaigns.push({
			id: camp.id,
			name: camp.name,
			role: parseBackfillRole(row.role),
		});
	}
	return campaigns;
}

function createDeps(
	client: SupabaseClient<Database>,
	log: (line: string) => void,
	renderWebp: (pdf: Uint8Array) => Promise<Uint8Array>,
): BackfillDeps {
	return {
		listCampaigns: () => listCampaignsFromSession(client),
		async listFiles(campaignId) {
			type LibraryFileRow = {
				id: string;
				title: string;
				size_bytes: number;
				thumb_status: string | null;
			};
			const { data, error } = await client
				.from(LIBRARY_FILES_TABLE)
				.select("id, title, size_bytes, thumb_status")
				.eq("campaign_id", campaignId)
				.eq("status", "ready")
				.order("id", { ascending: true });
			if (error) throw new Error("Não foi possível listar os PDFs da campanha.");
			// Os tipos gerados ainda não trazem thumb_status (0080). O select é o mesmo do cliente.
			const rows = (data ?? []) as unknown as LibraryFileRow[];
			return rows.map((row) => ({
				id: row.id,
				title: row.title,
				sizeBytes: Number(row.size_bytes),
				thumbStatus: row.thumb_status,
			}));
		},
		async downloadPdf(fileId) {
			const result = (await invokeLibrary(client, {
				action: "request-read",
				fileId,
			})) as { url?: string };
			if (!result?.url) throw new Error("A função não devolveu o PDF.");
			const response = await fetch(result.url);
			if (!response.ok) throw new Error("Não foi possível baixar o PDF.");
			return new Uint8Array(await response.arrayBuffer());
		},
		renderWebp,
		invoke: (body) => invokeLibrary(client, body),
		async put(url, body, headers) {
			const response = await fetch(url, {
				method: "PUT",
				headers: {
					...headers,
					"Content-Type": headers["Content-Type"] ?? LIBRARY_THUMB_MIME,
				},
				body: Buffer.from(body),
			});
			if (!response.ok) throw new Error("O envio da capa falhou.");
		},
		log,
		sizeLimit: LIBRARY_THUMB_DESKTOP_MAX_BYTES,
	};
}

async function main(): Promise<void> {
	let options;
	try {
		options = parseBackfillArgs(process.argv.slice(2));
	} catch (error) {
		if (error instanceof HelpRequested) {
			process.stdout.write(`${HELP}\n`);
			return;
		}
		throw error;
	}

	const credentials = await resolveCredentials();
	assertApplyAllowed(credentials.url, {
		apply: options.apply,
		confirmProd: options.confirmProd,
	});

	const client = createClient<Database>(credentials.url, credentials.anonKey, {
		auth: {
			persistSession: false,
			autoRefreshToken: false,
			detectSessionInUrl: false,
		},
	});
	const { error: signError } = await client.auth.signInWithPassword({
		email: credentials.email,
		password: credentials.password,
	});
	credentials.password = "";
	if (signError) throw new Error("Não foi possível entrar com esta sessão.");

	const log = (line: string) => {
		process.stdout.write(`${redactBackfillOutput(line)}\n`);
	};

	let closeEncoder = async (): Promise<void> => {};
	let renderWebp: (pdf: Uint8Array) => Promise<Uint8Array> = async () => {
		throw new Error("O dry-run não renderiza capa.");
	};

	if (options.apply) {
		const { renderLibraryThumbPage1Rgba } = await import(
			"../src/lib/library/library-thumb-render"
		);
		const { createPlaywrightWebpEncoder } = await import(
			"../src/lib/library/library-thumb-webp-node"
		);
		const wasmBinary = loadWasmBinary();
		const encoder = await createPlaywrightWebpEncoder(
			process.env.PLAYWRIGHT_CHROME
				? { executablePath: process.env.PLAYWRIGHT_CHROME }
				: undefined,
		);
		closeEncoder = () => encoder.close();
		renderWebp = async (pdfBytes) => {
			const page = await renderLibraryThumbPage1Rgba({
				pdfBytes,
				wasmBinary,
			});
			return encoder.encode(page.rgba, page.width, page.height);
		};
	}

	try {
		await runLibraryThumbsBackfill(
			createDeps(client, log, renderWebp),
			options,
		);
	} finally {
		await closeEncoder();
		await client.auth.signOut().catch(() => {});
	}
}

main().catch((error) => {
	const message = error instanceof Error ? error.message : "Falha no backfill.";
	process.stderr.write(`${redactBackfillOutput(message)}\n`);
	process.exitCode = 1;
});
