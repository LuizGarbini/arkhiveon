/**
 * Tipos de ping (puro, sem React). Além do ping comum, a mesa tem pings com
 * significado (perigo, a caminho, ajuda), o destaque de um personagem (setas em
 * volta dele) e o ping do mestre que leva a câmera de todos até o ponto.
 */

export type PingKind =
	| "attention"
	| "danger"
	| "going"
	| "help"
	| "highlight"
	| "focus";

export interface PingKindInfo {
	id: PingKind;
	label: string;
	hint: string;
	/** Só o mestre e o co-mestre usam. */
	gmOnly: boolean;
	/** Quanto tempo o ping fica na tela. */
	ttlMs: number;
}

export const DEFAULT_PING_KIND: PingKind = "attention";

/** Na ordem da roda, a partir do topo, no sentido horário. */
export const PING_KINDS: readonly PingKindInfo[] = [
	{
		id: "attention",
		label: "Atenção",
		hint: "Marca um ponto no mapa",
		gmOnly: false,
		ttlMs: 3000,
	},
	{
		id: "danger",
		label: "Perigo",
		hint: "Cuidado com este lugar",
		gmOnly: false,
		ttlMs: 3500,
	},
	{
		id: "going",
		label: "A caminho",
		hint: "Estou indo para lá",
		gmOnly: false,
		ttlMs: 3500,
	},
	{
		id: "help",
		label: "Ajuda",
		hint: "Preciso de ajuda aqui",
		gmOnly: false,
		ttlMs: 3500,
	},
	{
		id: "highlight",
		label: "Destacar",
		hint: "Põe setas em volta de um personagem (aponte para ele ou selecione-o)",
		gmOnly: false,
		ttlMs: 4500,
	},
	{
		id: "focus",
		label: "Todos aqui",
		hint: "Leva a câmera de todos até este ponto",
		gmOnly: true,
		ttlMs: 4000,
	},
];

const BY_ID = new Map(PING_KINDS.map((kind) => [kind.id, kind]));

export function isPingKind(value: unknown): value is PingKind {
	return typeof value === "string" && BY_ID.has(value as PingKind);
}

/** O que veio no evento (ou do banco) → um tipo válido; o resto é ping comum. */
export function normalizePingKind(value: unknown): PingKind {
	return isPingKind(value) ? value : DEFAULT_PING_KIND;
}

/** Os tipos que a pessoa pode escolher: o jogador não vê os do mestre. */
export function pingKindsFor(canManage: boolean): PingKindInfo[] {
	return PING_KINDS.filter((kind) => canManage || !kind.gmOnly);
}

export function pingKindInfo(kind: PingKind): PingKindInfo {
	return BY_ID.get(kind) as PingKindInfo;
}

/** Quanto o ping dura; sem tipo (ping antigo), o tempo do ping comum. */
export function pingTtl(kind?: PingKind | null): number {
	return (BY_ID.get(kind ?? DEFAULT_PING_KIND) ?? BY_ID.get(DEFAULT_PING_KIND))
		?.ttlMs as number;
}

/**
 * Tipo que a pessoa pode de fato mandar: o do mestre vira ping comum para quem
 * não é mestre (a interface já esconde, isto é a trava por baixo).
 */
export function allowedPingKind(kind: PingKind, canManage: boolean): PingKind {
	return pingKindInfo(kind).gmOnly && !canManage ? DEFAULT_PING_KIND : kind;
}
