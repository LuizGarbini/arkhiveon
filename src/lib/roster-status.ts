import type { Character, CharacterLifeStatus, Npc } from "@/lib/store/types";

export type RosterLifeStatus = CharacterLifeStatus;
export type RosterLifeFilter = "all" | RosterLifeStatus;

export const ROSTER_LIFE_FILTERS: RosterLifeFilter[] = [
	"all",
	"alive",
	"wounded",
	"down",
	"dead",
];

export function getCharacterLifeStatus(
	character: Pick<
		Character,
		"health" | "healthMax" | "deathSaves" | "lifeStatus"
	>,
): RosterLifeStatus {
	if (character.lifeStatus === "dead") return "dead";
	if (character.lifeStatus === "down") return "down";

	const health = Number.isFinite(character.health) ? character.health : 0;
	const healthMax =
		Number.isFinite(character.healthMax) && character.healthMax > 0
			? character.healthMax
			: 0;
	const deathFailures = character.deathSaves?.failures ?? 0;

	if (health <= 0 && deathFailures >= 3) return "dead";
	if (health <= 0) return "down";
	if (character.lifeStatus === "wounded") return "wounded";
	if (healthMax > 0 && health / healthMax <= 0.4) return "wounded";
	return "alive";
}

export function getNpcLifeStatus(
	npc: Pick<Npc, "isAlive">,
	linkedCharacter?: Pick<
		Character,
		"health" | "healthMax" | "deathSaves" | "lifeStatus"
	>,
): RosterLifeStatus {
	if (!npc.isAlive) return "dead";
	if (!linkedCharacter) return "alive";

	return getCharacterLifeStatus(linkedCharacter);
}

export function matchesRosterLifeFilter(
	status: RosterLifeStatus,
	filter: RosterLifeFilter,
): boolean {
	return filter === "all" || status === filter;
}
