import { normalizeCursorColor, pickCursorColor } from "./cursor-color";
import type { VTTPresenceUser, VTTRemoteCursor } from "./types";

/**
 * Leitura do que chega da rede (presença e cursor). O payload nunca é
 * confiável: cor só no formato seguro, nome curto e sem caracteres de controle,
 * coordenadas finitas. Cor ausente ou inválida cai numa cor própria da pessoa
 * (pelo id), e não numa cor fixa igual para todos.
 */

const MAX_NAME = 40;
/** Coordenada além disto não é de mapa nenhum: descarta. */
const MAX_COORD = 1e7;

export function cleanName(value: unknown, fallback: string): string {
	if (typeof value !== "string") return fallback;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: tira caracteres de controle do nome
	const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
	return text ? text.slice(0, MAX_NAME) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Presença do canal (`presenceState()`): uma entrada por pessoa. */
export function readPresenceUsers(
	state: Record<string, unknown[]>,
	now: number = Date.now(),
): VTTPresenceUser[] {
	const users: VTTPresenceUser[] = [];
	for (const [key, presences] of Object.entries(state)) {
		// Re-anunciar a presença (trocar de cor) pode deixar a entrada velha ao
		// lado da nova até o servidor tirá-la: vale a última.
		const latest = presences?.at(-1);
		if (!isRecord(latest)) continue;
		const userId =
			typeof latest.userId === "string" && latest.userId ? latest.userId : key;
		users.push({
			userId,
			userName: cleanName(latest.userName, "Aventureiro"),
			avatarUrl:
				typeof latest.avatarUrl === "string" && latest.avatarUrl
					? latest.avatarUrl
					: null,
			color: normalizeCursorColor(latest.color) ?? pickCursorColor(userId),
			colorChosen: latest.colorChosen === true,
			isGM: !!latest.isGM,
			isCoGM: !!latest.isCoGM,
			onlineAt:
				typeof latest.onlineAt === "number" && Number.isFinite(latest.onlineAt)
					? latest.onlineAt
					: now,
		});
	}
	return users;
}

/**
 * Payload do `cursor_move` → cursor remoto, ou `null` se vier fora do formato.
 * A cor que a pessoa anunciou na presença vale mais que a do payload (que
 * fica velha até o próximo movimento ao trocar de cor).
 */
export function readRemoteCursor(
	payload: unknown,
	presence: readonly Pick<VTTPresenceUser, "userId" | "color" | "userName">[],
	now: number = Date.now(),
): VTTRemoteCursor | null {
	if (!isRecord(payload)) return null;
	const { userId, x, y } = payload;
	if (typeof userId !== "string" || !userId) return null;
	if (typeof x !== "number" || typeof y !== "number") return null;
	if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
	if (Math.abs(x) > MAX_COORD || Math.abs(y) > MAX_COORD) return null;
	const online = presence.find((user) => user.userId === userId);
	return {
		userId,
		userName: cleanName(payload.userName, online?.userName ?? "Jogador"),
		color:
			normalizeCursorColor(online?.color) ??
			normalizeCursorColor(payload.color) ??
			pickCursorColor(userId),
		x,
		y,
		timestamp: now,
	};
}
