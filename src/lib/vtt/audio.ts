/**
 * Procedural Web Audio synthesizer for VTT sound effects (Sonar Pings, Dice rolls, Token Drops)
 * Zero external asset dependencies, instant playback with envelope shaping.
 */

let audioCtx: AudioContext | null = null;

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
export function playPingAudio() {
	const ctx = getAudioContext();
	if (!ctx) return;

	try {
		const now = ctx.currentTime;

		// Main chime oscillator
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.type = "sine";
		osc.frequency.setValueAtTime(880, now); // A5 note
		osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08); // Quick sweep up to E6

		// Envelope: quick attack, smooth exponential decay
		gain.gain.setValueAtTime(0.001, now);
		gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.start(now);
		osc.stop(now + 0.5);

		// Subtle secondary harmony
		const osc2 = ctx.createOscillator();
		const gain2 = ctx.createGain();

		osc2.type = "triangle";
		osc2.frequency.setValueAtTime(440, now);
		osc2.frequency.exponentialRampToValueAtTime(660, now + 0.1);

		gain2.gain.setValueAtTime(0.001, now);
		gain2.gain.linearRampToValueAtTime(0.08, now + 0.03);
		gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

		osc2.connect(gain2);
		gain2.connect(ctx.destination);

		osc2.start(now);
		osc2.stop(now + 0.4);
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
