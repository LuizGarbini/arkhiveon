import { storageLimit } from "../../../supabase/functions/_shared/plan-limits";

/** Prazo de graça após estourar a cota (S6). */
export const OVER_LIMIT_GRACE_DAYS = 60;

export type StorageLabel = "free" | "pro" | "guest_pro";
export type StorageContextStatus = "loading" | "ready" | "error";
export type StorageUsageLevel = "ok" | "80" | "95" | "100" | "over";

/**
 * Contexto de cota que o card da sidebar consome.
 * Fonte provisória: user_plans (mesmo número que a sidebar já mostrava).
 * Depois da S1b/S2/S3, trocar só o hook para my_storage_context / storage_objects.
 * usedPdfs / usedImages ficam null enquanto essa fonte não tiver o recorte.
 */
export interface StorageContext {
	status: StorageContextStatus;
	label: StorageLabel;
	usedBytes: number;
	limitBytes: number;
	usedPdfs: number | null;
	usedImages: number | null;
	overLimitSince: string | null;
	payerName: string | null;
}

const KB = 1_000;
const MB = 1_000_000;
const GB = 1_000_000_000;

export function formatStorageBytes(
	bytes: number,
	unit?: "GB" | "MB" | "KB",
): string {
	const u = unit ?? (bytes >= GB ? "GB" : bytes >= MB ? "MB" : "KB");
	const n = u === "GB" ? bytes / GB : u === "MB" ? bytes / MB : bytes / KB;
	const s =
		n >= 100 || u === "KB"
			? Math.round(n).toLocaleString("pt-BR")
			: n.toLocaleString("pt-BR", {
					minimumFractionDigits: 1,
					maximumFractionDigits: 1,
				});
	return `${s} ${u}`;
}

export function limitLabel(limitBytes: number): string {
	return limitBytes >= GB ? "10 GB" : "100 MB";
}

/** Uso à direita do selo. Acima do limite mostra só o uso, sem o denominador. */
export function shortUsage(
	ctx: Pick<StorageContext, "usedBytes" | "limitBytes" | "overLimitSince">,
): string {
	if (ctx.usedBytes > ctx.limitBytes) {
		return formatStorageBytes(ctx.usedBytes);
	}
	if (ctx.limitBytes >= GB) {
		return `${formatStorageBytes(ctx.usedBytes, "GB").replace(" GB", "")} / 10 GB`;
	}
	return `${formatStorageBytes(ctx.usedBytes, "MB").replace(" MB", "")} / 100 MB`;
}

export function usagePercent(usedBytes: number, limitBytes: number): number {
	if (limitBytes <= 0) return 0;
	return Math.round((usedBytes / limitBytes) * 100);
}

export function usageLevel(
	ctx: Pick<StorageContext, "usedBytes" | "limitBytes" | "overLimitSince">,
): StorageUsageLevel {
	if (ctx.usedBytes > ctx.limitBytes) return "over";
	const p = ctx.limitBytes <= 0 ? 0 : ctx.usedBytes / ctx.limitBytes;
	if (p >= 1) return "100";
	if (p >= 0.95) return "95";
	if (p >= 0.8) return "80";
	return "ok";
}

export function overLimitDaysRemaining(
	since: string | null,
	nowMs = Date.now(),
): number | null {
	if (!since) return null;
	const start = Date.parse(since);
	if (Number.isNaN(start)) return null;
	const elapsed = Math.floor((nowMs - start) / 86_400_000);
	return Math.max(0, OVER_LIMIT_GRACE_DAYS - elapsed);
}

/** Texto curto do estado. O estado nunca depende só de cor. */
export function statusText(
	ctx: Pick<StorageContext, "usedBytes" | "limitBytes" | "overLimitSince">,
	nowMs = Date.now(),
): string | null {
	const level = usageLevel(ctx);
	if (level === "80" || level === "95") {
		return `${usagePercent(ctx.usedBytes, ctx.limitBytes)}%`;
	}
	if (level === "100") return "Cheio";
	if (level === "over") {
		const days = overLimitDaysRemaining(ctx.overLimitSince, nowMs);
		return days === null ? "Acima" : `Acima · ${days} dias`;
	}
	return null;
}

export function planLabel(label: StorageLabel): string {
	if (label === "pro") return "Pro";
	if (label === "guest_pro") return "Convidado Pro";
	return "Free";
}

export function isUsageBad(level: StorageUsageLevel): boolean {
	return level === "95" || level === "100" || level === "over";
}

export { storageLimit };
