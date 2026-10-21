import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { UpdateNotice } from "@/components/update-notice";
import { isAndroidApp } from "@/lib/apk-update";
import {
	currentBuildId,
	fetchLatestBuildId,
	shouldOfferWebUpdate,
	WEB_UPDATE_CHECK_INTERVAL_MS,
	WEB_UPDATE_SNOOZE_KEY,
} from "@/lib/web-update";

/**
 * Aviso de nova versão na web: abas abertas antes de um deploy continuam com
 * o código antigo até recarregar. Checa o /version.json ao abrir, a cada
 * 10 min e quando a aba volta a ficar visível. Nunca recarrega sozinho.
 */
export function WebUpdateBanner() {
	const [latest, setLatest] = useState<string | null>(null);
	const lastCheck = useRef(0);

	const check = useCallback(async (force = false) => {
		if (!force && Date.now() - lastCheck.current < 60_000) return;
		lastCheck.current = Date.now();
		try {
			const id = await fetchLatestBuildId();
			const snoozed = sessionStorage.getItem(WEB_UPDATE_SNOOZE_KEY);
			setLatest(
				shouldOfferWebUpdate(currentBuildId(), id, snoozed) ? id : null,
			);
		} catch {
			// offline ou sem version.json (dev): silencioso
		}
	}, []);

	// Efeito externo justificado: inscrição em timer e em visibilitychange do
	// navegador (não há estado React para derivar); limpo ao desmontar.
	useEffect(() => {
		if (import.meta.env.DEV || isAndroidApp()) return;
		void check(true);
		const id = setInterval(
			() => void check(true),
			WEB_UPDATE_CHECK_INTERVAL_MS,
		);
		const onVisible = () => {
			if (document.visibilityState === "visible") void check();
		};
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			clearInterval(id);
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, [check]);

	if (!latest) return null;

	const later = () => {
		sessionStorage.setItem(WEB_UPDATE_SNOOZE_KEY, latest);
		setLatest(null);
	};

	return (
		<UpdateNotice
			label="Atualização do Arkhiveon"
			description="Recarregue para usar a versão mais recente. O que já foi salvo não se perde."
			onClose={later}
			actions={
				<>
					<Button size="sm" onClick={() => window.location.reload()}>
						Atualizar
					</Button>
					<Button size="sm" variant="ghost" onClick={later}>
						Depois
					</Button>
				</>
			}
		/>
	);
}
