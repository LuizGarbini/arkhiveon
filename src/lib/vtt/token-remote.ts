import type { Database } from "@/lib/database.types";
import { mapTokenRow } from "./scene-row";
import type { VTTToken } from "./types";

type TokenRow = Database["public"]["Tables"]["vtt_tokens"]["Row"];

/**
 * O que uma atualização de `vtt_tokens` vinda de OUTRO usuário muda no token
 * local. É o que o banco confirmou, então é a verdade final.
 *
 * Posição: o desenho do token segue `targetX/targetY` quando eles existem
 * (interpolação do arrasto ao vivo). Se a posição do banco chegasse só em `x/y`,
 * qualquer alvo velho (broadcast perdido, fora de ordem, ou movimento sem
 * broadcast como o "devolver" do histórico) prenderia o token no lugar errado
 * para sempre. Por isso o alvo é alinhado com a posição do banco: o token desliza
 * até ela e fica.
 *
 * Com o token sob o ponteiro local, posição e alvo não mudam: o ponteiro manda.
 * Identidade (nome, avatar, vínculo, quem controla) não é trocada por aqui.
 */
export function remoteTokenPatch(
	row: TokenRow,
	locallyDragged: boolean,
): Partial<VTTToken> {
	const t = mapTokenRow(row);
	const patch: Partial<VTTToken> = {
		sizeCells: t.sizeCells,
		rotation: t.rotation,
		hpCurrent: t.hpCurrent,
		hpMax: t.hpMax,
		tempHp: t.tempHp,
		elevation: t.elevation,
		conditions: t.conditions,
		auras: t.auras,
		visionRange: t.visionRange,
		isLocked: t.isLocked,
		isHidden: t.isHidden,
		layer: t.layer,
	};
	if (!locallyDragged) {
		patch.x = t.x;
		patch.y = t.y;
		patch.targetX = t.x;
		patch.targetY = t.y;
	}
	return patch;
}
