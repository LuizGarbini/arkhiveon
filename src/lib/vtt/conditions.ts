/**
 * Condições/status do token (guardadas em `vtt_tokens.conditions`, jsonb que
 * já existe: lista de ids). As cores são as mesmas da paleta já usada nos
 * chips do menu do token (Tailwind *-400); `hex` é a mesma cor para o Pixi.
 */
/** Ícones lucide dos status (sem emoji). `circle-dot` = status desconhecido. */
export const VTT_STATUS_ICON_NAMES = [
	"biohazard",
	"arrow-down-to-line",
	"eye-off",
	"zap",
	"ghost",
	"flame",
	"brain",
	"circle-dot",
] as const;
export type VTTStatusIconName = (typeof VTT_STATUS_ICON_NAMES)[number];

export interface VTTConditionDef {
	id: string;
	label: string;
	/** Ícone do lucide-react (monocromático, `currentColor`). */
	icon: VTTStatusIconName;
	/** Classes do chip no menu (mesmas de antes). */
	color: string;
	/** Mesma cor (Tailwind *-400) para o anel no canvas. */
	hex: number;
}

export const VTT_CONDITIONS: VTTConditionDef[] = [
	{
		id: "envenenado",
		label: "Envenenado",
		icon: "biohazard",
		color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
		hex: 0x34d399,
	},
	{
		id: "caido",
		label: "Caído",
		icon: "arrow-down-to-line",
		color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
		hex: 0xfbbf24,
	},
	{
		id: "cego",
		label: "Cego",
		icon: "eye-off",
		color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10",
		hex: 0xa1a1aa,
	},
	{
		id: "atordoado",
		label: "Atordoado",
		icon: "zap",
		color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
		hex: 0xfacc15,
	},
	{
		id: "invisivel",
		label: "Invisível",
		icon: "ghost",
		color: "text-sky-400 border-sky-500/40 bg-sky-500/10",
		hex: 0x38bdf8,
	},
	{
		id: "chamas",
		label: "Em Chamas",
		icon: "flame",
		color: "text-rose-400 border-rose-500/40 bg-rose-500/10",
		hex: 0xfb7185,
	},
	{
		id: "concentracao",
		label: "Concentração",
		icon: "brain",
		color: "text-purple-400 border-purple-500/40 bg-purple-500/10",
		hex: 0xc084fc,
	},
];

const BY_ID = new Map(VTT_CONDITIONS.map((c) => [c.id, c]));

/** Id desconhecido (dado antigo/custom) vira um status neutro com o próprio id. */
export function conditionDef(id: string): VTTConditionDef {
	return (
		BY_ID.get(id) ?? {
			id,
			label: id,
			icon: "circle-dot",
			color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10",
			hex: 0xa1a1aa,
		}
	);
}

export const MAX_VISIBLE_CONDITIONS = VTT_CONDITIONS.length;

/** Tamanhos do disco de status (px de tela no zoom 1; mesmos no canvas). */
export const STATUS_CHIP = {
	desktop: { chip: 22, icon: 16 },
	compact: { chip: 26, icon: 18 },
	stroke: 1.5,
} as const;
/** No celular/toque: todos os discos ativos também ficam visíveis no anel. */
export const COMPACT_VISIBLE_CONDITIONS = VTT_CONDITIONS.length;

/** Arco máximo ao redor do token (~297°), preservando o topo livre para a barra de PV. */
export const MAX_STATUS_RING_ARC = Math.PI * 1.65;
/** Folga mínima (em px do mundo) entre as bordas de discos vizinhos no anel. */
export const STATUS_DISC_GAP_PX = 3;

export interface StatusDiscPlacement {
	x: number;
	y: number;
	angle: number;
}

/**
 * Posiciona os discos de efeito curvados ao redor da borda circular do token.
 * O arco é centralizado na base do token (90° / π/2) e sobe pelas laterais
 * esquerda e direita seguindo o raio `tokenRadius`, da esquerda para a direita.
 */
export function statusDiscPositions(
	count: number,
	tokenRadius: number,
	chipDiameter: number = STATUS_CHIP.desktop.chip,
): StatusDiscPlacement[] {
	if (count <= 0 || tokenRadius <= 0) return [];
	const baseAngle = Math.PI / 2;
	const chordRatio = Math.min(
		0.95,
		Math.max(0, (chipDiameter + STATUS_DISC_GAP_PX) / (2 * tokenRadius)),
	);
	const idealStep = 2 * Math.asin(chordRatio);
	const step =
		count > 1 ? Math.min(idealStep, MAX_STATUS_RING_ARC / (count - 1)) : 0;

	return Array.from({ length: count }, (_, i) => {
		const offset = i - (count - 1) / 2;
		const angle = baseAngle - offset * step;
		return {
			x: Math.cos(angle) * tokenRadius,
			y: Math.sin(angle) * tokenRadius,
			angle,
		};
	});
}

/**
 * Todos os status ativos ficam visíveis ao redor do anel do token por padrão
 * (sem esconder atrás de "+N"). Ids repetidos/vazios caem.
 */
export function summarizeConditions(
	ids: readonly string[] | null | undefined,
	max: number = Number.POSITIVE_INFINITY,
): {
	visible: VTTConditionDef[];
	overflow: number;
} {
	const unique = [...new Set((ids ?? []).filter((id) => id?.trim()))];
	return {
		visible: unique.slice(0, max).map(conditionDef),
		overflow: Math.max(0, unique.length - max),
	};
}

/**
 * Anel do token: seleção (azul, 3.5px) tem prioridade; com status, borda de
 * 2px na cor do primeiro status; sem status, o anel de sempre.
 */
export function tokenRingStyle(
	conditions: readonly string[] | null | undefined,
	isSelected: boolean,
	isGMLayer: boolean,
): { color: number; width: number } {
	if (isSelected) return { color: 0x38bdf8, width: 3.5 };
	const { visible } = summarizeConditions(conditions);
	if (visible.length > 0) return { color: visible[0].hex, width: 2 };
	return isGMLayer
		? { color: 0xa855f7, width: 2.5 }
		: { color: 0xd4d4d8, width: 2 };
}

/** Liga/desliga um status, sem repetir ids. */
export function toggleCondition(
	ids: readonly string[] | null | undefined,
	id: string,
): string[] {
	const current = [...new Set(ids ?? [])];
	return current.includes(id)
		? current.filter((c) => c !== id)
		: [...current, id];
}

/**
 * Jogador só vê status de token que já vê na mesa (mesma regra do canvas e do
 * RLS/realtime: camada do mestre e tokens ocultos ficam só para o mestre).
 */
export function canSeeTokenStatus(
	token: { layer: string; isHidden: boolean },
	isGM: boolean,
): boolean {
	return isGM || (token.layer !== "gm" && !token.isHidden);
}
