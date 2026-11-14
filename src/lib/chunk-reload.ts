/**
 * Versão nova no ar com a aba ainda na antiga: o navegador pede um arquivo com
 * hash que já não existe e a hospedagem responde com a página HTML ("'text/html'
 * is not a valid JavaScript MIME type"). O Vite avisa com `vite:preloadError`;
 * aqui a página se recarrega sozinha para pegar a versão nova.
 *
 * Só uma vez a cada 30 s: se o arquivo realmente estiver faltando, recarregar
 * não adianta e o erro aparece normalmente (sem loop de recarga).
 */
export const CHUNK_RELOAD_KEY = "arkhiveon:chunk-reload-at";
export const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

export function shouldReloadForChunkError(
	now: number,
	lastReloadAt: number | null,
): boolean {
	if (lastReloadAt === null || !Number.isFinite(lastReloadAt)) return true;
	return now - lastReloadAt > CHUNK_RELOAD_COOLDOWN_MS;
}

interface ReloadStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

/** Liga o ouvinte; devolve a função que o desliga. */
export function installChunkReload(
	target: Pick<Window, "addEventListener" | "removeEventListener">,
	storage: ReloadStorage | null,
	reload: () => void,
	now: () => number = Date.now,
): () => void {
	const onPreloadError = (event: Event) => {
		// Sem onde gravar a hora não há trava contra loop de recarga: não arrisca.
		if (!storage) return;
		let last: number | null = null;
		try {
			const raw = storage.getItem(CHUNK_RELOAD_KEY);
			last = raw === null ? null : Number(raw);
		} catch {
			return;
		}
		if (!shouldReloadForChunkError(now(), last)) return;
		try {
			storage.setItem(CHUNK_RELOAD_KEY, String(now()));
		} catch {
			return;
		}
		// Evita que o Vite lance o erro: a página vai recarregar.
		event.preventDefault();
		reload();
	};
	target.addEventListener("vite:preloadError", onPreloadError);
	return () => target.removeEventListener("vite:preloadError", onPreloadError);
}
