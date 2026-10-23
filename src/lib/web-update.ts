/** Aviso de nova versão no navegador (web). O app Android usa o APK. */
export const WEB_VERSION_URL = "/version.json";
export const WEB_UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
export const WEB_UPDATE_SNOOZE_KEY = "arkhiveon_web_update_snoozed";

export function currentBuildId(): string {
	return import.meta.env.VITE_APP_BUILD_ID ?? "";
}

export function parseBuildId(body: unknown): string | null {
	if (typeof body !== "object" || body === null) return null;
	const id = (body as { buildId?: unknown }).buildId;
	return typeof id === "string" && id.trim() ? id.trim() : null;
}

/** Há versão nova se o deploy publicou outro build e ele não foi adiado. */
export function shouldOfferWebUpdate(
	current: string,
	latest: string | null,
	snoozed: string | null,
): boolean {
	if (!current || !latest) return false;
	if (latest === current) return false;
	return latest !== snoozed;
}

export async function fetchLatestBuildId(
	fetcher: typeof fetch = fetch,
): Promise<string | null> {
	const res = await fetcher(`${WEB_VERSION_URL}?t=${Date.now()}`, {
		cache: "no-store",
	});
	if (!res.ok) return null;
	return parseBuildId(await res.json());
}
