import { describe, expect, it } from "vitest";
import {
	formatStorageBytes,
	overLimitDaysRemaining,
	planLabel,
	shortUsage,
	statusText,
	usageLevel,
} from "./storage-context";

const free = 100_000_000;
const pro = 10_000_000_000;

describe("storage-context", () => {
	it("formata em bytes decimais, pt-BR", () => {
		expect(formatStorageBytes(38_400_000, "MB")).toBe("38,4 MB");
		expect(formatStorageBytes(1_310_000_000, "GB")).toBe("1,3 GB");
	});

	it("limites oficiais: 100 MB free e 10 GB Pro", () => {
		expect(
			shortUsage({
				usedBytes: 38_400_000,
				limitBytes: free,
				overLimitSince: null,
			}),
		).toBe("38,4 / 100 MB");
		expect(
			shortUsage({
				usedBytes: 1_310_000_000,
				limitBytes: pro,
				overLimitSince: null,
			}),
		).toBe("1,3 / 10 GB");
	});

	it("80% é aviso, 95%/100%/acima são críticos", () => {
		const base = { overLimitSince: null as string | null, limitBytes: free };
		expect(usageLevel({ ...base, usedBytes: 79_000_000 })).toBe("ok");
		expect(usageLevel({ ...base, usedBytes: 81_000_000 })).toBe("80");
		expect(usageLevel({ ...base, usedBytes: 96_000_000 })).toBe("95");
		expect(usageLevel({ ...base, usedBytes: 100_000_000 })).toBe("100");
		expect(usageLevel({ ...base, usedBytes: 124_000_000 })).toBe("over");
		expect(statusText({ ...base, usedBytes: 81_000_000 })).toBe("81%");
		expect(statusText({ ...base, usedBytes: 96_000_000 })).toBe("96%");
		expect(statusText({ ...base, usedBytes: 100_000_000 })).toBe("Cheio");
	});

	it("Acima · N dias conta o que resta na janela de 60 dias", () => {
		const now = Date.parse("2026-11-22T20:00:00-03:00");
		const since = new Date(now - 17 * 86_400_000).toISOString();
		expect(overLimitDaysRemaining(since, now)).toBe(43);
		expect(
			statusText(
				{ usedBytes: 124_000_000, limitBytes: free, overLimitSince: since },
				now,
			),
		).toBe("Acima · 43 dias");
	});

	it("rótulos completos, sem abreviação", () => {
		expect(planLabel("free")).toBe("Free");
		expect(planLabel("pro")).toBe("Pro");
		expect(planLabel("guest_pro")).toBe("Convidado Pro");
	});
});
