/**
 * Decisões do gesto da roda de pings (puras, sem React), iguais no Windows e no Mac:
 * Ctrl + apertar o botão no mapa vazio já abre a roda, e arrastar escolhe o tipo.
 * Antes a roda só abria depois de 220 ms parado, e qualquer movimento antes disso virava
 * caixa de seleção; quem aperta e já arrasta (o jeito natural com mouse) nunca via a roda.
 */

/** A roda só é DESENHADA depois deste tempo (ms), ou assim que o mouse sai do miolo; um
 * Ctrl+clique rápido, sem arrastar, não pisca roda nenhuma. */
export const WHEEL_REVEAL_MS = 120;

export interface WheelPressInput {
	button: number;
	ctrlKey: boolean;
	metaKey: boolean;
	altKey: boolean;
	shiftKey: boolean;
	tool: string;
	spaceHeld: boolean;
	/** O aperto foi num token que o jogador controla (Ctrl+clique nele soma à seleção). */
	overControlledToken: boolean;
	hasScene: boolean;
}

/**
 * Este aperto abre a roda? Botão esquerdo com Ctrl (e só Ctrl) no mapa vazio, com a
 * ferramenta Selecionar. Com Shift (ou Cmd) a pessoa quer a caixa de seleção aditiva;
 * com Alt, o ping rápido; em token, somar à seleção; com Espaço, mover a câmera.
 */
export function startsPingWheel(input: WheelPressInput): boolean {
	return (
		input.button === 0 &&
		input.ctrlKey &&
		!input.metaKey &&
		!input.altKey &&
		!input.shiftKey &&
		input.tool === "select" &&
		!input.spaceHeld &&
		!input.overControlledToken &&
		input.hasScene
	);
}

/** A roda já deve aparecer? Passou o tempo, ou o mouse saiu do miolo (zona morta). */
export function wheelRevealed(
	elapsedMs: number,
	distancePx: number,
	deadZonePx: number,
): boolean {
	return elapsedMs >= WHEEL_REVEAL_MS || distancePx >= deadZonePx;
}

/**
 * Caixa de seleção aditiva (soma à seleção em vez de trocá-la): Shift, ou Cmd no Mac.
 * O Ctrl saiu daqui porque agora é o gesto da roda de pings; Ctrl+clique em TOKEN segue
 * somando à seleção (isso é decidido no clique do token, não aqui).
 */
export function isAdditiveMarquee(event: {
	shiftKey: boolean;
	metaKey: boolean;
}): boolean {
	return event.shiftKey || event.metaKey;
}
