import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	fitsInQuota,
	STORAGE_LIMIT_BYTES,
	storageLimit,
} from "../../../supabase/functions/_shared/plan-limits";

const rpcSql = readFileSync(
	resolve(__dirname, "../../../supabase/migrations/0083_storage_rpcs.sql"),
	"utf8",
);

describe("plan-limits", () => {
	it("free 100 MB e pro 10 GB, em bytes decimais", () => {
		expect(STORAGE_LIMIT_BYTES).toEqual({
			free: 100_000_000,
			pro: 10_000_000_000,
		});
	});

	it("plano desconhecido conta como free", () => {
		expect(storageLimit("pro")).toBe(10_000_000_000);
		expect(storageLimit("free")).toBe(100_000_000);
		expect(storageLimit(null)).toBe(100_000_000);
		expect(storageLimit("enterprise")).toBe(100_000_000);
	});

	it("SQL (storage_limit da 0083) e TS usam os mesmos números", () => {
		const match = rpcSql.match(
			/when p_plan = 'pro' then (\d+)::bigint else (\d+)::bigint/,
		);
		expect(match).not.toBeNull();
		expect(Number(match?.[1])).toBe(STORAGE_LIMIT_BYTES.pro);
		expect(Number(match?.[2])).toBe(STORAGE_LIMIT_BYTES.free);
	});

	it("CA2: limite exato (cabe até igualar, estoura com 1 byte a mais)", () => {
		expect(fitsInQuota(99_999_000, 2_000, "free")).toBe(false);
		expect(fitsInQuota(99_999_000, 1_000, "free")).toBe(true);
		expect(fitsInQuota(9_999_999_000, 2_000, "pro")).toBe(false);
		expect(fitsInQuota(9_999_999_000, 1_000, "pro")).toBe(true);
	});
});
