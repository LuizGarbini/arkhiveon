import { getSupabase, getSupabaseConfig } from "./supabase";

export function extractR2Key(urlOrKey: string): string | null {
	const trimmed = urlOrKey.trim();
	if (!trimmed) return null;

	if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
		return trimmed.replace(/^\/+/, "");
	}

	const publicUrl = import.meta.env.VITE_R2_PUBLIC_URL?.replace(/\/$/, "");
	if (!publicUrl || !trimmed.startsWith(`${publicUrl}/`)) {
		return null;
	}

	return trimmed.slice(publicUrl.length + 1);
}

export function isR2PublicUrl(url: string): boolean {
	return extractR2Key(url) !== null;
}

export async function fetchR2ImageBlob(key: string): Promise<Blob> {
	const supabase = getSupabase();
	const config = getSupabaseConfig();
	if (!supabase || !config) {
		throw new Error("Supabase não configurado.");
	}

	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session?.access_token) {
		throw new Error("Sessão expirada. Faça login novamente.");
	}

	const response = await fetch(`${config.url}/functions/v1/r2-fetch`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${session.access_token}`,
			apikey: config.key,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ key }),
	});

	if (!response.ok) {
		let message = "Falha ao carregar imagem para recorte.";
		try {
			const payload = (await response.json()) as { error?: string };
			if (payload.error) message = payload.error;
		} catch {
			// ignore parse errors
		}
		throw new Error(message);
	}

	return response.blob();
}

export async function resolveImageSourceForCrop(source: string): Promise<{
	src: string;
	revokeWhenDone: boolean;
}> {
	if (source.startsWith("blob:") || source.startsWith("data:")) {
		return { src: source, revokeWhenDone: false };
	}

	const key = extractR2Key(source);
	if (key) {
		const blob = await fetchR2ImageBlob(key);
		return {
			src: URL.createObjectURL(blob),
			revokeWhenDone: true,
		};
	}

	return { src: source, revokeWhenDone: false };
}
