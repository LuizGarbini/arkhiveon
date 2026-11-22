/**
 * Ajuste rápido de PV (−5, −1, +1, +5). Dano come primeiro a vida temporária;
 * cura nunca passa do máximo. Puro: quem chama grava `temp` e depois `current`.
 */
export interface HpDeltaState {
	current: number;
	max: number;
	temp: number;
	/** Há como gravar a vida temporária (senão o dano vai direto no PV). */
	canTemp: boolean;
}

export interface HpDeltaPlan {
	temp?: number;
	current?: number;
}

export function planHpDelta(delta: number, state: HpDeltaState): HpDeltaPlan {
	const { current, max, temp, canTemp } = state;
	if (delta < 0 && temp > 0 && canTemp) {
		const damage = -delta;
		if (damage <= temp) return { temp: temp - damage };
		return { temp: 0, current: Math.max(0, current - (damage - temp)) };
	}
	if (delta > 0) {
		return { current: Math.min(max || current + delta, current + delta) };
	}
	return { current: Math.max(0, current + delta) };
}

/**
 * Definir o PV atual num valor (“15” sem sinal ou “=15” no painel de PV). Fica
 * entre 0 e o máximo (sem máximo, só o piso 0); a vida temporária não muda.
 * Sem mudança devolve `{}`.
 */
export function planHpSet(
	value: number,
	state: Pick<HpDeltaState, "current" | "max">,
): HpDeltaPlan {
	const { current, max } = state;
	if (!Number.isFinite(value)) return {};
	const floored = Math.max(0, Math.trunc(value));
	const next = max > 0 ? Math.min(max, floored) : floored;
	return next === current ? {} : { current: next };
}
