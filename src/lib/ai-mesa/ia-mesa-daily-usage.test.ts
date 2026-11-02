import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
	join(
		dirname(fileURLToPath(import.meta.url)),
		"../../../supabase/migrations/0057_ia_mesa_daily_usage.sql",
	),
	"utf8",
);

function refundFunctionSql(sql: string): string {
	const marker = "function public.ia_mesa_refund_daily_request";
	const start = sql.indexOf(marker);
	if (start < 0) return "";
	const end = sql.indexOf("commit;", start);
	return sql.slice(start, end === -1 ? undefined : end);
}

describe("ia_mesa_refund_daily_request", () => {
	it("decrementa o dia de São Paulo sem ficar negativo e só o service_role executa", () => {
		const fn = refundFunctionSql(migration);
		expect(fn).toContain("p_campaign_id uuid");
		expect(fn).toMatch(/returns boolean/i);
		expect(fn).toMatch(/language plpgsql/i);
		expect(fn).toMatch(/security definer/i);
		expect(fn).toContain("set search_path = public");
		expect(fn).toContain("America/Sao_Paulo");
		expect(fn).toContain("update public.ia_mesa_daily_usage");
		expect(fn).toContain("request_count = request_count - 1");
		expect(fn).toContain("request_count > 0");
		expect(fn).toContain("usage_day");
		expect(fn).toMatch(
			/revoke all on function public\.ia_mesa_refund_daily_request\(uuid\) from public, anon, authenticated;/i,
		);
		expect(fn).toMatch(
			/grant execute on function public\.ia_mesa_refund_daily_request\(uuid\) to service_role;/i,
		);
		expect(fn).not.toMatch(
			/grant execute on function public\.ia_mesa_refund_daily_request\(uuid\) to (anon|authenticated|public);/i,
		);
		expect(migration).toMatch(
			/create or replace function public\.ia_mesa_refund_daily_request/i,
		);
	});
});
