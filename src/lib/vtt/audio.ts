/**
 * Procedural Web Audio synthesizer for VTT sound effects (Sonar Pings, Dice rolls, Token Drops)
 * Zero external asset dependencies, instant playback with envelope shaping.
 */

import { DEFAULT_PING_KIND, type PingKind } from "./ping-kinds";
import { PING_THROTTLE_MS } from "./ping-queue";

let audioCtx: AudioContext | null = null;
let lastPingSoundAt: number | null = null;

/**
 * Nota inicial e final (Hz) do estalo de cada tipo de ping: o de perigo desce
 * (alerta), o de ajuda e o de "a caminho" têm timbres próprios e o do mestre sobe
 * mais alto, para se destacar.
 */
export function pingTone(kind: PingKind = DEFAULT_PING_KIND): {
	from: number;
	to: number;
} {
	switch (kind) {
		case "danger":
			return { from: 620, to: 392 };
		case "going":
			return { from: 660, to: 880 };
		case "help":
			return { from: 740, to: 740 };
		case "highlight":
			return { from: 988, to: 1319 };
		case "focus":
			return { from: 523, to: 1568 };
		default:
			return { from: 880, to: 1320 };
	}
}

/** `true` quando o som pode tocar. Rajada mais rápida que `gap` é descartada. */
export function shouldPlayPingSound(
	lastAt: number | null,
	now: number,
	gap = PING_THROTTLE_MS,
): boolean {
	if (lastAt === null) return true;
	return now - lastAt >= gap;
}

function getAudioContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	try {
		if (!audioCtx) {
			const AudioContextClass =
				window.AudioContext ||
				(window as unknown as { webkitAudioContext: typeof AudioContext })
					.webkitAudioContext;
			if (AudioContextClass) {
				audioCtx = new AudioContextClass();
			}
		}
		if (audioCtx && audioCtx.state === "suspended") {
			void audioCtx.resume();
		}
		return audioCtx;
	} catch {
		return null;
	}
}

/**
 * Plays a gentle, pleasant tactical sonar ping chime
 */
export function playPingAudio(
	now = Date.now(),
	kind: PingKind = DEFAULT_PING_KIND,
) {
	if (!shouldPlayPingSound(lastPingSoundAt, now)) return;
	const ctx = getAudioContext();
	if (!ctx) return;
	lastPingSoundAt = now;

	try {
		const tone = ctx.currentTime;

		// Main chime oscillator
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "sine";
		const { from, to } = pingTone(kind);
		osc.frequency.setValueAtTime(from, tone);
		osc.frequency.exponentialRampToValueAtTime(to, tone + 0.08);

		// Envelope: quick attack, smooth exponential decay
		gain.gain.setValueAtTime(0.001, tone);
		gain.gain.linearRampToValueAtTime(0.18, tone + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, tone + 0.45);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(tone);
		osc.stop(tone + 0.5);

		// Subtle secondary harmony
		const osc2 = ctx.createOscillator();
		const gain2 = ctx.createGain();

		osc2.type = "triangle";
		osc2.frequency.setValueAtTime(440, tone);
		osc2.frequency.exponentialRampToValueAtTime(660, tone + 0.1);

		gain2.gain.setValueAtTime(0.001, tone);
		gain2.gain.linearRampToValueAtTime(0.08, tone + 0.03);
		gain2.gain.exponentialRampToValueAtTime(0.0001, tone + 0.35);

		osc2.connect(gain2);
		gain2.connect(ctx.destination);

		osc2.start(tone);
		osc2.stop(tone + 0.4);
	} catch (err) {
		console.warn("Could not play ping audio effect:", err);
	}
}

/** Estalo curto de dados, no mesmo sintetizador do ping. Sem arquivo externo. */
export function playDiceAudio() {
	const ctx = getAudioContext();
	if (!ctx) return;
	try {
		const now = ctx.currentTime;
		for (let i = 0; i < 3; i++) {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			const start = now + i * 0.045;
			osc.type = "triangle";
			osc.frequency.setValueAtTime(180 + i * 70, start);
			osc.frequency.exponentialRampToValueAtTime(90, start + 0.06);
			gain.gain.setValueAtTime(0.001, start);
			gain.gain.linearRampToValueAtTime(0.12, start + 0.008);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(start);
			osc.stop(start + 0.1);
		}
	} catch (err) {
		console.warn("Could not play dice audio effect:", err);
	}
}
