/**
 * Visão da ficha na mesa: a visão normal (na luz) e a visão no escuro, na mesma
 * unidade do deslocamento.
 *
 * Quem pode mudar: mestre e co-mestre em qualquer ficha; o jogador, na que ele
 * criou. O jogador não regrava a ficha (policy da 0003), então TODOS gravam pela
 * função `set_character_vision` (0072), que valida e só toca nesses dois campos.
 * A tela muda na hora e volta ao que estava se a gravação falhar.
 */

import { type ResourceSaveResult, toFailure } from "@/lib/character-resources";
import { isDeepEqual } from "@/lib/deep-equal";
import { useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import { getSupabase } from "@/lib/supabase";

/** Maior alcance aceito (igual ao do banco e do formulário da ficha). */
export const MAX_VISION = 1000;

export interface VisionValues {
	/** Na luz. `undefined` = sem visão definida (vale o do token). */
	visionDistance?: number;
	/** No escuro. `undefined` = sem visão no escuro (1 casa). */
	darkvisionDistance?: number;
}

/**
 * Texto/número digitado → alcance válido. Vazio, zero, negativo, NaN e lixo
 * viram `undefined` (sem valor); acima de 1000 é limitado; uma casa decimal.
 */
export function normalizeVision(
	value: number | string | null | undefined,
): number | undefined {
	if (value === null || value === undefined) return undefined;
	const number =
		typeof value === "string" ? Number(value.replace(",", ".")) : value;
	if (typeof value === "string" && value.trim() === "") return undefined;
	if (!Number.isFinite(number) || number <= 0) return undefined;
	return Math.min(MAX_VISION, Math.round(number * 10) / 10);
}

type RpcArgs = {
	p_character_id: string;
	p_vision: number | null;
	p_darkvision: number | null;
};
type Rpc = (args: RpcArgs) => Promise<unknown>;

async function callRpc(args: RpcArgs): Promise<unknown> {
	const client = getSupabase();
	if (!client) throw { code: "offline", message: "Sem conexão." };
	const { data, error } = await client.rpc("set_character_vision", args);
	if (error) throw error;
	return data;
}

function applyLocal(characterId: string, values: VisionValues) {
	useRPGStore.setState((state) => ({
		characters: state.characters.map((c) =>
			c.id === characterId
				? {
						...c,
						visionDistance: values.visionDistance,
						darkvisionDistance: values.darkvisionDistance,
					}
				: c,
		),
	}));
}

export async function saveCharacterVision(input: {
	characterId: string;
	values: VisionValues;
	rpc?: Rpc;
}): Promise<ResourceSaveResult> {
	const existing = useRPGStore
		.getState()
		.characters.find((c) => c.id === input.characterId);
	if (!existing) {
		return { ok: false, reason: "error", message: "Ficha não encontrada." };
	}
	const next: VisionValues = {
		visionDistance: normalizeVision(input.values.visionDistance),
		darkvisionDistance: normalizeVision(input.values.darkvisionDistance),
	};
	const previous: VisionValues = {
		visionDistance: existing.visionDistance,
		darkvisionDistance: existing.darkvisionDistance,
	};
	if (isDeepEqual(next, previous)) return { ok: true };

	applyLocal(input.characterId, next);
	try {
		await (input.rpc ?? callRpc)({
			p_character_id: input.characterId,
			p_vision: next.visionDistance ?? null,
			p_darkvision: next.darkvisionDistance ?? null,
		});
		return { ok: true };
	} catch (error) {
		const now = useRPGStore
			.getState()
			.characters.find((c: Character) => c.id === input.characterId);
		// Só desfaz se ninguém mexeu nisso nesse meio tempo.
		const stillOurs =
			now !== undefined &&
			now.visionDistance === next.visionDistance &&
			now.darkvisionDistance === next.darkvisionDistance;
		if (stillOurs) applyLocal(input.characterId, previous);
		return toFailure(error);
	}
}

/**
 * Valida o que a pessoa digitou (texto) antes de salvar. Vazio é válido (apaga
 * o campo). `null` = ok; senão a mensagem para mostrar junto do campo.
 */
export function visionDraftError(text: string): string | null {
	if (text.trim() === "") return null;
	const number = Number(text.replace(",", "."));
	if (!Number.isFinite(number) || number <= 0) {
		return "Use um número maior que 0.";
	}
	if (number > MAX_VISION) return `O máximo é ${MAX_VISION}.`;
	return null;
}
