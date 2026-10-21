/**
 * Condições/status do token (guardadas em `vtt_tokens.conditions`, jsonb que
 * já existe: lista de ids). As cores são as mesmas da paleta já usada nos
 * chips do menu do token (Tailwind *-400); `hex` é a mesma cor para o Pixi.
 */
export interface VTTConditionDef {
	id: string;
	label: string;
	icon: string;
	/** Classes do chip no menu (mesmas de antes). */
	color: string;
	/** Mesma cor (Tailwind *-400) para o anel no canvas. */
	hex: number;
}

export const VTT_CONDITIONS: VTTConditionDef[] = [
	{
		id: "envenenado",
		label: "Envenenado",
		icon: "🧪",
		color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
		hex: 0x34d399,
	},
	{
		id: "caido",
		label: "Caído",
		icon: "🧎",
		color: "text-amber-400 border-amber-500/40 bg-amber-500/10",
		hex: 0xfbbf24,
	},
	{
		id: "cego",
		label: "Cego",
		icon: "👁️‍🗨️",
		color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10",
		hex: 0xa1a1aa,
	},
	{
		id: "atordoado",
		label: "Atordoado",
		icon: "⚡",
		color: "text-yellow-400 border-yellow-500/40 bg-yellow-500/10",
		hex: 0xfacc15,
	},
	{
		id: "invisivel",
		label: "Invisível",
		icon: "👻",
		color: "text-sky-400 border-sky-500/40 bg-sky-500/10",
		hex: 0x38bdf8,
	},
	{
		id: "chamas",
		label: "Em Chamas",
		icon: "🔥",
		color: "text-rose-400 border-rose-500/40 bg-rose-500/10",
		hex: 0xfb7185,
	},
	{
		id: "concentracao",
		label: "Concentração",
		icon: "🔮",
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
			icon: "•",
			color: "text-zinc-400 border-zinc-500/40 bg-zinc-500/10",
			hex: 0xa1a1aa,
		}
	);
}

export const MAX_VISIBLE_CONDITIONS = 3;
/** No celular/toque: 1 ícone maior + "+N" (14px por ícone ficava ilegível). */
export const COMPACT_VISIBLE_CONDITIONS = 1;

/**
 * Até 3 status visíveis no token (1 no modo compacto); o resto vira "+N".
 * Ids repetidos/vazios caem.
 */
export function summarizeConditions(
	ids: readonly string[] | null | undefined,
	max: number = MAX_VISIBLE_CONDITIONS,
): {
	visible: VTTConditionDef[];
	overflow: number;
} {
	const unique = [...new Set((ids ?? []).filter((id) => id && id.trim()))];
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
