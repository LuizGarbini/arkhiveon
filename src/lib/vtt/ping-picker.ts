/**
 * Lista de tipos de ping que abre ao SEGURAR o botão de ping da barra (o jeito do
 * celular escolher o tipo): as opções aparecem ao lado do botão, a pessoa arrasta
 * o dedo até uma e solta para escolher. Geometria pura.
 */

/** Segurar o botão por este tempo (ms) abre a lista. */
export const PICKER_HOLD_MS = 320;
/** Mexer o dedo mais que isto (px) antes da lista abrir cancela o gesto. */
export const PICKER_MOVE_SLOP_PX = 10;
/** Altura de cada opção e o vão entre elas (px). */
export const PICKER_ITEM_PX = 48;
export const PICKER_GAP_PX = 6;
/** Largura da lista (px) e distância dela até o botão. */
export const PICKER_WIDTH_PX = 240;
export const PICKER_OFFSET_PX = 14;

export interface PickerBox {
	/** Canto superior esquerdo da lista (px do cliente). */
	left: number;
	top: number;
}

/**
 * Onde pôr a lista: à direita do botão, com a opção do meio na altura dele, sem
 * sair da tela (sobe ou desce o que for preciso).
 */
export function pickerBox(
	button: { right: number; top: number; bottom: number },
	count: number,
	viewport: { width: number; height: number },
): PickerBox {
	const height =
		count * PICKER_ITEM_PX + Math.max(0, count - 1) * PICKER_GAP_PX;
	const centerY = (button.top + button.bottom) / 2;
	let top = centerY - height / 2;
	top = Math.min(top, viewport.height - height - 8);
	top = Math.max(top, 8);
	let left = button.right + PICKER_OFFSET_PX;
	left = Math.min(left, viewport.width - PICKER_WIDTH_PX - 8);
	left = Math.max(left, 8);
	return { left, top };
}

/**
 * Qual opção está sob o dedo, ou -1. Sai da faixa horizontal da lista com folga
 * para o dedo poder desviar para cima e para baixo sem perder a escolha.
 */
export function pickerIndexAt(
	point: { x: number; y: number },
	box: PickerBox,
	count: number,
): number {
	const slack = 24;
	if (
		point.x < box.left - slack ||
		point.x > box.left + PICKER_WIDTH_PX + slack
	)
		return -1;
	const step = PICKER_ITEM_PX + PICKER_GAP_PX;
	const relative = point.y - box.top;
	if (relative < -slack) return -1;
	const index = Math.floor(relative / step);
	const inItem = relative - index * step <= PICKER_ITEM_PX + PICKER_GAP_PX / 2;
	if (index < 0) return relative >= -slack ? 0 : -1;
	if (index >= count) {
		return relative <= count * step + slack ? count - 1 : -1;
	}
	return inItem ? index : Math.min(index + 1, count - 1);
}
