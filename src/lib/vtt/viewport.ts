/** Borda direita da barra de ferramentas da mesa (left-3 + w-14) + folga. */
export const VTT_TOOLBAR_INSET_PX = 12 + 56 + 8;
/** Abaixo disso a mesa está no layout de celular. */
export const VTT_MOBILE_MAX_WIDTH = 640;

type Viewport = { x: number; y: number; scale: number };

/**
 * Enquadramento ao abrir a mesa: no celular o mapa começa à direita da barra
 * de ferramentas (que cobria tokens e status na borda esquerda). Só mexe se a
 * pessoa ainda não moveu a mesa (viewport padrão).
 */
export function initialSceneViewport(
	windowWidth: number,
	current: Viewport,
): Viewport | null {
	if (windowWidth >= VTT_MOBILE_MAX_WIDTH) return null;
	if (current.x !== 0 || current.y !== 0 || current.scale !== 1) return null;
	return { x: VTT_TOOLBAR_INSET_PX, y: 0, scale: 1 };
}
