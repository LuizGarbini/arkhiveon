import { describe, expect, it, vi } from "vitest";
import { AmmoConsumeOfflineError } from "./consume-ammo";
import { fireAmmoAttack } from "./fire-attack";

const bindings = {
	userId: "user-a",
	campaignId: "camp-a",
	characterId: "char-a",
	inventoryEntryId: "inv-ammo",
};

const id = "11111111-1111-4111-8111-111111111111";

describe("fireAmmoAttack", () => {
	it("bloqueia offline antes de consumir", async () => {
		const consume = vi.fn().mockRejectedValue(new AmmoConsumeOfflineError());
		const complete = vi.fn();
		await expect(
			fireAmmoAttack({
				bindings,
				mergedFormula: "1d8+1d6+3",
				consume,
				complete,
				offline: true,
			}),
		).rejects.toBeInstanceOf(AmmoConsumeOfflineError);
		expect(complete).not.toHaveBeenCalled();
	});

	it("retry do mesmo consumption_id não chama consume com outro id", async () => {
		const consume = vi.fn().mockResolvedValue({
			consumption_id: id,
			quantity: 4,
			snapshot: {},
			roll: null,
			replayed: true,
		});
		const complete = vi.fn().mockResolvedValue({
			consumption_id: id,
			roll: { id, total: 11, formula: "1d8+1d6+3" },
			replayed: false,
		});
		const first = await fireAmmoAttack({
			bindings,
			mergedFormula: "1d8+1d6+3",
			consume,
			complete,
		});
		expect(first.quantity).toBe(4);
		expect(first.roll).toMatchObject({ total: 11 });
		const retry = await fireAmmoAttack({
			bindings,
			mergedFormula: "1d8+1d6+3",
			consume,
			complete,
		});
		expect(retry.consumptionId).toBe(id);
		expect(consume.mock.calls[0]?.[0]?.bindings).toEqual(bindings);
		expect(consume.mock.calls[1]?.[0]?.bindings).toEqual(bindings);
		expect(complete.mock.calls[0]?.[0]?.consumptionId).toBe(id);
		expect(complete.mock.calls[1]?.[0]?.consumptionId).toBe(id);
	});

	it("débito sem rolagem deixa pendingRoll para retomar", async () => {
		const consume = vi.fn().mockResolvedValue({
			consumption_id: id,
			quantity: 0,
			snapshot: {},
			roll: null,
			replayed: false,
		});
		const complete = vi.fn().mockRejectedValue(new AmmoConsumeOfflineError());
		const result = await fireAmmoAttack({
			bindings,
			mergedFormula: "1d6+3",
			consume,
			complete,
		});
		expect(result.quantity).toBe(0);
		expect(result.pendingRoll).toBe(true);
		expect(result.consumptionId).toBe(id);
	});
});
