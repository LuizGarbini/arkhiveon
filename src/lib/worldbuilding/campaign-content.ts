import type { MembershipRole } from "../store/types";

export function isWorldGrimoireStaff(
	role: MembershipRole | undefined,
): boolean {
	return role === "owner" || role === "editor";
}

export const WORLD_GRIMOIRE_FORBIDDEN =
	"Sem permissão para gerenciar o grimório do Mundo.";
