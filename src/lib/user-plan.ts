import type { Tables } from "./database.types";
import { getSupabase, SUPABASE_TABLES } from "./supabase";

export type UserPlan = "free" | "pro";

type UserPlanRow = Tables<"user_plans">;

export interface UserPlanData {
	plan: UserPlan;
	storageUsedBytes: number;
	overLimitSince: string | null;
}

function isUserPlan(value: unknown): value is UserPlan {
	return value === "free" || value === "pro";
}

function readOverLimitSince(row: unknown): string | null {
	if (!row || typeof row !== "object" || !("over_limit_since" in row)) {
		return null;
	}
	const value = (row as { over_limit_since?: unknown }).over_limit_since;
	return typeof value === "string" && value.length > 0 ? value : null;
}

const EMPTY_PLAN: UserPlanData = {
	plan: "free",
	storageUsedBytes: 0,
	overLimitSince: null,
};

export async function loadCurrentUserPlan(
	userId: string,
): Promise<UserPlanData> {
	const supabase = getSupabase();
	if (!supabase) return EMPTY_PLAN;

	const { data, error } = await supabase
		.from(SUPABASE_TABLES.userPlans)
		.select("plan, storage_used_bytes, over_limit_since")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) throw error;

	const plan = data?.plan;
	const storageUsedBytes = data?.storage_used_bytes ?? 0;
	return {
		plan: isUserPlan(plan) ? plan : "free",
		storageUsedBytes,
		overLimitSince: readOverLimitSince(data),
	};
}

export function planFromRealtimeRow(row: unknown): UserPlanData {
	if (!row || typeof row !== "object") return EMPTY_PLAN;
	const plan = "plan" in row ? (row as Pick<UserPlanRow, "plan">).plan : "free";
	const storageUsedBytes =
		"storage_used_bytes" in row
			? Number((row as { storage_used_bytes?: unknown }).storage_used_bytes) ||
				0
			: 0;
	return {
		plan: isUserPlan(plan) ? plan : "free",
		storageUsedBytes,
		overLimitSince: readOverLimitSince(row),
	};
}
