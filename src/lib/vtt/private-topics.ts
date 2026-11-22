/**
 * Tópicos privados da sala do VTT (0066) e quem mandou cada mensagem.
 *
 * Os nomes seguem as policies de `realtime.messages` da 0066 (uuids em
 * minúsculas):
 *   vtt:C:S:u:U    canal do usuário U; só U escreve (auth.uid()).
 *   vtt:C:S:gm     mestre -> todos; só owner/editor escrevem.
 *   vtt:C:S:gmonly só owner/editor leem e escrevem.
 *
 * Regra do plano (3.2): o remetente é o U do tópico em que a mensagem chegou.
 * O `userId` do payload nunca decide; se divergir do tópico, a mensagem é
 * descartada. `fog_update` e `explored_reset` só valem no tópico `gm`.
 *
 * Módulo puro. O transporte em `room-channel.ts` usa estes tópicos.
 */

// As policies da 0066 exigem UUID. O parse do cliente aceita qualquer
// segmento sem ':', para o teste e para não descartar um id válido à toa.
const SEG = "([^:]+)";
const TOPIC_RE = new RegExp(`^vtt:${SEG}:${SEG}:(gm|gmonly|u:(${SEG}))$`);

export type VttTopic =
	| { kind: "user"; campaignId: string; sceneId: string; userId: string }
	| { kind: "gm"; campaignId: string; sceneId: string }
	| { kind: "gmonly"; campaignId: string; sceneId: string };

const lower = (id: string) => id.toLowerCase();

export function vttUserTopic(
	campaignId: string,
	sceneId: string,
	userId: string,
): string {
	return `vtt:${lower(campaignId)}:${lower(sceneId)}:u:${lower(userId)}`;
}

export function vttGmTopic(campaignId: string, sceneId: string): string {
	return `vtt:${lower(campaignId)}:${lower(sceneId)}:gm`;
}

export function vttGmOnlyTopic(campaignId: string, sceneId: string): string {
	return `vtt:${lower(campaignId)}:${lower(sceneId)}:gmonly`;
}

/** Config de todo canal privado da sala: privado e sem eco. */
export function privateChannelOptions(presenceKey?: string) {
	return {
		config: {
			private: true,
			broadcast: { self: false },
			...(presenceKey ? { presence: { key: presenceKey } } : {}),
		},
	};
}

/** Lê o tópico; aceita o prefixo `realtime:` que o supabase-js põe. Malformado = null. */
export function parseVttTopic(topic: string): VttTopic | null {
	const raw = topic.startsWith("realtime:")
		? topic.slice("realtime:".length)
		: topic;
	const match = TOPIC_RE.exec(raw);
	if (!match) return null;
	const [, campaignId, sceneId, tail, userId] = match;
	if (tail === "gm") return { kind: "gm", campaignId, sceneId };
	if (tail === "gmonly") return { kind: "gmonly", campaignId, sceneId };
	return { kind: "user", campaignId, sceneId, userId };
}

/** Eventos que só o canal do mestre (`gm`) pode trazer. */
export const GM_TOPIC_ONLY_EVENTS = new Set(["fog_update", "explored_reset"]);

export type InboundDecision =
	| { accept: true; senderUserId: string | null; topic: VttTopic }
	| {
			accept: false;
			reason:
				| "topic_malformed"
				| "other_room"
				| "sender_mismatch"
				| "gm_topic_only";
	  };

/**
 * Decide se uma mensagem recebida vale e de quem ela é.
 * - Tópico malformado ou de outra campanha/cena: descarta.
 * - Em `u:U`: o remetente é U; `payload.userId` diferente de U descarta.
 * - `fog_update` e `explored_reset` só no `gm`.
 * - Em `gm`/`gmonly` o remetente é o do payload, mas o papel continua vindo
 *   dos memberships do receptor (só owner/editor conseguem escrever lá).
 */
export function admitInbound(input: {
	topic: string;
	event: string;
	payloadUserId?: unknown;
	campaignId: string;
	sceneId: string;
}): InboundDecision {
	const topic = parseVttTopic(input.topic);
	if (!topic) return { accept: false, reason: "topic_malformed" };
	if (
		topic.campaignId !== lower(input.campaignId) ||
		topic.sceneId !== lower(input.sceneId)
	) {
		return { accept: false, reason: "other_room" };
	}
	if (GM_TOPIC_ONLY_EVENTS.has(input.event) && topic.kind !== "gm") {
		return { accept: false, reason: "gm_topic_only" };
	}
	const claimed =
		typeof input.payloadUserId === "string" ? lower(input.payloadUserId) : null;
	if (topic.kind === "user") {
		if (claimed !== null && claimed !== topic.userId) {
			return { accept: false, reason: "sender_mismatch" };
		}
		return { accept: true, senderUserId: topic.userId, topic };
	}
	return { accept: true, senderUserId: claimed, topic };
}

/**
 * Tópicos que a aba assina numa cena: o próprio, um por membro com acesso
 * (só ouvir), o `gm` e, para owner/editor, o `gmonly`.
 */
export function roomTopicsFor(input: {
	campaignId: string;
	sceneId: string;
	selfUserId: string;
	memberUserIds: readonly string[];
	isGmOrCoGm: boolean;
}): { own: string; others: string[]; gm: string; gmonly: string | null } {
	const self = lower(input.selfUserId);
	const others = [...new Set(input.memberUserIds.map(lower))]
		.filter((id) => id !== self)
		.sort()
		.map((id) => vttUserTopic(input.campaignId, input.sceneId, id));
	return {
		own: vttUserTopic(input.campaignId, input.sceneId, self),
		others,
		gm: vttGmTopic(input.campaignId, input.sceneId),
		gmonly: input.isGmOrCoGm
			? vttGmOnlyTopic(input.campaignId, input.sceneId)
			: null,
	};
}
