import { useEffect, useState } from "react";

/**
 * O valor só "assenta" depois de `delayMs` sem mudar (debounce de trailing). Serve
 * para o recálculo caro da visão/exploração: numa rajada de setas ele roda UMA vez,
 * quando o movimento termina, com a visão mais recente, em vez de a cada passo.
 * (`useDeferredValue` não basta: numa máquina rápida cada passo termina de
 * renderizar antes do próximo e o trabalho roda igual a cada toque.)
 *
 * O efeito aqui é um temporizador (efeito colateral de verdade), não um estado
 * derivado calculado no efeito.
 */
export function useSettledValue<T>(value: T, delayMs: number): T {
	const [settled, setSettled] = useState(value);
	useEffect(() => {
		if (Object.is(value, settled)) return;
		const timer = setTimeout(() => setSettled(value), delayMs);
		return () => clearTimeout(timer);
	}, [value, settled, delayMs]);
	return settled;
}
