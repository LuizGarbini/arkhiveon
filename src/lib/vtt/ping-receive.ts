import { worldPointOnScreen } from "./camera-pull";
import { DEFAULT_PING_KIND, pingKindInfo } from "./ping-kinds";
import { incomingPing, type PingInput } from "./ping-queue";
import {
	resolveSenderTemplateRole,
	type TemplateSenderSource,
} from "./template-permissions";

/**
 * O que fazer com um ping que chegou pelo broadcast (puro).
 *
 * "Todos aqui" leva a câmera sempre, se quem mandou é mestre ou co-mestre.
 * "Atenção" do mestre ou do co-mestre leva só quando o ponto está fora da
 * tela de quem recebe. Os outros tipos, e qualquer ping de jogador, não movem
 * a câmera. O papel que vem escrito no evento nunca é lido. O remetente é o
 * usuário do tópico (`u:<id>`); o papel sai só das memberships e do dono
 * da campanha. A presença (`isGM`/`isCoGM`) é ignorada. Sem membership,
 * quem mandou é tratado como jogador. Um jogador que mande "Todos aqui"
 * à força vira ping comum.
 *
 * O relógio de quem mandou não vale aqui: o ping chega com a hora da chegada
 * (`receivedAt`). Com a hora de outro computador, um relógio alguns segundos à
 * frente dava o ping como expirado e ele sumia sem aparecer (nem a câmera ia).
 */
export interface PingReceiverView {
	viewport: { x: number; y: number; scale: number };
	/** Tamanho visível do canvas, em px CSS. */
	screen: { width: number; height: number };
	/** Quem está nesta tela. O ping da própria pessoa não move a câmera dela. */
	selfUserId?: string | null;
}

export interface AcceptedPing {
	ping: PingInput;
	/** Ponto para onde levar a câmera, ou null. */
	pullTo: { x: number; y: number } | null;
}

function senderCanSteer(userId: string, source: TemplateSenderSource): boolean {
	const role = resolveSenderTemplateRole(userId, source);
	return role.isGM || role.isCoGM;
}

/** Sem medida do canvas, não puxa: não dá para saber se o ponto está fora. */
function attentionIsOffScreen(
	world: { x: number; y: number },
	view: PingReceiverView,
): boolean {
	const { screen, viewport } = view;
	if (!(screen.width > 0) || !(screen.height > 0) || !(viewport.scale > 0)) {
		return false;
	}
	return !worldPointOnScreen(world, viewport, screen);
}

export function acceptIncomingPing(
	payload: Parameters<typeof incomingPing>[0],
	source: TemplateSenderSource,
	view?: PingReceiverView | null,
	receivedAt: number = Date.now(),
): AcceptedPing | null {
	const parsed = incomingPing(payload);
	if (!parsed) return null;
	const incoming: PingInput = { ...parsed, timestamp: receivedAt };
	const kind = incoming.kind ?? DEFAULT_PING_KIND;
	const gmOnly = pingKindInfo(kind).gmOnly;
	// Perigo, a caminho, ajuda e destacar nunca levam a câmera, nem do mestre.
	if (kind !== "attention" && !gmOnly) {
		return { ping: incoming, pullTo: null };
	}

	const steer = senderCanSteer(incoming.userId, source);
	if (gmOnly && !steer) {
		return { ping: { ...incoming, kind: DEFAULT_PING_KIND }, pullTo: null };
	}

	const self =
		typeof view?.selfUserId === "string" &&
		view.selfUserId.length > 0 &&
		incoming.userId === view.selfUserId;
	if (self || !steer) {
		return { ping: incoming, pullTo: null };
	}

	if (gmOnly) {
		return { ping: incoming, pullTo: { x: incoming.x, y: incoming.y } };
	}

	if (kind === "attention" && view && attentionIsOffScreen(incoming, view)) {
		return { ping: incoming, pullTo: { x: incoming.x, y: incoming.y } };
	}

	return { ping: incoming, pullTo: null };
}
