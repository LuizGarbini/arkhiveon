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
 *
 * `ownEcho`: o Realtime também devolve para QUEM GRAVOU o eco da própria gravação
 * (com atraso). Num passo rápido o eco de um passo antigo chegava depois de o token
 * já estar mais adiante e o puxava de volta ("rubber-band"). Quando a posição do
 * banco é uma que EU enviei, a mesa local já tem essa posição ou uma mais nova:
 * posição, alvo e direção não são tocados (o resto da linha continua valendo).
 */
export function remoteTokenPatch(
	row: TokenRow,
	locallyDragged: boolean,
	ownEcho = false,
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
	if (ownEcho) delete patch.rotation;
	if (!locallyDragged && !ownEcho) {
		patch.x = t.x;
		patch.y = t.y;
		patch.targetX = t.x;
		patch.targetY = t.y;
	}
	return patch;
}

/**
 * A atualização não muda nada no token local? (o eco do meu próprio passo traz a
 * linha inteira, quase sempre igual ao que a mesa já tem: aplicar mesmo assim
 * troca o objeto do token e re-renderiza o canvas à toa, uma vez por gravação.)
 */
export function tokenPatchIsNoop(
	token: VTTToken,
	patch: Partial<VTTToken>,
): boolean {
	for (const [key, value] of Object.entries(patch)) {
		const current = token[key as keyof VTTToken];
		if (current === value) continue;
		if (
			typeof value === "object" &&
			value !== null &&
			typeof current === "object" &&
			current !== null &&
			JSON.stringify(current) === JSON.stringify(value)
		)
			continue;
		return false;
	}
	return true;
}
