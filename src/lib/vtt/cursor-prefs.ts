import { normalizeCursorColor } from "./cursor-color";

/**
 * Preferências locais de cursor (por navegador): a cor escolhida de cada conta
 * e se os cursores dos outros aparecem no mapa. Nada disto vai para o servidor.
 */

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const COLOR_KEY = "arkhiveon:vtt:cursor-color:v1:";
const SHOW_KEY = "arkhiveon:vtt:show-remote-cursors:v1";

function defaultStorage(): KeyValueStorage | null {
	try {
		return typeof localStorage === "undefined" ? null : localStorage;
	} catch {
		// Navegação privada ou storage bloqueado.
		return null;
	}
}

/** Cor que a pessoa escolheu antes; `null` se nunca escolheu (ou veio inválida). */
export function readChosenCursorColor(
	userId: string,
	storage: KeyValueStorage | null = defaultStorage(),
): string | null {
	try {
		return normalizeCursorColor(storage?.getItem(COLOR_KEY + userId));
	} catch {
		return null;
	}
}

export function writeChosenCursorColor(
	userId: string,
	color: string | null,
	storage: KeyValueStorage | null = defaultStorage(),
): void {
	try {
		const normalized = normalizeCursorColor(color);
		if (normalized) storage?.setItem(COLOR_KEY + userId, normalized);
		else storage?.removeItem(COLOR_KEY + userId);
	} catch {
		// Sem espaço ou bloqueado: a escolha vale só nesta sessão.
	}
}

/** Padrão: os cursores dos outros aparecem. */
export function readShowRemoteCursors(
	storage: KeyValueStorage | null = defaultStorage(),
): boolean {
	try {
		return storage?.getItem(SHOW_KEY) !== "0";
	} catch {
		return true;
	}
}

export function writeShowRemoteCursors(
	show: boolean,
	storage: KeyValueStorage | null = defaultStorage(),
): void {
	try {
		if (show) storage?.removeItem(SHOW_KEY);
		else storage?.setItem(SHOW_KEY, "0");
	} catch {
		// Vale só nesta sessão.
	}
}
