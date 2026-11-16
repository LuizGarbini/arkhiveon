/**
 * Contadores da fluidez do ping. A roda e o destaque medem o próprio quadro;
 * o boot do Pixi e o recálculo da visão servem para provar que o gesto não
 * mexe neles. Em localhost o mesmo número fica em `window.__vttPingFrame`.
 */

export interface PingFrameStats {
	wheelRenders: number;
	lastWheelMs: number;
	maxWheelMs: number;
	pixiBoots: number;
	visionPasses: number;
	lastPaintAt: number;
}

const stats: PingFrameStats = {
	wheelRenders: 0,
	lastWheelMs: 0,
	maxWheelMs: 0,
	pixiBoots: 0,
	visionPasses: 0,
	lastPaintAt: 0,
};

function publish() {
	if (typeof window === "undefined") return;
	const host = window.location?.hostname;
	if (host && host !== "localhost" && host !== "127.0.0.1") return;
	const win = window as Window & { __vttPingFrame?: PingFrameStats };
	win.__vttPingFrame = { ...stats };
}

export function noteWheelRender() {
	stats.wheelRenders += 1;
	publish();
}

export function noteWheelFrame(ms: number) {
	stats.lastWheelMs = ms;
	if (ms > stats.maxWheelMs) stats.maxWheelMs = ms;
	publish();
}

export function notePixiBoot() {
	stats.pixiBoots += 1;
	publish();
}

export function noteVisionPass() {
	stats.visionPasses += 1;
	publish();
}

export function notePingPaint() {
	stats.lastPaintAt =
		typeof performance !== "undefined" ? performance.now() : Date.now();
	publish();
}

export function pingFrameStats(): PingFrameStats {
	return { ...stats };
}
