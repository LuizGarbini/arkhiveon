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

/** Posição inicial: à direita, em cascata para não empilhar exatamente. */
export function defaultSheetRect(
	index: number,
	viewW: number,
	viewH: number,
): SheetRect {
	return clampSheetRect(
		{
			w: SHEET_DEFAULT_W,
			h: Math.min(SHEET_DEFAULT_H, viewH - SHEET_TOP - 88),
			x: viewW - SHEET_DEFAULT_W - 16 - index * CASCADE,
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
