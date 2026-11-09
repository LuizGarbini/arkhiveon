import type { Json } from "@/lib/database.types";
import {
	type AmmoConsumeBindings,
	AmmoConsumeOfflineError,
	completeAmmoConsumptionRoll,
	consumeAmmo,
} from "./consume-ammo";

export type FireAmmoAttackResult = {
	consumptionId: string;
	quantity: number | null;
	roll: Json | null;
	pendingRoll: boolean;
};

/**
 * Disparo: debita 1 unidade e só então retoma a rolagem no mesmo consumption_id.
 * Retry reusa o id — o segundo clique não gasta de novo.
 */
export async function fireAmmoAttack(input: {
	bindings: AmmoConsumeBindings;
	mergedFormula: string;
	sceneId?: string | null;
	label?: string | null;
	consume?: typeof consumeAmmo;
	complete?: typeof completeAmmoConsumptionRoll;
	offline?: boolean;
}): Promise<FireAmmoAttackResult> {
	const consume = input.consume ?? consumeAmmo;
	const complete = input.complete ?? completeAmmoConsumptionRoll;
	const consumed = await consume({
		bindings: input.bindings,
		mergedFormula: input.mergedFormula,
		offline: input.offline,
	});
	if (consumed.roll) {
		return {
			consumptionId: consumed.consumption_id,
			quantity: consumed.quantity,
			roll: consumed.roll,
			pendingRoll: false,
		};
	}
	try {
		const rolled = await complete({
			bindings: input.bindings,
			consumptionId: consumed.consumption_id,
			sceneId: input.sceneId,
			label: input.label ?? "Disparo",
			offline: input.offline,
		});
		return {
			consumptionId: consumed.consumption_id,
			quantity: consumed.quantity,
			roll: rolled.roll,
			pendingRoll: false,
		};
	} catch (error) {
		if (error instanceof AmmoConsumeOfflineError) {
			return {
				consumptionId: consumed.consumption_id,
				quantity: consumed.quantity,
				roll: null,
				pendingRoll: true,
			};
		}
		throw error;
	}
}
