import { describe, expect, it, vi } from "vitest";
import {
	CHUNK_RELOAD_COOLDOWN_MS,
	CHUNK_RELOAD_KEY,
	installChunkReload,
	shouldReloadForChunkError,
} from "./chunk-reload";

function memoryStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (k: string) => data.get(k) ?? null,
		setItem: (k: string, v: string) => void data.set(k, v),
	};
}

function fire(target: EventTarget) {
	const event = new Event("vite:preloadError", { cancelable: true });
	target.dispatchEvent(event);
	return event;
}

describe("shouldReloadForChunkError", () => {
	it("recarrega na primeira falha", () => {
		expect(shouldReloadForChunkError(1_000, null)).toBe(true);
	});
	it("não recarrega de novo dentro da trava", () => {
		expect(shouldReloadForChunkError(1_000 + 5_000, 1_000)).toBe(false);
		expect(
			shouldReloadForChunkError(1_000 + CHUNK_RELOAD_COOLDOWN_MS, 1_000),
		).toBe(false);
	});
	it("recarrega depois da trava", () => {
		expect(
			shouldReloadForChunkError(1_000 + CHUNK_RELOAD_COOLDOWN_MS + 1, 1_000),
		).toBe(true);
	});
	it("valor gravado inválido não trava a recarga", () => {
		expect(shouldReloadForChunkError(1_000, Number.NaN)).toBe(true);
	});
});

describe("installChunkReload", () => {
	it("recarrega uma vez, grava a hora e segura o erro do Vite", () => {
		const target = new EventTarget();
		const storage = memoryStorage();
		const reload = vi.fn();
		installChunkReload(target, storage, reload, () => 50_000);
		const event = fire(target);
		expect(reload).toHaveBeenCalledTimes(1);
		expect(storage.getItem(CHUNK_RELOAD_KEY)).toBe("50000");
		expect(event.defaultPrevented).toBe(true);
	});

	it("falhou de novo logo depois: não recarrega e deixa o erro aparecer", () => {
		const target = new EventTarget();
		const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: "50000" });
		const reload = vi.fn();
		installChunkReload(target, storage, reload, () => 60_000);
		const event = fire(target);
		expect(reload).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it("sem storage (bloqueado) não arrisca loop: não recarrega", () => {
		const target = new EventTarget();
		const reload = vi.fn();
		installChunkReload(target, null, reload, () => 1);
		const event = fire(target);
		expect(reload).not.toHaveBeenCalled();
		expect(event.defaultPrevented).toBe(false);
	});

	it("storage que lança erro ao gravar também não recarrega", () => {
		const target = new EventTarget();
		const reload = vi.fn();
		const storage = {
			getItem: () => null,
			setItem: () => {
				throw new Error("cheio");
			},
		};
		installChunkReload(target, storage, reload, () => 1);
		fire(target);
		expect(reload).not.toHaveBeenCalled();
	});

	it("o desligador remove o ouvinte", () => {
		const target = new EventTarget();
		const reload = vi.fn();
		const off = installChunkReload(target, memoryStorage(), reload, () => 1);
		off();
		fire(target);
		expect(reload).not.toHaveBeenCalled();
	});
});
