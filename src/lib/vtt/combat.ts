/**
 * Combate F1, fatia C1: lógica pura de iniciativa e turnos (sem store, sem
 * Supabase, sem UI). Plano: `out/specs/vtt-combate-f1-plano.md`.
 */

/** Uma linha da ordem de iniciativa. */
export interface Combatant {
	id: string;
	tokenId: string;
	/** null = ainda sem valor (ex.: token sem ficha esperando o mestre). */
	initiative: number | null;
	/** Destreza (valor do atributo) para o desempate; null = sem ficha. */
	dex: number | null;
	/** Ordem de adição (e de arraste): menor vem antes no empate final. */
	sortKey: number;
}

/** Estado do combate na cena: `round` null = combate não iniciado. */
export interface CombatTurn {
	round: number | null;
	turnId: string | null;
}

export const NO_COMBAT: CombatTurn = { round: null, turnId: null };

/** Limites aceitos para a iniciativa (iguais ao check previsto na migração). */
export const INITIATIVE_MIN = -50;
export const INITIATIVE_MAX = 100;

/** Dados da ficha vinculada usados pela iniciativa. */
export interface InitiativeSheet {
	/** Campo `initiative` da ficha (já inclui bônus). */
	initiative?: number | null;
	/** Valor de Destreza (ex.: 14). */
	dexterity?: number | null;
}

export type InitiativeSource =
	| { kind: "sheet"; value: number }
	| { kind: "roll"; mod: number }
	| { kind: "manual" };

const isNum = (v: unknown): v is number =>
	typeof v === "number" && Number.isFinite(v);

/** Modificador de atributo (D&D 5e): (valor − 10) / 2, para baixo. */
export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

/**
 * De onde vem a iniciativa: o campo `initiative` da ficha; sem ele, rolar
 * d20 + mod. de DES; token sem ficha (ou ficha sem nada) = valor manual.
 */
export function initiativeSource(
	sheet: InitiativeSheet | null | undefined,
): InitiativeSource {
	if (!sheet) return { kind: "manual" };
	if (isNum(sheet.initiative))
		return { kind: "sheet", value: sheet.initiative };
	if (isNum(sheet.dexterity))
		return { kind: "roll", mod: abilityModifier(sheet.dexterity) };
	return { kind: "manual" };
}

/** d20 com gerador injetável (`rng` em [0, 1)), para teste determinístico. */
export function rollD20(rng: () => number = Math.random): number {
	const r = rng();
	const safe = isNum(r) ? Math.min(Math.max(r, 0), 0.999999) : 0;
	return 1 + Math.floor(safe * 20);
}

/** Valor da iniciativa para uma fonte; manual = null (o mestre digita). */
export function resolveInitiative(
	source: InitiativeSource,
	rng: () => number = Math.random,
): number | null {
	if (source.kind === "sheet") return source.value;
	if (source.kind === "roll") return rollD20(rng) + source.mod;
	return null;
}

/**
 * "Rolar iniciativa" em lote: preenche cada combatente pela ficha do token
 * (`sheetFor` devolve null se o token não tem ficha). Os manuais ficam null;
 * a Destreza da ficha vai para o desempate. Devolve uma lista nova.
 */
export function rollAllInitiative(
	combatants: readonly Combatant[],
	sheetFor: (tokenId: string) => InitiativeSheet | null | undefined,
	rng: () => number = Math.random,
): Combatant[] {
	return combatants.map((c) => {
		const sheet = sheetFor(c.tokenId);
		const value = resolveInitiative(initiativeSource(sheet), rng);
		return {
			...c,
			initiative: value ?? c.initiative,
			dex: isNum(sheet?.dexterity) ? sheet.dexterity : c.dex,
		};
	});
}

/** Valor digitado é válido? (número inteiro ou decimal dentro dos limites). */
export function isValidInitiative(value: number): boolean {
	return isNum(value) && value >= INITIATIVE_MIN && value <= INITIATIVE_MAX;
}

/**
 * Edição inline do mestre (também depois da rolagem). `null` limpa o valor.
 * Valor inválido ou id inexistente: devolve a mesma lista (sem mudança).
 */
export function setInitiative(
	combatants: readonly Combatant[],
	id: string,
	value: number | null,
): readonly Combatant[] {
	if (value !== null && !isValidInitiative(value)) return combatants;
	const i = combatants.findIndex((c) => c.id === id);
	if (i < 0 || combatants[i].initiative === value) return combatants;
	const next = combatants.slice();
	next[i] = { ...combatants[i], initiative: value };
	return next;
}

/**
 * Ordem do combate: iniciativa decrescente (sem valor vai para o fim), empate
 * por maior Destreza (sem ficha perde), depois pela ordem de adição.
 */
export function sortCombatants(combatants: readonly Combatant[]): Combatant[] {
	const rank = (v: number | null) =>
		v === null ? Number.NEGATIVE_INFINITY : v;
	return combatants
		.slice()
		.sort(
			(a, b) =>
				rank(b.initiative) - rank(a.initiative) ||
				rank(b.dex) - rank(a.dex) ||
				a.sortKey - b.sortKey,
		);
}

/** "Iniciar combate": rodada 1, primeira linha da ordem ativa. */
export function startCombat(ordered: readonly Combatant[]): CombatTurn {
	if (ordered.length === 0) return NO_COMBAT;
	return { round: 1, turnId: ordered[0].id };
}

/**
 * Próximo turno. Depois da última linha volta à primeira e a rodada sobe.
 * Se a linha ativa sumiu da ordem, recomeça na primeira da mesma rodada.
 */
export function nextTurn(
	turn: CombatTurn,
	ordered: readonly Combatant[],
): CombatTurn {
	if (turn.round === null || ordered.length === 0) return turn;
	const i = ordered.findIndex((c) => c.id === turn.turnId);
	if (i < 0) return { round: turn.round, turnId: ordered[0].id };
	if (i === ordered.length - 1)
		return { round: turn.round + 1, turnId: ordered[0].id };
	return { round: turn.round, turnId: ordered[i + 1].id };
}

/**
 * Turno anterior. Antes da primeira linha volta à última e a rodada desce;
 * na primeira linha da rodada 1 não há para onde voltar (sem mudança).
 */
export function previousTurn(
	turn: CombatTurn,
	ordered: readonly Combatant[],
): CombatTurn {
	if (turn.round === null || ordered.length === 0) return turn;
	const i = ordered.findIndex((c) => c.id === turn.turnId);
	if (i < 0) return { round: turn.round, turnId: ordered[0].id };
	if (i > 0) return { round: turn.round, turnId: ordered[i - 1].id };
	if (turn.round <= 1) return turn;
	return { round: turn.round - 1, turnId: ordered[ordered.length - 1].id };
}

/** Visão do jogador sobre a vez atual. */
export type PlayerTurnView =
	| { kind: "none" }
	| { kind: "gm-turn"; round: number }
	| {
			kind: "turn";
			round: number;
			combatantId: string;
			tokenId: string;
			/** Posição (0-based) na lista que o jogador vê. */
			position: number;
	  };

/**
 * O que o jogador pode saber da vez atual. `visibleTokenIds` são os tokens que
 * ele vê na mesa (o servidor já esconde ocultos e a camada do mestre). Se a
 * vez é de um combatente que ele não vê (oculto, da camada do mestre ou que não
 * chegou até ele), devolve "gm-turn" sem nome, posição nem token: a UI mostra
 * "Vez do mestre" e não desenha anel.
 */
export function playerTurnView(
	turn: CombatTurn,
	ordered: readonly Combatant[],
	visibleTokenIds: ReadonlySet<string>,
): PlayerTurnView {
	if (turn.round === null) return { kind: "none" };
	const visible = visibleCombatants(ordered, visibleTokenIds);
	const position = visible.findIndex((c) => c.id === turn.turnId);
	if (position < 0) return { kind: "gm-turn", round: turn.round };
	const c = visible[position];
	return {
		kind: "turn",
		round: turn.round,
		combatantId: c.id,
		tokenId: c.tokenId,
		position,
	};
}

/** Linhas que o jogador pode ver (defesa extra além do RLS). */
export function visibleCombatants(
	ordered: readonly Combatant[],
	visibleTokenIds: ReadonlySet<string>,
): Combatant[] {
	return ordered.filter((c) => visibleTokenIds.has(c.tokenId));
}

/**
 * Token que recebe o anel da vez. Na vez de um combatente que o jogador não
 * vê, não há anel (a UI diz "Vez do mestre"). Sem combate, também não.
 */
export function turnRingTokenId(
	turn: CombatTurn,
	ordered: readonly Combatant[],
	visibleTokenIds: ReadonlySet<string>,
	isGM: boolean,
): string | null {
	if (turn.round === null) return null;
	if (!isGM) {
		const view = playerTurnView(turn, ordered, visibleTokenIds);
		return view.kind === "turn" ? view.tokenId : null;
	}
	return ordered.find((c) => c.id === turn.turnId)?.tokenId ?? null;
}
