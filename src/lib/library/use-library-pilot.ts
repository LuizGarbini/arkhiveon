import { useEffect, useState } from "react";
import { fetchLibraryPilot } from "./library-storage";

/**
 * null = ainda verificando; false = fora do piloto (nada aparece);
 * true = Biblioteca liberada. Busca no Supabase (efeito externo).
 */
export function useLibraryPilot(campaignId: string | null | undefined) {
	const [state, setState] = useState<{ id: string; enabled: boolean } | null>(
		null,
	);
	useEffect(() => {
		if (!campaignId) return;
		let cancelled = false;
		void fetchLibraryPilot(campaignId).then((enabled) => {
			if (!cancelled) setState({ id: campaignId, enabled });
		});
		return () => {
			cancelled = true;
		};
	}, [campaignId]);
	if (!campaignId) return false;
	return state?.id === campaignId ? state.enabled : null;
}
