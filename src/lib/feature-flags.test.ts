import { afterEach, describe, expect, it, vi } from "vitest";
import { isTransferCampaignOwnershipEnabled } from "./feature-flags";

afterEach(() => {
	vi.unstubAllEnvs();
});

describe("transferir mestre flag", () => {
	it("fica desligada sem variável, inclusive com DEV ligado", () => {
		expect(import.meta.env.DEV).toBe(true);
		expect(isTransferCampaignOwnershipEnabled()).toBe(false);
	});

	it("só liga quando o valor é exatamente true", () => {
		vi.stubEnv("VITE_ENABLE_TRANSFER_CAMPAIGN_OWNERSHIP", "true");
		expect(isTransferCampaignOwnershipEnabled()).toBe(true);
	});

	it("recusa true com outra grafia, 1 e false", () => {
		for (const value of ["TRUE", "True", "1", "false", "yes", "on"]) {
			vi.stubEnv("VITE_ENABLE_TRANSFER_CAMPAIGN_OWNERSHIP", value);
			expect(isTransferCampaignOwnershipEnabled()).toBe(false);
		}
	});
});
