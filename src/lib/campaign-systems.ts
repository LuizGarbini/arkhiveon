import { RPG_SYSTEMS, type RpgSystem } from "./store/types";

export const DEFAULT_CAMPAIGN_SYSTEM: RpgSystem = "dnd5e";

export const DEDICATED_CAMPAIGN_SYSTEMS = [
	"dnd5e",
	"dnd2024",
	"ordem",
	"coc",
	"tormenta20",
	"vampire",
] as const satisfies readonly RpgSystem[];

const KNOWN_RPG_SYSTEMS = new Set<string>(
	RPG_SYSTEMS.map((system) => system.value),
);

export function normalizeCampaignSystem(value: unknown): RpgSystem {
	if (typeof value === "string" && KNOWN_RPG_SYSTEMS.has(value)) {
		return value as RpgSystem;
	}

	return DEFAULT_CAMPAIGN_SYSTEM;
}

export function isOrdemCampaignSystem(system: RpgSystem | null | undefined) {
	return system === "ordem";
}
