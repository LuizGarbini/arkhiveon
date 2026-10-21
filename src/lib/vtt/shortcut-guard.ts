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
 * Painéis/overlays abertos por cima da mesa: Biblioteca e Ficha na mesa
 * (marcados com `data-vtt-overlay="open"`) e qualquer dialog, sheet, popover
 * ou menu aberto (Base UI/Radix só montam o popup enquanto aberto).
 */
const OPEN_OVERLAY =
	'[data-vtt-overlay="open"], [role="dialog"], [role="alertdialog"], dialog[open], [role="menu"]';

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
	return candidates.some((el) => isEditableElement(el) || isInsideDialog(el));
}
