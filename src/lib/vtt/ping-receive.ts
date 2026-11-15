import { DEFAULT_PING_KIND, pingKindInfo } from "./ping-kinds";
import { incomingPing, type PingInput } from "./ping-queue";
import {
	resolveSenderTemplateRole,
	type TemplateSenderSource,
} from "./template-permissions";

/**
 * O que fazer com um ping que chegou pelo broadcast (puro). O ping que leva a
 * câmera de todos ("Todos aqui") só vale se quem mandou é o mestre ou o co-mestre,
 * conferido no lado de quem recebe (o papel que vem no evento nunca é lido):
 * o dono da campanha vence; sem membership, a presença já sincronizada; sem nada
 * disso, é jogador. Um jogador que mande esse tipo à força vira ping comum, sem
 * mexer na câmera de ninguém.
 */
export interface AcceptedPing {
	ping: PingInput;
	/** Ponto para onde levar a câmera, ou null (só o ping do mestre leva). */
	pullTo: { x: number; y: number } | null;
}

export function acceptIncomingPing(
	payload: Parameters<typeof incomingPing>[0],
	source: TemplateSenderSource,
): AcceptedPing | null {
	const incoming = incomingPing(payload);
	if (!incoming) return null;
	const kind = incoming.kind ?? DEFAULT_PING_KIND;
	if (!pingKindInfo(kind).gmOnly) return { ping: incoming, pullTo: null };

	const role = resolveSenderTemplateRole(incoming.userId, source);
	if (role.isGM || role.isCoGM) {
		return { ping: incoming, pullTo: { x: incoming.x, y: incoming.y } };
	}
	return { ping: { ...incoming, kind: DEFAULT_PING_KIND }, pullTo: null };
}
