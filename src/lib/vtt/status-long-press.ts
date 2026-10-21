import { TOKEN_TAP_SLOP_PX } from "@/lib/vtt/token-press";

/** Toque longo num token (celular) mostra a lista inteira de status. */
export const STATUS_LONG_PRESS_MS = 500;

export interface StatusLongPress {
	start: (tokenId: string, x: number, y: number) => void;
	/** Cancela se o dedo sair da folga de toque (virou arraste/pan). */
	move: (x: number, y: number) => void;
	/** Fim do toque; devolve `true` se o toque longo já disparou. */
	end: () => boolean;
}

export function createStatusLongPress(
	onFire: (tokenId: string) => void,
	timers: {
		set: (fn: () => void, ms: number) => unknown;
		clear: (id: unknown) => void;
	} = {
		set: (fn, ms) => setTimeout(fn, ms),
		clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
	},
): StatusLongPress {
	let timer: unknown = null;
	let origin: { x: number; y: number } | null = null;
	let fired = false;
	const cancel = () => {
		if (timer !== null) timers.clear(timer);
		timer = null;
		origin = null;
	};
	return {
		start(tokenId, x, y) {
			cancel();
			fired = false;
			origin = { x, y };
			timer = timers.set(() => {
				timer = null;
				fired = true;
				onFire(tokenId);
			}, STATUS_LONG_PRESS_MS);
		},
		move(x, y) {
			if (
				origin &&
				timer !== null &&
				Math.hypot(x - origin.x, y - origin.y) > TOKEN_TAP_SLOP_PX
			) {
				cancel();
			}
		},
		end() {
			const didFire = fired;
			cancel();
			fired = false;
			return didFire;
		},
	};
}
