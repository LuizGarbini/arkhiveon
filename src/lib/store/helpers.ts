import type { ActivityEntry } from "./types";
import { RPG_SYSTEMS } from "./types";

export const MAX_ACTIVITY = 200;

export const generateEntry = <T extends object>(
	defaults: T,
	data: Partial<T>,
): T & { id: string; createdAt: number } => ({
	...defaults,
	...data,
	id: crypto.randomUUID(),
	createdAt: Date.now(),
});

export function pushLog(
	log: ActivityEntry[],
	entry: Omit<ActivityEntry, "id" | "timestamp"> & {
		id?: string;
		timestamp?: number;
	},
): ActivityEntry[] {
	const next: ActivityEntry = {
		...entry,
		id: entry.id || crypto.randomUUID(),
		timestamp: entry.timestamp || Date.now(),
	} as ActivityEntry;
	return [next, ...log].slice(0, MAX_ACTIVITY);
}

export function entityNameOf(e: object, fallback = "Sem nome"): string {
	const o = e as Record<string, unknown>;
	const candidates = [o.characterName, o.name, o.title];
	for (const c of candidates) {
		if (typeof c === "string" && c.trim()) return c.trim();
	}
	return fallback;
}

export function abilityModifier(score: number): number {
	return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
	return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function systemLabel(value: string): string {
	return RPG_SYSTEMS.find((s) => s.value === value)?.label || value;
}

export function remoteErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "object" && error && "message" in error) {
		return String((error as { message: unknown }).message);
	}
	return "Falha ao sincronizar com o Supabase.";
}
