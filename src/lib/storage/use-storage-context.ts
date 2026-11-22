import { useAuth } from "@/lib/auth";
import { type StorageContext, storageLimit } from "./storage-context";

const PREVIEW_STORAGE_KEY = "arkhiveon_preview_storage";

function isLocalPreviewHost(): boolean {
	if (typeof window === "undefined") return false;
	const host = window.location.hostname;
	return host === "localhost" || host === "127.0.0.1";
}

function isStorageLabel(value: unknown): value is StorageContext["label"] {
	return value === "free" || value === "pro" || value === "guest_pro";
}

function isStorageStatus(value: unknown): value is StorageContext["status"] {
	return value === "loading" || value === "ready" || value === "error";
}

/**
 * Lê um contexto injetado só no preview local (Supabase falso).
 * Produção nunca entra aqui.
 */
function readPreviewOverride(): StorageContext | null {
	if (!isLocalPreviewHost()) return null;
	const raw = window.localStorage.getItem(PREVIEW_STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== "object") return null;
		const row = parsed as Record<string, unknown>;
		if (!isStorageStatus(row.status) || !isStorageLabel(row.label)) return null;
		const usedBytes = Number(row.usedBytes);
		const limitBytes = Number(row.limitBytes);
		if (!Number.isFinite(usedBytes) || !Number.isFinite(limitBytes))
			return null;
		return {
			status: row.status,
			label: row.label,
			usedBytes,
			limitBytes,
			usedPdfs: typeof row.usedPdfs === "number" ? row.usedPdfs : null,
			usedImages: typeof row.usedImages === "number" ? row.usedImages : null,
			overLimitSince:
				typeof row.overLimitSince === "string" ? row.overLimitSince : null,
			payerName: typeof row.payerName === "string" ? row.payerName : null,
		};
	} catch {
		return null;
	}
}

const LOADING_CONTEXT: StorageContext = {
	status: "loading",
	label: "free",
	usedBytes: 0,
	limitBytes: storageLimit("free"),
	usedPdfs: null,
	usedImages: null,
	overLimitSince: null,
	payerName: null,
};

/**
 * Fonte provisória da cota na UI: o mesmo user_plans.storage_used_bytes
 * que a sidebar já lia (via useAuth / loadCurrentUserPlan).
 *
 * Isolada aqui para, depois da S1b/S2/S3, trocar só este hook para somar
 * storage_objects / my_storage_context (aí usedPdfs e usedImages passam
 * a vir preenchidos). Não chame my_storage_context ainda: a tabela ainda
 * não foi preenchida e o RPC devolveria 0.
 */
export function useStorageContext(): StorageContext {
	const preview = readPreviewOverride();
	const {
		user,
		plan,
		storageUsedBytes,
		planLoading,
		planStatus,
		overLimitSince,
	} = useAuth();

	if (preview) return preview;

	if (!user || planLoading || planStatus === "loading") {
		return LOADING_CONTEXT;
	}

	if (planStatus === "error") {
		return {
			...LOADING_CONTEXT,
			status: "error",
			limitBytes: storageLimit(plan),
		};
	}

	return {
		status: "ready",
		label: plan === "pro" ? "pro" : "free",
		usedBytes: storageUsedBytes,
		limitBytes: storageLimit(plan),
		usedPdfs: null,
		usedImages: null,
		overLimitSince,
		payerName: null,
	};
}
