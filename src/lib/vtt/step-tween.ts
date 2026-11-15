/**
 * Tween curto e cancelável do passo de uma seta: em vez de teletransportar o
 * token uma casa, o desenho desliza até lá em ~100 ms (ease-out). Um passo novo
 * parte de ONDE O DESENHO ESTÁ agora (não de onde o passo anterior terminava), então
 * alternar cima/baixo rápido nunca "pula" nem volta para o local antigo.
 * Pura: o tempo entra por parâmetro, o canvas só lê a posição a cada quadro.
 */
export const STEP_TWEEN_MS = 100;

export interface StepTween {
	fromX: number;
	fromY: number;
	toX: number;
	toY: number;
	start: number;
	duration: number;
}

export interface TweenSample {
	x: number;
	y: number;
	done: boolean;
}

/** Ease-out cúbico: arranca rápido (resposta imediata) e assenta devagar. */
export function easeOutCubic(t: number): number {
	const c = Math.min(1, Math.max(0, t));
	return 1 - (1 - c) ** 3;
}

/** O sistema pede menos movimento? (sem `window`/`matchMedia`, assume que não) */
export function prefersReducedMotion(): boolean {
	if (typeof window === "undefined" || typeof window.matchMedia !== "function")
		return false;
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Quem pediu menos movimento não ganha animação (e `0` desliga o tween). */
export function stepTweenDuration(reducedMotion: boolean): number {
	return reducedMotion ? 0 : STEP_TWEEN_MS;
}

/**
 * Começa (ou recomeça) o tween a partir da posição ATUAL do desenho. Devolve null
 * quando não há o que animar (sem duração ou já está no destino): o chamador então
 * posiciona direto.
 */
export function startStepTween(
	current: { x: number; y: number },
	to: { x: number; y: number },
	now: number,
	duration: number,
): StepTween | null {
	if (duration <= 0) return null;
	if (current.x === to.x && current.y === to.y) return null;
	return {
		fromX: current.x,
		fromY: current.y,
		toX: to.x,
		toY: to.y,
		start: now,
		duration,
	};
}

/** A posição do tween em `now`. Ao terminar, cai exatamente no destino. */
export function sampleStepTween(tween: StepTween, now: number): TweenSample {
	const elapsed = now - tween.start;
	if (elapsed >= tween.duration) {
		return { x: tween.toX, y: tween.toY, done: true };
	}
	const k = easeOutCubic(elapsed / tween.duration);
	return {
		x: tween.fromX + (tween.toX - tween.fromX) * k,
		y: tween.fromY + (tween.toY - tween.fromY) * k,
		done: false,
	};
}

/** O tween ainda vale para este destino? Se a mesa mandou o token para outro lugar, não. */
export function tweenTargets(
	tween: StepTween,
	target: { x: number; y: number },
): boolean {
	return tween.toX === target.x && tween.toY === target.y;
}
