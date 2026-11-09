import { tryParseDiceFormula } from "./dice";
import type {
	TableFeedEntry,
	TableRollDetails,
	TableRollResult,
} from "./roll-store";

export const SECRET_ROLL_TEXT = "Mestre rolou em segredo";
export const FEED_EMPTY_TEXT = "Nenhuma rolagem ou mensagem nesta cena ainda.";
export const SESSION_DIALOG_BODY =
	"O feed de rolagens e mensagens vai ficar em branco para todos na mesa. Essa ação não pode ser desfeita.";
export const SESSION_FAILED_TEXT =
	"Não foi possível iniciar a sessão. O feed não foi alterado.";
export const FEED_UNAVAILABLE_TEXT =
	"O feed chega quando a atualização do banco for aplicada";
export const CHAT_MESSAGE_MAX = 2000;

export const QUICK_DICE_FACES = [4, 6, 8, 10, 12, 20, 100] as const;

export function sessionStartedText(sessionNumber: number): string {
	return `Sessão ${sessionNumber} iniciada — o feed começa em branco`;
}

export function sessionToastText(sessionNumber: number): string {
	return `O mestre iniciou a sessão ${sessionNumber}`;
}

export function sessionDialogTitle(sessionNumber: number): string {
	return `Iniciar a sessão ${sessionNumber}?`;
}

export function sessionConfirmLabel(sessionNumber: number): string {
	return `Iniciar sessão ${sessionNumber}`;
}

/** HH:mm, relógio de 24 horas. */
export function formatFeedTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	});
}

export function canSendChat(text: string): boolean {
	const trimmed = text.trim();
	return trimmed.length >= 1 && trimmed.length <= CHAT_MESSAGE_MAX;
}

export type FeedSessionRow = { id: string; startedAt: string };

/**
 * Número da sessão que esta conta consegue justificar.
 * Quem vê o histórico (mestre) usa a ordem do servidor.
 * Quem só vê a sessão corrente acrescenta o id novo à lista que já tinha,
 * para o número não voltar a 1 depois de recarregar.
 */
export function trackSessionOrdinal(
	storedIds: readonly string[],
	visible: readonly FeedSessionRow[],
	currentId: string | null,
): { ids: string[]; number: number | null } {
	const ordered = visible
		.filter((row) => row.id)
		.slice()
		.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
	if (!currentId) return { ids: storedIds.slice(), number: null };
	if (ordered.length > 1) {
		const ids = ordered.map((row) => row.id);
		const index = ids.indexOf(currentId);
		return { ids, number: index >= 0 ? index + 1 : ids.length };
	}
	const ids = storedIds.filter((id) => typeof id === "string" && id.length > 0);
	if (!ids.includes(currentId)) ids.push(currentId);
	return { ids, number: ids.indexOf(currentId) + 1 };
}

export type FeedLineView =
	| { kind: "secret"; text: typeof SECRET_ROLL_TEXT }
	| { kind: "chat"; message: string }
	| {
			kind: "roll";
			secret: boolean;
			formula: string | null;
			total: number | null;
			rolls: number[] | null;
			modifier: number | null;
	  };

/**
 * O que a linha pode mostrar. Rolagem secreta para quem não é mestre
 * não leva fórmula, dados nem total, mesmo se o resultado estiver na memória.
 */
export function feedLineView(
	entry: Pick<TableFeedEntry, "kind" | "isSecret" | "formula" | "message">,
	result: TableRollResult | undefined,
	isGM: boolean,
): FeedLineView {
	if (entry.kind === "chat") {
		return { kind: "chat", message: entry.message ?? "" };
	}
	if (entry.isSecret && !isGM) {
		return { kind: "secret", text: SECRET_ROLL_TEXT };
	}
	const visible = Boolean(result) && (isGM || !entry.isSecret);
	return {
		kind: "roll",
		secret: entry.isSecret,
		formula: entry.isSecret
			? visible
				? (result?.details.formula ?? null)
				: null
			: entry.formula,
		total: visible ? (result?.total ?? null) : null,
		rolls: visible ? (result?.details.rolls ?? null) : null,
		modifier: visible ? (result?.details.modifier ?? null) : null,
	};
}

export interface RolledDie {
	value: number;
	faces: number;
	/** `max`: a face mais alta do dado; `min`: tirou 1. */
	tone: "max" | "min" | "plain";
}

/** Cada dado com as faces dele (1d12+2d6 → d12, d6, d6), na ordem rolada. */
export function rolledDice(
	details: Pick<TableRollDetails, "formula" | "faces" | "rolls">,
): RolledDie[] {
	const pools = tryParseDiceFormula(details.formula)?.pools ?? [];
	const faces = pools.flatMap((pool) =>
		Array.from({ length: pool.count }, () => pool.faces),
	);
	return details.rolls.map((value, index) => {
		const dieFaces = faces[index] ?? details.faces;
		const tone =
			dieFaces > 1 && value === dieFaces
				? "max"
				: value === 1
					? "min"
					: "plain";
		return { value, faces: dieFaces, tone };
	});
}

/** Crítico ou falha crítica: só numa rolagem de um único d20. */
export function rollHighlight(
	details: Pick<TableRollDetails, "formula" | "faces" | "rolls">,
): "critical" | "fumble" | null {
	const parsed = tryParseDiceFormula(details.formula);
	if (!parsed || parsed.count !== 1 || parsed.pools[0]?.faces !== 20)
		return null;
	if (details.rolls[0] === 20) return "critical";
	if (details.rolls[0] === 1) return "fumble";
	return null;
}

/** Mensagens do mesmo autor em até 5 min viram um bloco só (sem repetir nome). */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export function continuesPrevious(
	previous: Pick<TableFeedEntry, "kind" | "authorId" | "createdAt"> | undefined,
	entry: Pick<TableFeedEntry, "kind" | "authorId" | "createdAt">,
): boolean {
	if (!previous || previous.kind !== "chat" || entry.kind !== "chat")
		return false;
	if (previous.authorId !== entry.authorId) return false;
	const gap = Date.parse(entry.createdAt) - Date.parse(previous.createdAt);
	return Number.isFinite(gap) && gap >= 0 && gap <= GROUP_WINDOW_MS;
}

export type ChatCommand =
	| { kind: "chat"; text: string }
	| { kind: "roll"; formula: string }
	| { kind: "invalid-roll" };

/** `/r 2d6+3` (ou `/roll`) rola pela caixa de mensagem, como no Roll20. */
export function parseChatCommand(text: string): ChatCommand {
	const match = /^\/r(?:oll)?(?:\s+(.*))?$/i.exec(text.trim());
	if (!match) return { kind: "chat", text };
	const parsed = tryParseDiceFormula(match[1] ?? "");
	return parsed
		? { kind: "roll", formula: parsed.formula }
		: { kind: "invalid-roll" };
}
