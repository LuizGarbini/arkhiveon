import type { PingKind } from "./ping-kinds";

/**
 * Contas do ping na mesa: ondas de energia com brilho médio, a cor da pessoa
 * misturada à do tipo, entrada em ease-out e saída que some aos poucos.
 * O desenho fica em pixels do mapa; o zoom do mundo é que o aumenta.
 */

/** Intensidade média: o brilho existe, sem virar holofote. */
export const PING_GLOW_ALPHA = 0.18;
/** Contorno escuro para o ping ler em mapa claro. */
export const PING_SHADOW = 0x07080d;
/** Filete claro para o ping ler em mapa escuro. */
export const PING_RIM = 0xffffff;
/** Deslocamento da sombra do ícone (px do mapa). */
export const ICON_SHADOW = { x: 1.6, y: 2.2 } as const;

const ACCENT: Record<PingKind, number | null> = {
	attention: null,
	danger: 0xef4444,
	going: 0x22c55e,
	help: 0xf59e0b,
	highlight: null,
	focus: 0xfacc15,
};

/** Quanto do tempo o ping usa para entrar e a partir de quando começa a sair. */
const ENTER_PORTION = 0.16;
const EXIT_START = 0.64;

interface WaveSpec {
	count: number;
	period: number;
	travel: number;
	base: number;
}

/** Atenção é lenta; perigo é curto de propósito. Ajuda desloca a segunda onda metade do ciclo. */
const WAVES: Record<PingKind, WaveSpec> = {
	attention: { count: 3, period: 1080, travel: 38, base: 18 },
	danger: { count: 2, period: 260, travel: 46, base: 14 },
	going: { count: 2, period: 760, travel: 26, base: 16 },
	help: { count: 2, period: 520, travel: 44, base: 16 },
	highlight: { count: 1, period: 700, travel: 6, base: 4 },
	focus: { count: 3, period: 640, travel: 72, base: 22 },
};

export interface PingLife {
	/** 0..1. Ease-out na entrada; 1 se a pessoa pediu menos movimento. */
	enter: number;
	/** 0..1. Sobe na entrada e desce no fim. */
	alpha: number;
}

export interface WaveRing {
	radius: number;
	alpha: number;
	width: number;
}

export interface Chevron {
	/** Pontos relativos ao centro: ponta esquerda, ponta, ponta direita. */
	points: readonly [number, number, number, number, number, number];
}

export interface PingPalette {
	halo: number;
	icon: number;
}

export interface PingLabelSpec {
	id: string;
	text: string;
	x: number;
	y: number;
}

function clamp01(value: number): number {
	if (value <= 0) return 0;
	if (value >= 1) return 1;
	return value;
}

export function easeOutCubic(t: number): number {
	const x = clamp01(t);
	return 1 - (1 - x) ** 3;
}

/** O ping cresce com o zoom porque vive no mundo. Não encolhe para caber na tela. */
export function worldRadius(radius: number, zoom: number): number {
	if (!(zoom > 0)) return radius;
	return radius;
}

export function mixColor(
	base: number,
	accent: number,
	accentShare: number,
): number {
	const t = clamp01(accentShare);
	const mix = (from: number, to: number) => Math.round(from + (to - from) * t);
	const r = mix((base >> 16) & 255, (accent >> 16) & 255);
	const g = mix((base >> 8) & 255, (accent >> 8) & 255);
	const b = mix(base & 255, accent & 255);
	return (r << 16) | (g << 8) | b;
}

/** Halo puxa para a pessoa; o ícone puxa para o tipo. Atenção e destaque são a cor dela. */
export function pingPalette(kind: PingKind, user: number): PingPalette {
	const accent = ACCENT[kind];
	if (accent == null) return { halo: user, icon: user };
	return {
		halo: mixColor(user, accent, 0.38),
		icon: mixColor(user, accent, 0.7),
	};
}

export function pingLife(progress: number, reducedMotion: boolean): PingLife {
	const p = clamp01(progress);
	const fadeOut = p <= EXIT_START ? 1 : (1 - p) / (1 - EXIT_START);
	if (reducedMotion) {
		const fadeIn = Math.min(1, p / 0.1);
		return { enter: 1, alpha: fadeIn * fadeOut };
	}
	const enter = easeOutCubic(Math.min(1, p / ENTER_PORTION));
	return { enter, alpha: enter * fadeOut };
}

export function prefersReducedMotion(): boolean {
	return (
		typeof matchMedia === "function" &&
		matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

export function waveRings(
	kind: PingKind,
	elapsed: number,
	life: PingLife,
	reducedMotion: boolean,
): WaveRing[] {
	const spec = WAVES[kind];
	const rings: WaveRing[] = [];
	for (let i = 0; i < spec.count; i++) {
		const offset = kind === "help" ? i * 0.5 : i / spec.count;
		const phase = reducedMotion
			? 0.35 + offset * 0.25
			: (elapsed / spec.period + offset) % 1;
		const peak = kind === "danger" ? 0.78 : 0.58;
		rings.push({
			radius: spec.base + phase * spec.travel,
			alpha: (1 - phase) * life.alpha * peak,
			width: kind === "danger" ? 3 : 2.4,
		});
	}
	return rings;
}

/** Três chevrons subindo. Parados se a pessoa pediu menos movimento. */
export function goingChevrons(
	elapsed: number,
	reducedMotion: boolean,
): Chevron[] {
	const chevrons: Chevron[] = [];
	for (let i = 0; i < 3; i++) {
		const travel = reducedMotion ? 0 : ((elapsed / 700 + i / 3) % 1) * 14;
		const y = -4 - i * 14 - travel;
		const spread = 9 + i * 1.4;
		chevrons.push({
			points: [-spread, y + 8, 0, y, spread, y + 8],
		});
	}
	return chevrons;
}

/** Distância da ponta da seta até o centro do token. */
export function arrowTipDistance(
	elapsed: number,
	tokenRadius: number,
	reducedMotion: boolean,
): number {
	const pulse = reducedMotion ? 4 : 5 + 6 * Math.sin(elapsed / 180);
	return tokenRadius + 8 + pulse;
}

export function glowRadius(life: PingLife): number {
	return 26 * (0.86 + 0.14 * life.enter);
}

export function glowAlpha(life: PingLife): number {
	return PING_GLOW_ALPHA * life.alpha;
}

export function pingLabelText(name: string): string {
	const clean = name.trim();
	if (clean.length <= 22) return clean;
	return `${clean.slice(0, 21)}…`;
}

export function labelAnchor(
	x: number,
	y: number,
	life: PingLife,
): { x: number; y: number } {
	return { x, y: y + 28 + (1 - life.enter) * 8 };
}
