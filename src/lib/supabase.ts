import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * Supabase — cliente compartilhado.
 *
 * Se as variáveis não existirem, `getSupabase()` retorna null para preservar
 * o modo offline/local durante desenvolvimento.
 */

export interface SupabaseConfig {
	url: string;
	key: string;
}

/** Lê e valida as variáveis de ambiente. Retorna null se incompletas. */
export function getSupabaseConfig(): SupabaseConfig | null {
	const rawUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
	const rawKey = (import.meta.env.VITE_SUPABASE_KEY ||
		import.meta.env.VITE_SUPABASE_ANON_KEY) as string | undefined;
	const url = rawUrl?.trim();
	const key = rawKey?.trim();

	if (!url || !key) return null;
	try {
		const parsedUrl = new URL(url);
		if (!["http:", "https:"].includes(parsedUrl.protocol)) return null;
	} catch {
		return null;
	}
	return { url, key };
}

/**
 * Indicador de prontidão. UI pode esconder botões de "sincronizar" enquanto
 * o Supabase não estiver configurado.
 */
export function isSupabaseConfigured(): boolean {
	return getSupabaseConfig() !== null;
}

let client: SupabaseClient<Database> | null | undefined;

/** Cliente lazy e null-safe para chamadas ao banco/Auth. */
export function getSupabase(): SupabaseClient<Database> | null {
	if (client !== undefined) return client;

	const config = getSupabaseConfig();
	if (!config) {
		client = null;
		return client;
	}

	client = createClient<Database>(config.url, config.key, {
		auth: {
			autoRefreshToken: true,
			persistSession: true,
		},
	});

	return client;
}

/** Conveniência para imports simples. Pode ser null se o env não estiver pronto. */
export const supabase = getSupabase();

/**
 * Convenções de buckets/tabelas — espelham as entidades do store.
 * Centralizadas aqui pra evitar typos espalhados pelo código.
 */
export const SUPABASE_TABLES = {
	characters: "characters",
	npcs: "npcs",
	sessions: "sessions",
	items: "items",
	locations: "locations",
	lores: "lores",
	activity: "activity_log",
	campaigns: "campaigns",
	userPlans: "user_plans",
} as const;

export const SUPABASE_BUCKETS = {
	images: "rpg-images", // bucket único para todos os uploads
} as const;
