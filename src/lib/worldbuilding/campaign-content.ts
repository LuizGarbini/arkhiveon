import type { MembershipRole } from "../store/types";
import { isWorldStaff } from "./visibility";

/** @deprecated Prefer `isWorldStaff` from visibility — mesmo critério. */
export function isWorldGrimoireStaff(
	role: MembershipRole | undefined,
): boolean {
	return isWorldStaff(role);
}

export const WORLD_GRIMOIRE_FORBIDDEN =
	"Sem permissão para gerenciar o grimório do Mundo.";
