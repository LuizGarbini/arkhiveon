/**
 * Tema do EmbedPDF (2.15.1) ligado aos tokens do Arkhiveon.
 * O snippet grava cada cor como custom property (--ep-*) no :host do shadow
 * DOM; custom properties herdam através do shadow root, então `var(--primary)`
 * resolve com o valor do tema ativo (.dark ou :root) sem hex duplicado.
 */
const colors = {
	background: {
		app: "var(--background)",
		surface: "var(--card)",
		surfaceAlt: "var(--muted)",
		elevated: "var(--popover)",
		input: "var(--input)",
	},
	foreground: {
		primary: "var(--foreground)",
		secondary: "var(--muted-foreground)",
		muted: "var(--muted-foreground)",
		onAccent: "var(--primary-foreground)",
	},
	border: {
		default: "var(--border)",
		subtle: "var(--border)",
		strong: "var(--border-hover)",
	},
	accent: {
		primary: "var(--primary)",
		primaryHover: "var(--primary-dark)",
		primaryActive: "var(--primary-dark)",
		primaryLight: "var(--primary-muted)",
		primaryForeground: "var(--primary-foreground)",
	},
	interactive: {
		hover: "var(--accent)",
		active: "var(--accent)",
		selected: "var(--primary-muted)",
		focus: "var(--primary)",
		focusRing: "var(--ring)",
	},
	state: {
		error: "var(--destructive)",
	},
};

export function libraryViewerTheme(preference: "dark" | "light") {
	return { preference, light: colors, dark: colors };
}
