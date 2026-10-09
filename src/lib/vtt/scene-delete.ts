/**
 * Rules for deleting a scene from the scene bar (bug 06). The GM could
 * create scenes but never remove one, so audit scenes stayed forever. The
 * last scene of the table cannot be deleted (the table would be left with
 * nothing to show); deleting the scene in play is allowed while another
 * scene exists, and the players see no scene until the GM shows another.
 */
import type { VTTScene } from "./types";

export const LAST_SCENE_MESSAGE =
	"Esta é a única cena da mesa. Crie outra cena antes de excluir esta.";
export const IN_PLAY_WARNING =
	"Ela está em jogo: os jogadores ficam sem cena até você exibir outra.";

export type SceneDeleteCheck =
	| { allowed: false; reason: string }
	| { allowed: true; warning: string | null };

export function checkSceneDelete(
	scene: Pick<VTTScene, "id" | "isActive">,
	scenes: Pick<VTTScene, "id">[],
): SceneDeleteCheck {
	const others = scenes.filter((other) => other.id !== scene.id);
	if (others.length === 0)
		return { allowed: false, reason: LAST_SCENE_MESSAGE };
	return { allowed: true, warning: scene.isActive ? IN_PLAY_WARNING : null };
}
