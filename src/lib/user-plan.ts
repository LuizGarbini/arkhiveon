import type { Tables } from "./database.types";
import { getSupabase, SUPABASE_TABLES } from "./supabase";

export type UserPlan = "free" | "pro";

type UserPlanRow = Tables<"user_plans">;

export interface UserPlanData {
	plan: UserPlan;
	storageUsedBytes: number;
}

function isUserPlan(value: unknown): value is UserPlan {
	return value === "free" || value === "pro";
}

export async function loadCurrentUserPlan(
	userId: string,
): Promise<UserPlanData> {
	const supabase = getSupabase();
	if (!supabase) return { plan: "free", storageUsedBytes: 0 };

	const { data, error } = await supabase
		.from(SUPABASE_TABLES.userPlans)
		.select("plan, storage_used_bytes")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) throw error;

	const plan = (data as any)?.plan;
	const storageUsedBytes = (data as any)?.storage_used_bytes ?? 0;
	return {
		plan: isUserPlan(plan) ? plan : "free",
		storageUsedBytes,
	};
}

export function planFromRealtimeRow(row: unknown): UserPlanData {
	if (!row || typeof row !== "object")
		return { plan: "free", storageUsedBytes: 0 };
	const plan = "plan" in row ? (row as Pick<UserPlanRow, "plan">).plan : "free";
	const storageUsedBytes =
		"storage_used_bytes" in row
			? Number((row as any).storage_used_bytes) || 0
			: 0;
	return {
		plan: isUserPlan(plan) ? plan : "free",
		storageUsedBytes,
	};
}
