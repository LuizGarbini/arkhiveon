/** Borda direita da barra de ferramentas da mesa (left-3 + w-14) + folga. */
export const VTT_TOOLBAR_INSET_PX = 12 + 56 + 8;

type Viewport = { x: number; y: number; scale: number };

/**
 * Enquadramento ao abrir a mesa: o mapa começa à direita da barra de
 * ferramentas (que cobria tokens e status na borda esquerda), no celular e no
 * desktop. Só mexe se a pessoa ainda não moveu a mesa (viewport padrão).
 */
export function initialSceneViewport(
	_windowWidth: number,
	current: Viewport,
): Viewport | null {
	if (current.x !== 0 || current.y !== 0 || current.scale !== 1) return null;
	return { x: VTT_TOOLBAR_INSET_PX, y: 0, scale: 1 };
}
