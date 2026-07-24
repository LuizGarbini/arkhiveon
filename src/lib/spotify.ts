/**
 * Spotify OAuth PKCE Flow & API Helpers
 */

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";
const CONFIGURED_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || "";
const SPOTIFY_REDIRECT_URI_STORAGE_KEY = "spotify_redirect_uri";

function getSpotifyRedirectUri() {
	if (typeof window === "undefined") {
		return CONFIGURED_REDIRECT_URI;
	}

	const currentOriginRedirect = `${window.location.origin}/spotify-callback`;
	return CONFIGURED_REDIRECT_URI || currentOriginRedirect;
}

/**
 * Gera uma string aleatória para o code_verifier
 */
export function generateRandomString(length: number): string {
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const values = crypto.getRandomValues(new Uint8Array(length));
	return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

/**
 * Faz o hash SHA-256 do verifier
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
	const encoder = new TextEncoder();
	const data = encoder.encode(plain);
	return window.crypto.subtle.digest("SHA-256", data);
}

/**
 * Encodação Base64URL
 */
function base64urlencode(a: ArrayBuffer): string {
	return btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(a))))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/**
 * Inicia o fluxo de autorização do Spotify
 */
export async function redirectToSpotifyAuth() {
	if (!SPOTIFY_CLIENT_ID) {
		console.error("VITE_SPOTIFY_CLIENT_ID não configurado.");
		return;
	}

	const verifier = generateRandomString(64);
	const hashed = await sha256(verifier);
	const challenge = base64urlencode(hashed);
	const state = generateRandomString(16);

	window.localStorage.setItem("spotify_code_verifier", verifier);
	window.localStorage.setItem("spotify_auth_state", state);

	const scope =
		"user-read-private user-read-email user-read-playback-state user-read-currently-playing user-modify-playback-state";

	const authUrl = new URL("https://accounts.spotify.com/authorize");
	const redirectUri = getSpotifyRedirectUri();
	window.localStorage.setItem(SPOTIFY_REDIRECT_URI_STORAGE_KEY, redirectUri);

	const params = {
		response_type: "code",
		client_id: SPOTIFY_CLIENT_ID,
		scope: scope,
		code_challenge_method: "S256",
		code_challenge: challenge,
		redirect_uri: redirectUri,
		state: state,
	};

	authUrl.search = new URLSearchParams(params).toString();
	window.location.href = authUrl.toString();
}

/**
 * Troca o código de autorização pelo Access Token
 */
export async function getSpotifyToken(code: string): Promise<any> {
	const verifier = window.localStorage.getItem("spotify_code_verifier");
	const redirectUri =
		window.localStorage.getItem(SPOTIFY_REDIRECT_URI_STORAGE_KEY) ||
		getSpotifyRedirectUri();

	const params = new URLSearchParams({
		client_id: SPOTIFY_CLIENT_ID,
		grant_type: "authorization_code",
		code: code,
		redirect_uri: redirectUri,
		code_verifier: verifier || "",
	});

	const response = await fetch("https://accounts.spotify.com/api/token", {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
		},
		body: params,
	});

	const data = await response.json();

	if (!response.ok || data.error || !data.access_token) {
		throw new Error(
			data.error_description ||
				data.error ||
				`Erro ao conectar Spotify: ${response.status}`,
		);
	}

	return data;
}

/**
 * Busca o perfil do usuário
 */
export async function getUserProfile(accessToken: string) {
	const response = await fetch("https://api.spotify.com/v1/me", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		let errorDetails = "";
		try {
			const errorBody = await response.json();
			errorDetails = JSON.stringify(errorBody);
		} catch (e) {
			errorDetails = "Não foi possível ler o corpo do erro.";
		}

		console.error(`Erro Spotify (${response.status}):`, errorDetails);
		throw new Error(
			`Erro ao buscar perfil (${response.status}): ${errorDetails}`,
		);
	}

	return response.json();
}

/**
 * Busca o estado atual de reprodução (opcional)
 */
export async function getCurrentlyPlaying(accessToken: string) {
	const playerResponse = await fetch("https://api.spotify.com/v1/me/player", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (playerResponse.status === 401) {
		throw new Error("SPOTIFY_UNAUTHORIZED");
	}

	if (playerResponse.ok) {
		return playerResponse.json();
	}

	if (playerResponse.status !== 204) {
		throw new Error(`Erro ao buscar reprodução: ${playerResponse.status}`);
	}

	const currentlyPlayingResponse = await fetch(
		"https://api.spotify.com/v1/me/player/currently-playing",
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);

	if (currentlyPlayingResponse.status === 204) {
		return null;
	}

	if (currentlyPlayingResponse.status === 401) {
		throw new Error("SPOTIFY_UNAUTHORIZED");
	}

	if (!currentlyPlayingResponse.ok) {
		throw new Error(
			`Erro ao buscar música atual: ${currentlyPlayingResponse.status}`,
		);
	}

	return currentlyPlayingResponse.json();
}

/**
 * Ajusta o volume do dispositivo ativo do usuário autenticado.
 */
export async function setSpotifyVolume(
	accessToken: string,
	volumePercent: number,
) {
	const safeVolume = Math.max(0, Math.min(100, Math.round(volumePercent)));
	const response = await fetch(
		`https://api.spotify.com/v1/me/player/volume?volume_percent=${safeVolume}`,
		{
			method: "PUT",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		},
	);

	if (response.status === 401) {
		throw new Error("SPOTIFY_UNAUTHORIZED");
	}

	if (!response.ok && response.status !== 204) {
		throw new Error(`Erro ao ajustar volume: ${response.status}`);
	}
}
