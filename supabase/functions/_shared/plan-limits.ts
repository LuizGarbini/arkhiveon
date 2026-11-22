/**
 * plan-limits — o limite de armazenamento de cada plano (Plano Pro).
 *
 * Constante única, em bytes decimais (as mesmas unidades da Cloudflare).
 * Edge functions e cliente importam daqui. O SQL (`storage_limit` na 0083)
 * repete os mesmos números, e `src/lib/storage/plan-limits.test.ts` confere
 * que os dois batem. Sem dependência de Deno.
 */

export type StoragePlan = "free" | "pro";

export const STORAGE_LIMIT_BYTES: Readonly<Record<StoragePlan, number>> = {
	free: 100_000_000,
	pro: 10_000_000_000,
};

/** Plano desconhecido ou ausente conta como free (igual ao SQL). */
export function storageLimit(plan: string | null | undefined): number {
	return plan === "pro" ? STORAGE_LIMIT_BYTES.pro : STORAGE_LIMIT_BYTES.free;
}

/** Cabe mais `bytes` no uso atual? Igual ao `used + bytes > limit` da reserva. */
export function fitsInQuota(
	used: number,
	bytes: number,
	plan: string | null | undefined,
): boolean {
	return used + bytes <= storageLimit(plan);
}
