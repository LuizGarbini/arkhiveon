const EDITABLE =
	'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]';
const DIALOG = '[role="dialog"], [role="alertdialog"], dialog';

function asElement(node: EventTarget | null): Element | null {
	return node instanceof Element ? node : null;
}

/** O elemento está num campo de texto/seleção (ou é editável). */
export function isEditableElement(el: Element | null): boolean {
	if (!el) return false;
	if (el instanceof HTMLElement && el.isContentEditable) return true;
	return el.closest(EDITABLE) !== null;
}

/** O elemento está dentro de um dialog (ex.: imagem em tela cheia). */
export function isInsideDialog(el: Element | null): boolean {
	return el?.closest(DIALOG) != null;
}

/**
 * Painéis/overlays abertos por cima da mesa: Biblioteca (marcada com `data-vtt-overlay="open"`) e qualquer dialog, sheet, popover
 * ou menu aberto (Base UI/Radix só montam o popup enquanto aberto).
 */
const OPEN_OVERLAY =
	'[data-vtt-overlay="open"], [role="dialog"], [role="alertdialog"], dialog[open], [role="menu"]';

/** Há um dialog/sheet/menu aberto (o Esc é dele, não da Biblioteca). */
const DIALOG_OPEN =
	'[role="dialog"], [role="alertdialog"], dialog[open], [role="menu"]';

export function hasOpenVttDialog(): boolean {
	if (typeof document === "undefined") return false;
	return document.querySelector(DIALOG_OPEN) !== null;
}

/**
 * Painel flutuante (ex.: Ficha na mesa) que só "segura" os atalhos quando o
 * foco está dentro dele, como os painéis do Figma: com o foco na mesa, V, R,
 * Espaço etc. continuam funcionando com o painel aberto.
 */
const FOCUS_SCOPE = "[data-vtt-focus-scope]";

export function focusScopeOf(el: Element | null): string | null {
	const scope = el?.closest(FOCUS_SCOPE);
	return scope ? (scope.getAttribute("data-vtt-focus-scope") ?? "") : null;
}

/** Escopo (ex.: "sheet") onde está o alvo da tecla ou o foco atual. */
export function activeFocusScope(e: KeyboardEvent): string | null {
	return (
		focusScopeOf(asElement(e.target)) ??
		(typeof document === "undefined"
			? null
			: focusScopeOf(document.activeElement))
	);
}

export function hasOpenVttOverlay(): boolean {
	if (typeof document === "undefined") return false;
	return document.querySelector(OPEN_OVERLAY) !== null;
}

/**
 * Atalhos de letra do VTT (V/H/R/G/T/F, Espaço) não disparam quando o alvo da
 * tecla ou o foco atual estão num campo editável ou dentro de um dialog, nem
 * enquanto houver painel/overlay aberto por cima da mesa (qualquer foco).
 * Olha também `document.activeElement` porque o evento pode vir do `body`
 * enquanto o foco está num campo (ex.: logo depois de trocar de aba).
 */
export function isVttShortcutBlocked(e: KeyboardEvent): boolean {
	const candidates = [
		asElement(e.target),
		typeof document === "undefined" ? null : document.activeElement,
	];
	if (hasOpenVttOverlay()) return true;
	return candidates.some(
		(el) =>
			isEditableElement(el) || isInsideDialog(el) || focusScopeOf(el) !== null,
	);
}
