export const GLOBAL_SEARCH_SHORTCUT_ARIA = "Control+K Meta+K";
export const SHORTCUT_HELP_SHORTCUT_ARIA = "Control+/ Meta+/";
export const PAGE_SEARCH_SHORTCUT_ARIA = "Alt+S";
export const NEW_RECORD_SHORTCUT_ARIA = "Alt+N";
export const MAIN_CONTENT_SHORTCUT_ARIA = "Alt+M";

export const NAVIGATION_SHORTCUTS = [
	{ key: "1", label: "Dashboard", to: "/dashboard", aria: "Alt+1" },
	{ key: "2", label: "Elenco", to: "/characters", aria: "Alt+2" },
	{ key: "3", label: "Fichas", to: "/sheets", aria: "Alt+3" },
	{ key: "4", label: "Árvore", to: "/family-tree", aria: "Alt+4" },
	{ key: "5", label: "NPCs", to: "/npcs", aria: "Alt+5" },
	{ key: "6", label: "Sessões", to: "/sessions", aria: "Alt+6" },
	{ key: "7", label: "Itens", to: "/items", aria: "Alt+7" },
	{ key: "8", label: "Locais", to: "/locations", aria: "Alt+8" },
	{ key: "9", label: "Lore", to: "/lore", aria: "Alt+9" },
] as const;

export function getPrimaryModifierLabel() {
	if (typeof navigator === "undefined") return "Ctrl";
	return /Mac|iPhone|iPad|iPod/i.test(navigator.platform) ? "⌘" : "Ctrl";
}

export function isEditableShortcutTarget(target: EventTarget | null) {
	if (!(target instanceof HTMLElement)) return false;
	return Boolean(
		target.closest(
			"input, textarea, select, [contenteditable='true'], [role='textbox']",
		),
	);
}

export function hasOpenBlockingDialog() {
	if (typeof document === "undefined") return false;
	return Boolean(
		document.querySelector(
			"[data-slot='dialog-content'], [role='dialog'][aria-modal='true']",
		),
	);
}

export function focusPageSearch() {
	const searchInput = document.querySelector<HTMLInputElement>(
		"[data-shortcut-target='page-search']",
	);

	if (!searchInput || searchInput.disabled) return false;
	searchInput.focus();
	searchInput.select();
	return true;
}

export function clickShortcutAction(action: "new") {
	const element = document.querySelector<HTMLElement>(
		`[data-shortcut-action='${action}']`,
	);

	if (!element) return false;
	if (element instanceof HTMLButtonElement && element.disabled) return false;
	element.click();
	return true;
}

export function focusMainContent() {
	const main = document.querySelector<HTMLElement>(
		"[data-shortcut-target='main-content']",
	);
	if (!(main instanceof HTMLElement)) return false;
	main.focus();
	return true;
}
