/**
 * URLs assinadas das capas prontas, em lote, sem N+1.
 * pending/failed não entram no pedido. Erro (ex.: 403) = sem URL, ícone.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { type LibraryFile, requestLibraryThumbReads } from "./library-storage";

const EXPIRY_SKEW_MS = 30_000;

export function useLibraryThumbUrls(
	campaignId: string,
	files: readonly LibraryFile[],
): { urls: Record<string, string>; loadingIds: ReadonlySet<string> } {
	const readyKey = useMemo(
		() =>
			files
				.filter((file) => file.thumbStatus === "ready")
				.map((file) => file.id)
				.join(","),
		[files],
	);
	const [urls, setUrls] = useState<Record<string, string>>({});
	const [loadingIds, setLoadingIds] = useState<ReadonlySet<string>>(
		() => new Set(),
	);
	const [refreshToken, setRefreshToken] = useState(0);
	const cacheRef = useRef(
		new Map<string, { url: string; expiresAt: number }>(),
	);
	const campaignRef = useRef(campaignId);

	useEffect(() => {
		const cycle = refreshToken;
		if (campaignRef.current !== campaignId) {
			campaignRef.current = campaignId;
			cacheRef.current.clear();
		}

		const readyIds = readyKey === "" ? [] : readyKey.split(",");
		const now = Date.now();
		const missing: string[] = [];
		const next: Record<string, string> = {};
		for (const id of readyIds) {
			const cached = cacheRef.current.get(id);
			if (cached && cached.expiresAt - EXPIRY_SKEW_MS > now) {
				next[id] = cached.url;
			} else {
				missing.push(id);
			}
		}
		setUrls(next);

		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;

		function scheduleRefresh() {
			let soonest = Number.POSITIVE_INFINITY;
			for (const id of readyIds) {
				const cached = cacheRef.current.get(id);
				if (cached) soonest = Math.min(soonest, cached.expiresAt);
			}
			if (!Number.isFinite(soonest)) return;
			const delay = Math.max(5_000, soonest - EXPIRY_SKEW_MS - Date.now());
			timer = setTimeout(
				() => setRefreshToken((token) => token + 1),
				delay,
			);
		}

		if (missing.length === 0) {
			if (cycle >= 0) scheduleRefresh();
			return () => {
				if (timer !== undefined) clearTimeout(timer);
			};
		}

		setLoadingIds(new Set(missing));
		void requestLibraryThumbReads(campaignId, missing)
			.then((result) => {
				if (cancelled) return;
				const ttlMs = Math.max(0, result.expiresIn * 1000);
				const expiresAt = Date.now() + ttlMs;
				const merged: Record<string, string> = { ...next };
				for (const [id, url] of Object.entries(result.urls)) {
					cacheRef.current.set(id, { url, expiresAt });
					merged[id] = url;
				}
				setUrls(merged);
			})
			.catch(() => {
				// Sem URL: o card mostra o ícone. Não interrompe a lista.
			})
			.finally(() => {
				if (cancelled) return;
				setLoadingIds(new Set());
				scheduleRefresh();
			});

		return () => {
			cancelled = true;
			if (timer !== undefined) clearTimeout(timer);
		};
	}, [campaignId, readyKey, refreshToken]);

	return { urls, loadingIds };
}
