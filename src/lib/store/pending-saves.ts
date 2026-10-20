/**
 * Saves de ficha ainda em voo. Enquanto houver algum, recarregar ou fechar a
 * aba pede confirmação ao navegador: o save faz leitura + UPDATE e a escrita
 * se perde se a página sair no meio. O listener entra quando o primeiro save
 * começa e sai quando o último termina (sem useEffect).
 */
let pending = 0;

function warnBeforeUnload(event: BeforeUnloadEvent) {
	event.preventDefault();
	// Navegadores antigos exigem returnValue para mostrar o aviso.
	event.returnValue = "";
}

export function trackPendingSave<T>(save: Promise<T>): Promise<T> {
	if (typeof window === "undefined") return save;
	pending += 1;
	if (pending === 1) window.addEventListener("beforeunload", warnBeforeUnload);
	return save.finally(() => {
		pending -= 1;
		if (pending === 0) {
			window.removeEventListener("beforeunload", warnBeforeUnload);
		}
	});
}

export function pendingSaveCount(): number {
	return pending;
}
