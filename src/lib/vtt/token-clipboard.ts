import { findFreeCell, type Point, ZERO_ORIGIN } from "./grid-math";
import { isEditableElement, isVttShortcutBlocked } from "./shortcut-guard";
import { stepDelta } from "./token-step";
import type { VTTAura, VTTGridType, VTTLayer, VTTToken } from "./types";

/**
 * Cópia interna de tokens (Ctrl/Cmd+C). Não usa a área de transferência do
 * sistema: o snapshot fica na store e o Ctrl+V cola na cena ativa.
 */

export interface CopiedToken {
	/** Nome sem o sufixo " 2", " 3"… A colagem é que escolhe o próximo número. */
	nameBase: string;
	avatarUrl: string | null;
	sizeCells: number;
	rotation: number;
	layer: VTTLayer;
	isHidden: boolean;
	elevation: number;
	visionRange: number;
	auras: VTTAura[];
	characterId: string | null;
	npcId: string | null;
	controlledBy: string[];
	conditions: string[];
	hpCurrent: number | null;
	hpMax: number | null;
	tempHp: number | null;
	x: number;
	y: number;
}

/** O que vai para o insert. A trava nasce sempre solta. */
export interface PastedToken {
	name: string;
	avatarUrl: string | null;
	sizeCells: number;
	rotation: number;
	layer: VTTLayer;
	isHidden: boolean;
	isLocked: false;
	elevation: number;
	visionRange: number;
	auras: VTTAura[];
	characterId: string | null;
	npcId: string | null;
	controlledBy: string[];
	conditions: string[];
	hpCurrent: number | null;
	hpMax: number | null;
	tempHp: number | null;
	x: number;
	y: number;
}

export interface PasteGrid {
	gridType: VTTGridType;
	gridSize: number;
	origin?: Point;
	bounds: { width: number; height: number };
}

export interface TokenClipboardContext {
	canManage: boolean;
	selectedCount: number;
	clipboardCount: number;
}

export type TokenClipboardAction = "copy" | "paste" | "ignore";

/** "Goblin 2" volta a ser "Goblin". Um nome sem número fica igual. */
export function tokenNameBase(name: string): string {
	const trimmed = name.trim();
	const match = /^(.*) (\d+)$/.exec(trimmed);
	if (!match) return trimmed;
	const n = Number(match[2]);
	if (!Number.isInteger(n) || n < 2) return trimmed;
	return match[1];
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Menor inteiro ≥ 2 que ainda não existe como `${base} N` na lista. */
export function nextCopyName(base: string, names: readonly string[]): string {
	const used = new Set<number>();
	const pattern = new RegExp(`^${escapeRegExp(base)} (\\d+)$`);
	for (const name of names) {
		const match = pattern.exec(name);
		if (!match) continue;
		const n = Number(match[1]);
		if (Number.isInteger(n)) used.add(n);
	}
	let n = 2;
	while (used.has(n)) n += 1;
	return `${base} ${n}`;
}

function copiedHp(
	token: VTTToken,
	sheetOwnsHp: (characterId: string) => boolean,
): { hpCurrent: number | null; hpMax: number | null; tempHp: number | null } {
	const owns =
		typeof token.characterId === "string" &&
		token.characterId.length > 0 &&
		sheetOwnsHp(token.characterId);
	if (owns) return { hpCurrent: null, hpMax: null, tempHp: null };
	return {
		hpCurrent: typeof token.hpCurrent === "number" ? token.hpCurrent : null,
		hpMax: typeof token.hpMax === "number" ? token.hpMax : null,
		tempHp: typeof token.tempHp === "number" ? token.tempHp : null,
	};
}

/**
 * Snapshot dos selecionados, na ordem da seleção. Ficha que é dona do PV
 * sai com hp nulo (o insert grava como o roster). Avulso e NPC levam o PV.
 * A trava não entra.
 */
export function buildTokenClipboard(
	selectedIds: readonly string[],
	tokens: readonly VTTToken[],
	sheetOwnsHp: (characterId: string) => boolean,
): CopiedToken[] {
	const byId = new Map(tokens.map((token) => [token.id, token]));
	const out: CopiedToken[] = [];
	const seen = new Set<string>();
	for (const id of selectedIds) {
		if (seen.has(id)) continue;
		seen.add(id);
		const token = byId.get(id);
		if (!token) continue;
		const hp = copiedHp(token, sheetOwnsHp);
		out.push({
			nameBase: tokenNameBase(token.name),
			avatarUrl: token.avatarUrl ?? null,
			sizeCells: token.sizeCells,
			rotation: token.rotation,
			layer: token.layer,
			isHidden: token.isHidden,
			elevation: token.elevation,
			visionRange: token.visionRange,
			auras: token.auras.map((aura) => ({ ...aura })),
			characterId: token.characterId ?? null,
			npcId: token.npcId ?? null,
			controlledBy: [...token.controlledBy],
			conditions: [...token.conditions],
			hpCurrent: hp.hpCurrent,
			hpMax: hp.hpMax,
			tempHp: hp.tempHp,
			x: token.x,
			y: token.y,
		});
	}
	return out;
}

/** Uma casa para a direita e outra para baixo, o mesmo passo das setas. */
export function pasteCellDelta(
	lead: Pick<CopiedToken, "x" | "y" | "sizeCells">,
	grid: PasteGrid,
): Point {
	const stepGrid = {
		gridType: grid.gridType,
		gridSize: grid.gridSize,
		origin: grid.origin ?? ZERO_ORIGIN,
	};
	const right = stepDelta(
		{ x: lead.x, y: lead.y },
		"right",
		stepGrid,
		lead.sizeCells,
	);
	const down = stepDelta(
		{ x: lead.x + right.x, y: lead.y + right.y },
		"down",
		stepGrid,
		lead.sizeCells,
	);
	return { x: right.x + down.x, y: right.y + down.y };
}

export interface PastePlan {
	spawns: PastedToken[];
	/** Âncoras da formação (a casa pretendida), para a próxima colagem andar mais uma. */
	nextClipboard: CopiedToken[];
}

/**
 * Cola o snapshot uma casa à direita e abaixo, preservando a formação.
 * Casa ocupada cai em `findFreeCell`. A âncora da próxima colagem é a casa
 * pretendida, não o desvio, para o grupo continuar alinhado.
 */
export function planTokenPaste(
	clipboard: readonly CopiedToken[],
	sceneTokens: readonly Pick<VTTToken, "name" | "x" | "y" | "sizeCells">[],
	grid: PasteGrid,
): PastePlan {
	if (clipboard.length === 0) return { spawns: [], nextClipboard: [] };
	const delta = pasteCellDelta(clipboard[0], grid);
	const names = sceneTokens.map((token) => token.name);
	const occupied = sceneTokens.map((token) => ({
		x: token.x,
		y: token.y,
		sizeCells: token.sizeCells,
	}));
	const origin = grid.origin ?? ZERO_ORIGIN;
	const spawns: PastedToken[] = [];
	const nextClipboard: CopiedToken[] = [];
	for (const token of clipboard) {
		const desired = { x: token.x + delta.x, y: token.y + delta.y };
		const free = findFreeCell(desired, occupied, {
			gridType: grid.gridType,
			gridSize: grid.gridSize,
			sizeCells: token.sizeCells,
			bounds: grid.bounds,
			origin,
		});
		const name = nextCopyName(token.nameBase, names);
		names.push(name);
		occupied.push({ x: free.x, y: free.y, sizeCells: token.sizeCells });
		spawns.push({
			name,
			avatarUrl: token.avatarUrl,
			sizeCells: token.sizeCells,
			rotation: token.rotation,
			layer: token.layer,
			isHidden: token.isHidden,
			isLocked: false,
			elevation: token.elevation,
			visionRange: token.visionRange,
			auras: token.auras.map((aura) => ({ ...aura })),
			characterId: token.characterId,
			npcId: token.npcId,
			controlledBy: [...token.controlledBy],
			conditions: [...token.conditions],
			hpCurrent: token.hpCurrent,
			hpMax: token.hpMax,
			tempHp: token.tempHp,
			x: free.x,
			y: free.y,
		});
		nextClipboard.push({ ...token, x: desired.x, y: desired.y });
	}
	return { spawns, nextClipboard };
}

function commandKey(event: KeyboardEvent): boolean {
	return (event.ctrlKey || event.metaKey) && !event.altKey && !event.repeat;
}

function isLetter(event: KeyboardEvent, letter: "c" | "v"): boolean {
	return (
		event.key.toLowerCase() === letter ||
		event.code === `Key${letter.toUpperCase()}`
	);
}

function focusIsTyping(event: KeyboardEvent): boolean {
	const target = event.target instanceof Element ? event.target : null;
	const active =
		typeof document === "undefined"
			? null
			: document.activeElement instanceof Element
				? document.activeElement
				: null;
	return isEditableElement(target) || isEditableElement(active);
}

/** Há um trecho de texto marcado na página (a cópia do sistema fica com ele). */
function pageTextIsSelected(): boolean {
	if (typeof window === "undefined") return false;
	return window.getSelection()?.isCollapsed === false;
}

/**
 * Decide o atalho sem impedir o padrão. Quem chama só dá `preventDefault`
 * quando o resultado não é `"ignore"`.
 */
export function tokenClipboardAction(
	event: KeyboardEvent,
	ctx: TokenClipboardContext,
): TokenClipboardAction {
	if (!commandKey(event) || !ctx.canManage) return "ignore";
	if (focusIsTyping(event) || isVttShortcutBlocked(event)) return "ignore";
	if (isLetter(event, "c")) {
		if (ctx.selectedCount < 1 || pageTextIsSelected()) return "ignore";
		return "copy";
	}
	if (isLetter(event, "v")) {
		if (ctx.clipboardCount < 1) return "ignore";
		return "paste";
	}
	return "ignore";
}
