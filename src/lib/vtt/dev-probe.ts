/**
 * Sondas só de desenvolvimento/teste (localhost): contadores e leitores que os
 * checks de navegador (`pnpm check:setas-perf`) leem em `window.__vtt_probe__`.
 * Em produção (fora de localhost) tudo aqui é no-op e não toca no `window`.
 */
export interface VttProbe {
	counts: Record<string, number>;
	/** Posição visual (objeto Pixi) de um token, ou null se não está desenhado. */
	tokenPos?: (id: string) => { x: number; y: number } | null;
	/** Ângulo (graus, 0–360) da seta de direção desenhada no token, ou null se não há. */
	facing?: (id: string) => number | null;
	/** Quantos tokens ainda têm gravação de posição em voo ou esperando. */
	writesBusy?: () => number;
}

function probeHost(): VttProbe | null {
	if (typeof window === "undefined") return null;
	const host = window.location.hostname;
	if (!import.meta.env.DEV && host !== "localhost" && host !== "127.0.0.1")
		return null;
	const w = window as unknown as { __vtt_probe__?: VttProbe };
	w.__vtt_probe__ ??= { counts: {} };
	return w.__vtt_probe__;
}

/** Soma 1 ao contador `name`. */
export function devCount(name: string): void {
	const probe = probeHost();
	if (!probe) return;
	probe.counts[name] = (probe.counts[name] ?? 0) + 1;
}

/** Registra o leitor da posição visual dos tokens. */
export function devExposeTokenPos(read: VttProbe["tokenPos"]): void {
	const probe = probeHost();
	if (probe) probe.tokenPos = read;
}

/** Registra o leitor de gravações de posição pendentes. */
export function devExposeWritesBusy(read: VttProbe["writesBusy"]): void {
	const probe = probeHost();
	if (probe) probe.writesBusy = read;
}

/** Registra o leitor do ângulo da seta de direção de cada token. */
export function devExposeFacing(read: VttProbe["facing"]): void {
	const probe = probeHost();
	if (probe) probe.facing = read;
}
