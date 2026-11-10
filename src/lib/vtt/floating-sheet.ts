/**
 * Geometria da ficha flutuante na mesa (desktop): posição/tamanho presos à
 * viewport e lembrados por campanha + ficha (localStorage, neste navegador).
 */
export interface SheetRect {
	x: number;
	y: number;
	w: number;
	h: number;
}

export const SHEET_MIN_W = 320;
export const SHEET_MIN_H = 280;
export const SHEET_DEFAULT_W = 380;
export const SHEET_DEFAULT_H = 560;
/** Margem mínima até a borda da janela. */
export const SHEET_EDGE = 8;
/** Topo livre para o cabeçalho da mesa. */
export const SHEET_TOP = 128;
const CASCADE = 28;

export function clampSheetRect(
	r: SheetRect,
	viewW: number,
	viewH: number,
): SheetRect {
	const w = Math.min(Math.max(r.w, SHEET_MIN_W), viewW - SHEET_EDGE * 2);
	const h = Math.min(Math.max(r.h, SHEET_MIN_H), viewH - SHEET_EDGE * 2);
	return {
		w,
		h,
		x: Math.min(Math.max(r.x, SHEET_EDGE), viewW - w - SHEET_EDGE),
		y: Math.min(Math.max(r.y, SHEET_EDGE), viewH - h - SHEET_EDGE),
	};
}

/**
 * Posição inicial: à esquerda, ao lado da toolbar (a direita é do chat e da
 * Biblioteca), em cascata para não empilhar exatamente.
 */
export const SHEET_DEFAULT_X = 80;

export function defaultSheetRect(
	index: number,
	viewW: number,
	viewH: number,
): SheetRect {
	return clampSheetRect(
		{
			w: SHEET_DEFAULT_W,
			h: Math.min(SHEET_DEFAULT_H, viewH - SHEET_TOP - 88),
			x: SHEET_DEFAULT_X + index * CASCADE,
			y: SHEET_TOP + index * CASCADE,
		},
		viewW,
		viewH,
	);
}

export function moveSheetRect(
	start: SheetRect,
	dx: number,
	dy: number,
	viewW: number,
	viewH: number,
): SheetRect {
	return clampSheetRect(
		{ ...start, x: start.x + dx, y: start.y + dy },
		viewW,
		viewH,
	);
}

export function resizeSheetRect(
	start: SheetRect,
	dx: number,
	dy: number,
	viewW: number,
	viewH: number,
): SheetRect {
	const w = Math.min(
		Math.max(start.w + dx, SHEET_MIN_W),
		viewW - start.x - SHEET_EDGE,
	);
	const h = Math.min(
		Math.max(start.h + dy, SHEET_MIN_H),
		viewH - start.y - SHEET_EDGE,
	);
	return clampSheetRect({ ...start, w, h }, viewW, viewH);
}

export function sheetStorageKey(campaignId: string, sheetId: string): string {
	return `arkhiveon_vtt_sheet:${campaignId}:${sheetId}`;
}

/** Ficha minimizada: cartão com retrato, PV e rolagem rápida. */
export const SHEET_MINI_W = 336;
export const SHEET_MINI_H = 60;
/** Doca dos cartões: à direita da toolbar, empilhados de baixo para cima. */
const MINI_DOCK_X = 72;
const MINI_DOCK_GAP = 8;

export interface MiniPos {
	x: number;
	y: number;
}

/** Prende o cartão minimizado à viewport pela medida dele. */
export function clampMiniPos(
	p: MiniPos,
	viewW: number,
	viewH: number,
): MiniPos {
	return {
		x: Math.min(
			Math.max(p.x, SHEET_EDGE),
			Math.max(SHEET_EDGE, viewW - SHEET_MINI_W - SHEET_EDGE),
		),
		y: Math.min(
			Math.max(p.y, SHEET_EDGE),
			Math.max(SHEET_EDGE, viewH - SHEET_MINI_H - SHEET_EDGE),
		),
	};
}

/** Lugar do cartão na doca (canto inferior esquerdo), por ordem de abertura. */
export function dockMiniPos(
	slot: number,
	viewW: number,
	viewH: number,
): MiniPos {
	return clampMiniPos(
		{
			x: MINI_DOCK_X,
			y:
				viewH -
				SHEET_EDGE * 2 -
				SHEET_MINI_H -
				slot * (SHEET_MINI_H + MINI_DOCK_GAP),
		},
		viewW,
		viewH,
	);
}

export function moveMiniPos(
	start: MiniPos,
	dx: number,
	dy: number,
	viewW: number,
	viewH: number,
): MiniPos {
	return clampMiniPos({ x: start.x + dx, y: start.y + dy }, viewW, viewH);
}

function isPos(v: unknown): v is MiniPos {
	if (typeof v !== "object" || v === null) return false;
	const p = v as Record<string, unknown>;
	return ["x", "y"].every(
		(k) => typeof p[k] === "number" && Number.isFinite(p[k]),
	);
}

/** Posição do cartão se a ficha está minimizada; `null` = aberta. */
export function loadSheetMini(
	key: string,
	storage: Pick<Storage, "getItem"> | null = safeStorage(),
): MiniPos | null {
	try {
		const raw = storage?.getItem(`${key}:min`);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		return isPos(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function saveSheetMini(
	key: string,
	pos: MiniPos | null,
	storage: Pick<Storage, "setItem" | "removeItem"> | null = safeStorage(),
): void {
	try {
		if (pos) storage?.setItem(`${key}:min`, JSON.stringify(pos));
		else storage?.removeItem(`${key}:min`);
	} catch {
		// cota cheia / modo privado: só não lembra
	}
}

function isRect(v: unknown): v is SheetRect {
	if (typeof v !== "object" || v === null) return false;
	const r = v as Record<string, unknown>;
	return ["x", "y", "w", "h"].every(
		(k) => typeof r[k] === "number" && Number.isFinite(r[k]),
	);
}

export function loadSheetRect(
	key: string,
	storage: Pick<Storage, "getItem"> | null = safeStorage(),
): SheetRect | null {
	try {
		const raw = storage?.getItem(key);
		if (!raw) return null;
		const parsed: unknown = JSON.parse(raw);
		return isRect(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function saveSheetRect(
	key: string,
	rect: SheetRect,
	storage: Pick<Storage, "setItem"> | null = safeStorage(),
): void {
	try {
		storage?.setItem(key, JSON.stringify(rect));
	} catch {
		// cota cheia / modo privado: só não lembra
	}
}

function safeStorage(): Storage | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		return null;
	}
}
