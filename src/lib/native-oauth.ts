import { Capacitor } from "@capacitor/core";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Deep link registrado no AndroidManifest (custom_url_scheme). */
export const NATIVE_OAUTH_REDIRECT = "com.arkhiveon.app://auth/callback";

export function isNativePlatform(): boolean {
	try {
		return Capacitor.isNativePlatform();
	} catch {
		return false;
	}
}

export type OAuthCallback =
	| { kind: "code"; code: string }
	| { kind: "tokens"; accessToken: string; refreshToken: string }
	| { kind: "error"; message: string }
	| null;

/** Extrai code (PKCE) ou tokens (implicit) de uma URL de callback. */
export function parseOAuthCallback(url: string): OAuthCallback {
	if (!url.startsWith(NATIVE_OAUTH_REDIRECT)) return null;
	const [beforeHash, hash = ""] = url.split("#");
	const query = beforeHash.includes("?") ? beforeHash.split("?")[1] : "";
	const q = new URLSearchParams(query);
	const h = new URLSearchParams(hash);
	const err =
		q.get("error_description") ??
		h.get("error_description") ??
		q.get("error") ??
		h.get("error");
	if (err) return { kind: "error", message: err };
	const code = q.get("code");
	if (code) return { kind: "code", code };
	const accessToken = h.get("access_token");
	const refreshToken = h.get("refresh_token");
	if (accessToken && refreshToken)
		return { kind: "tokens", accessToken, refreshToken };
	return null;
}

export async function completeNativeOAuth(
	supabase: SupabaseClient,
	url: string,
): Promise<string | null> {
	const parsed = parseOAuthCallback(url);
	if (!parsed) return null;
	if (parsed.kind === "error") return parsed.message;
	const { error } =
		parsed.kind === "code"
			? await supabase.auth.exchangeCodeForSession(parsed.code)
			: await supabase.auth.setSession({
					access_token: parsed.accessToken,
					refresh_token: parsed.refreshToken,
				});
	return error?.message ?? null;
}

/** Escuta o retorno do OAuth no app nativo. Retorna cleanup. */
export function listenNativeOAuth(supabase: SupabaseClient): () => void {
	if (!isNativePlatform()) return () => {};
	let removed = false;
	let remove: (() => void) | undefined;
	void (async () => {
		const { App } = await import("@capacitor/app");
		const { Browser } = await import("@capacitor/browser");
		const handle = async (url: string) => {
			if (!parseOAuthCallback(url)) return;
			const err = await completeNativeOAuth(supabase, url);
			if (err) console.error("[oauth] callback:", err);
			try {
				await Browser.close();
			} catch {
				/* já fechado */
			}
			if (!err && !window.location.pathname.startsWith("/dashboard")) {
				window.location.assign("/dashboard");
			}
		};
		const launch = await App.getLaunchUrl();
		if (launch?.url) void handle(launch.url);
		const sub = await App.addListener("appUrlOpen", (e) => void handle(e.url));
		if (removed) void sub.remove();
		else remove = () => void sub.remove();
	})();
	return () => {
		removed = true;
		remove?.();
	};
}

/** Abre o OAuth no Custom Tab e volta via deep link. */
export async function startNativeOAuth(
	supabase: SupabaseClient,
	provider: "google" | "discord" | "github",
): Promise<string | null> {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider,
		options: { redirectTo: NATIVE_OAUTH_REDIRECT, skipBrowserRedirect: true },
	});
	if (error) return error.message;
	if (!data?.url) return "URL de login não retornada.";
	const { Browser } = await import("@capacitor/browser");
	await Browser.open({ url: data.url });
	return null;
}
