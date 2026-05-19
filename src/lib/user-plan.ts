import type { Tables } from "./database.types";
import { getSupabase, SUPABASE_TABLES } from "./supabase";

export type UserPlan = "free" | "pro";

type UserPlanRow = Tables<"user_plans">;

function isUserPlan(value: unknown): value is UserPlan {
	return value === "free" || value === "pro";
}

export async function loadCurrentUserPlan(userId: string): Promise<UserPlan> {
	const supabase = getSupabase();
	if (!supabase) return "free";

	const { data, error } = await supabase
		.from(SUPABASE_TABLES.userPlans)
		.select("plan")
		.eq("user_id", userId)
		.maybeSingle();

	if (error) throw error;

	const plan = (data as Pick<UserPlanRow, "plan"> | null)?.plan;
	return isUserPlan(plan) ? plan : "free";
}

export function planFromRealtimeRow(row: unknown): UserPlan {
	if (!row || typeof row !== "object" || !("plan" in row)) return "free";
	const plan = (row as Pick<UserPlanRow, "plan">).plan;
	return isUserPlan(plan) ? plan : "free";
}
