// Layout da barra do grid em 390 px. A barra tem altura fixa (fechada e com
// "Mais ajustes" aberto) e zoom/toolbar derivam desses mesmos números, então
// "Salvando…", erro ou grid livre nunca mudam a altura nem cobrem nada.
// Altura fechada 10.5rem (152.25px) + 0.75rem de margem; aberta 28rem (406px).
// Fonte única das medidas (rem). As classes abaixo ficam literais porque o
// Tailwind não enxerga string montada em runtime; o teste garante que batem.
// O html usa font-size 14.5px (src/styles.css), então 1rem = 14.5px, não 16.
// Mantenha em sincronia com styles.css; o teste usa este valor para os px.
export const ROOT_FONT_PX = 14.5;
export const remToPx = (rem: number): number => rem * ROOT_FONT_PX;
export const BAR_CLOSED_REM = 10.5;
export const BAR_OPEN_REM = 28;
export const GAP_REM = 0.5;
export const BOTTOM_MARGIN_REM = 0.75;
export const TOOLBAR_TOP_REM = 8; // top-32

export const zoomOffsetRem = (open: boolean): number =>
	(open ? BAR_OPEN_REM : BAR_CLOSED_REM) + BOTTOM_MARGIN_REM + GAP_REM;

export const GRID_BAR_MOBILE_CLASS = {
	closed: "max-sm:h-[10.5rem]",
	open: "max-sm:h-[28rem]",
} as const;

// Zoom: 0.5rem acima do topo da barra.
export const ZOOM_ABOVE_GRID_BAR_CLASS = {
	closed: "max-sm:bottom-[calc(env(safe-area-inset-bottom)+11.75rem)]",
	open: "max-sm:bottom-[calc(env(safe-area-inset-bottom)+29.25rem)]",
} as const;

// Toolbar esquerda (top-32): fechada, termina 0.5rem acima da barra e rola por
// dentro (gap-0 para caber inteira em 844 px); com "Mais ajustes" aberto não cabe acima, então recolhe junto.
export const TOOLBAR_WITH_GRID_BAR_CLASS = {
	closed:
		"max-sm:max-h-[calc(100dvh-env(safe-area-inset-bottom)-19.75rem)] max-sm:gap-0 max-sm:[&>div]:gap-0",
	open: "max-sm:hidden",
} as const;
