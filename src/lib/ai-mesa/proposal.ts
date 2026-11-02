import { parseCharacterPatch } from "../../../supabase/functions/_shared/ia-mesa-character";
import type {
	IaMesaHistoryItem,
	IaMesaNpcProposal,
	IaMesaProposal,
} from "../../../supabase/functions/_shared/ia-mesa-guard";
import { sanitizeSheetBatchProposal } from "../../../supabase/functions/_shared/ia-mesa-sheet-batch";
import type { Npc } from "../store/types";

export type {
	IaMesaCharacterPatchProposal,
	IaMesaHistoryItem,
	IaMesaNpcProposal,
	IaMesaProposal,
} from "../../../supabase/functions/_shared/ia-mesa-guard";
export {
	IA_MESA_INPUT_MAX_CHARS,
	IA_MESA_REFUSAL,
	isBlockedRequest,
	parseToolCall,
} from "../../../supabase/functions/_shared/ia-mesa-guard";

/**
 * Ciclo da proposta (modelo-a-limpo):
 * pending → confirmed → applied → (undone)
 * pending|confirmed → ignored
 * Aplicar só existe depois de Confirmar. Nada é salvo antes disso.
 */
export type ProposalStatus =
	| "pending"
	| "confirmed"
	| "applying"
	| "applied"
	| "ignored"
	| "undone";

export type ProposalAction = "confirm" | "apply" | "ignore" | "undo";

export function nextProposalStatus(
	status: ProposalStatus,
	action: ProposalAction,
): ProposalStatus | null {
	switch (action) {
		case "confirm":
			return status === "pending" ? "confirmed" : null;
		case "apply":
			return status === "confirmed" ? "applied" : null;
		case "ignore":
			return status === "pending" || status === "confirmed" ? "ignored" : null;
		case "undo":
			return status === "applied" ? "undone" : null;
	}
}

export function canApply(status: ProposalStatus): boolean {
	return status === "confirmed";
}

/** O que o Aplicar grava: um NPC restrito à campanha atual (Diário › NPCs). */
export function proposalToNpcInput(
	proposal: IaMesaNpcProposal,
	campaignId: string,
): Partial<Omit<Npc, "id" | "createdAt">> {
	return {
		kind: "npc",
		name: proposal.name,
		role: proposal.role,
		race: proposal.race,
		location: proposal.location,
		description: proposal.description,
		stats: proposal.stats,
		publicationScope: "restricted",
		campaignIds: [campaignId],
		visibility: "public",
	};
}

export interface ProposalLine {
	title: string;
	meta: string;
	preview: string;
}

export function describeProposal(proposal: IaMesaNpcProposal): ProposalLine[] {
	const statsLines = proposal.stats
		? proposal.stats.split("\n").filter((l) => l.trim()).length
		: 0;
	return [
		{
			title: proposal.role
				? `${proposal.name} — ${proposal.role}`
				: proposal.name,
			meta: "Diário › NPCs · nova página",
			preview: proposal.description,
		},
		{
			title: proposal.name,
			meta: statsLines
				? `Ficha de NPC · ${statsLines} ${statsLines === 1 ? "linha" : "linhas"}`
				: "Ficha de NPC · sem ficha",
			preview: proposal.stats,
		},
	];
}

export type IaMesaErrorCode =
	| "unavailable"
	| "invalid_key"
	| "rate_limited"
	| "daily_limit"
	| "forbidden"
	| "not_allowed"
	| "unauthorized"
	| "bad_request"
	| "input_too_large"
	| "offline"
	| "not_deployed"
	| "model_error";

const SAO_PAULO = "America/Sao_Paulo";

/** Aviso do limite. Dia e hora saem de `resets_at`, no fuso America/Sao_Paulo. */
export function formatDailyLimitNotice(resetsAtIso: string): string {
	const date = new Date(resetsAtIso);
	if (Number.isNaN(date.getTime())) return "Limite diário da mesa atingido.";
	const day = new Intl.DateTimeFormat("pt-BR", {
		timeZone: SAO_PAULO,
		weekday: "long",
		day: "numeric",
		month: "long",
	}).format(date);
	const time = new Intl.DateTimeFormat("pt-BR", {
		timeZone: SAO_PAULO,
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
	return `Limite diário da mesa atingido. Volta ${day} às ${time}.`;
}

export function errorMessage(code: IaMesaErrorCode | string): string {
	switch (code) {
		case "unavailable":
			return "O assistente não está disponível nesta mesa agora. Nada foi enviado.";
		case "invalid_key":
			return "A chave da IA configurada no servidor foi recusada. Peça para o administrador revisar.";
		case "rate_limited":
			return "Muitos pedidos seguidos. Espere alguns segundos e tente de novo.";
		case "daily_limit":
			return "Limite diário da mesa atingido.";
		case "forbidden":
			return "Só o mestre (ou editor) desta campanha pode usar o assistente.";
		case "not_allowed":
			return "O assistente ainda não está liberado nesta campanha.";
		case "unauthorized":
			return "Sua sessão expirou. Entre de novo para usar o assistente.";
		case "bad_request":
			return "Não entendi o pedido. Escreva uma mensagem e tente de novo.";
		case "input_too_large":
			return "Esse texto passa de 20.000 caracteres. Encurte e tente de novo. Nada foi enviado.";
		case "not_deployed":
			return "O assistente ainda não foi publicado no servidor desta mesa. Nada foi enviado.";
		case "offline":
			return "Sem conexão com o servidor. O assistente precisa do Supabase configurado.";
		default:
			return "O assistente não respondeu agora. Tente de novo em instantes.";
	}
}

export type IaMesaResult =
	| { ok: true; reply: string; proposal: IaMesaProposal | null }
	| { ok: false; code: IaMesaErrorCode; resetsAt?: string };

/** Traduz o status HTTP da Edge Function. Não repete corpo, header nem chave. */
export function classifyHttpFailure(
	status: number | undefined,
	body: unknown,
): IaMesaResult {
	const record =
		body && typeof body === "object" ? (body as Record<string, unknown>) : null;
	const code = typeof record?.code === "string" ? record.code : undefined;
	const resetsAt =
		typeof record?.resets_at === "string" ? record.resets_at : undefined;
	if (status === 401 || code === "unauthorized") {
		return { ok: false, code: "unauthorized" };
	}
	if (status === 403) {
		return {
			ok: false,
			code: code === "not_allowed" ? "not_allowed" : "forbidden",
		};
	}
	if (status === 429 || code === "daily_limit") {
		return resetsAt
			? { ok: false, code: "daily_limit", resetsAt }
			: { ok: false, code: "daily_limit" };
	}
	if (status === 503 || code === "unavailable") {
		return { ok: false, code: "unavailable" };
	}
	if (status === 404) return { ok: false, code: "not_deployed" };
	if (status === 413 || code === "input_too_large") {
		return { ok: false, code: "input_too_large" };
	}
	if (status === 400) return { ok: false, code: "bad_request" };
	return { ok: false, code: "model_error" };
}

/** Normaliza a resposta da Edge Function (nunca confia no formato). */
export function normalizeResponse(data: unknown): IaMesaResult {
	if (!data || typeof data !== "object")
		return { ok: false, code: "model_error" };
	const raw = data as Record<string, unknown>;
	if (raw.ok !== true) {
		const code = typeof raw.code === "string" ? raw.code : "model_error";
		const resetsAt =
			typeof raw.resets_at === "string" ? raw.resets_at : undefined;
		return resetsAt
			? { ok: false, code: code as IaMesaErrorCode, resetsAt }
			: { ok: false, code: code as IaMesaErrorCode };
	}
	const reply = typeof raw.reply === "string" ? raw.reply : "";
	const p = raw.proposal as Record<string, unknown> | null | undefined;
	if (p && typeof p === "object" && p.kind === "sheet_batch") {
		return { ok: true, reply, proposal: sanitizeSheetBatchProposal(p) };
	}
	if (p && typeof p === "object" && p.kind === "character_patch") {
		// Re-saneia no cliente: nunca confia no formato vindo da rede.
		return { ok: true, reply, proposal: parseCharacterPatch(p) };
	}
	const proposal =
		p && typeof p === "object" && p.kind === "npc" && typeof p.name === "string"
			? ({
					kind: "npc",
					name: String(p.name),
					role: String(p.role ?? ""),
					race: String(p.race ?? ""),
					location: String(p.location ?? ""),
					description: String(p.description ?? ""),
					stats: String(p.stats ?? ""),
				} satisfies IaMesaProposal)
			: null;
	return { ok: true, reply, proposal };
}

export function toHistory(
	messages: { role: "user" | "assistant"; text: string }[],
): IaMesaHistoryItem[] {
	return messages.slice(-8).map((m) => ({ role: m.role, text: m.text }));
}
