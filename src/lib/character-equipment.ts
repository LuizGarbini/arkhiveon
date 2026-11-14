/**
 * Equipar itens como jogador. O banco não deixa o jogador regravar a ficha
 * (policy de UPDATE da 0003), então ele usa a função `set_character_equipment`
 * (0067), que só aceita mudar local, slot e sintonia de itens que já estão no
 * inventário. Mestre e co-mestre continuam salvando pela ficha normalmente.
 */
import type { Json } from "@/lib/database.types";
import { isDeepEqual } from "@/lib/deep-equal";
import { useRPGStore } from "@/lib/store";
import type { EquipSlot, InventoryItem } from "@/lib/store/types";
import { getSupabase } from "@/lib/supabase";

export interface EquipmentChange {
	id: string;
	location?: InventoryItem["location"];
	/** `null` limpa o slot. */
	slot?: EquipSlot | null;
	isAttuned?: boolean;
}

type EquipmentRpcArgs = { p_character_id: string; p_changes: Json };

export type EquipmentSaveResult =
	| { ok: true }
	| {
			ok: false;
			reason: "unavailable" | "forbidden" | "invalid" | "offline" | "error";
			message: string;
	  };

function withoutEquipmentFields(entry: InventoryItem) {
	const { location: _l, slot: _s, isAttuned: _a, ...rest } = entry;
	return rest;
}

/**
 * Diferença entre o inventário de agora e o novo, no formato da função do
 * banco. `null` quando o novo inventário muda mais do que local, slot e
 * sintonia (item novo, item apagado, quantidade…): isso um jogador não faz.
 * Lista vazia = nada mudou.
 */
export function equipmentChanges(
	prev: readonly InventoryItem[],
	next: readonly InventoryItem[],
): EquipmentChange[] | null {
	if (prev.length !== next.length) return null;
	const changes: EquipmentChange[] = [];
	for (let i = 0; i < prev.length; i++) {
		const a = prev[i];
		const b = next[i];
		if (a.id !== b.id) return null;
		if (!isDeepEqual(withoutEquipmentFields(a), withoutEquipmentFields(b)))
			return null;
		const change: EquipmentChange = { id: a.id };
		if (a.location !== b.location) change.location = b.location;
		if ((a.slot ?? null) !== (b.slot ?? null)) change.slot = b.slot ?? null;
		if (a.isAttuned !== b.isAttuned) {
			// A função só sabe ligar ou desligar; "apagar" a sintonia não existe.
			if (typeof b.isAttuned !== "boolean") return null;
			change.isAttuned = b.isAttuned;
		}
		if (Object.keys(change).length > 1) changes.push(change);
	}
	return changes;
}

type RpcErrorLike = { code?: string | null; message?: string | null };

function toFailure(
	error: unknown,
): Extract<EquipmentSaveResult, { ok: false }> {
	const e = (error ?? {}) as RpcErrorLike;
	// Função ainda não criada no servidor (migration pendente).
	if (e.code === "PGRST202" || e.code === "42883") {
		return {
			ok: false,
			reason: "unavailable",
			message: "Equipar itens ainda não está disponível no servidor.",
		};
	}
	if (e.code === "42501") {
		return {
			ok: false,
			reason: "forbidden",
			message: e.message || "Você não pode equipar itens desta ficha.",
		};
	}
	if (e.code === "22023") {
		return {
			ok: false,
			reason: "invalid",
			message: e.message || "Essa troca de equipamento não é válida.",
		};
	}
	return {
		ok: false,
		reason: "error",
		message: "Não foi possível salvar o equipamento.",
	};
}

async function callSetCharacterEquipment(
	args: EquipmentRpcArgs,
): Promise<{ inventoryList?: unknown }> {
	const client = getSupabase();
	if (!client) throw { code: "offline", message: "Sem conexão." };
	const { data, error } = await client.rpc("set_character_equipment", args);
	if (error) throw error;
	return (data ?? {}) as { inventoryList?: unknown };
}

function setInventory(characterId: string, inventoryList: InventoryItem[]) {
	useRPGStore.setState((state) => ({
		characters: state.characters.map((character) =>
			character.id === characterId
				? { ...character, inventoryList }
				: character,
		),
	}));
}

/**
 * Salva o equipamento como dono da ficha (jogador): atualiza na hora, chama a
 * função do banco e, se falhar, volta ao que estava. Só aceita mudança de
 * local, slot e sintonia.
 */
export async function saveEquipmentAsOwner(input: {
	characterId: string;
	next: InventoryItem[];
	rpc?: (args: EquipmentRpcArgs) => Promise<{ inventoryList?: unknown }>;
}): Promise<EquipmentSaveResult> {
	const existing = useRPGStore
		.getState()
		.characters.find((character) => character.id === input.characterId);
	if (!existing) {
		return { ok: false, reason: "error", message: "Ficha não encontrada." };
	}
	const prev = existing.inventoryList ?? [];
	const changes = equipmentChanges(prev, input.next);
	if (changes === null) {
		return {
			ok: false,
			reason: "invalid",
			message: "Só dá para mudar o que está equipado.",
		};
	}
	if (changes.length === 0) return { ok: true };

	setInventory(input.characterId, input.next);
	try {
		const result = await (input.rpc ?? callSetCharacterEquipment)({
			p_character_id: input.characterId,
			p_changes: changes as unknown as Json,
		});
		// O servidor devolve o inventário gravado: vira a fonte da verdade.
		if (Array.isArray(result.inventoryList)) {
			setInventory(input.characterId, result.inventoryList as InventoryItem[]);
		}
		return { ok: true };
	} catch (error) {
		const now = useRPGStore
			.getState()
			.characters.find((character) => character.id === input.characterId);
		// Só desfaz se ninguém mexeu na ficha nesse meio tempo.
		if (now?.inventoryList === input.next)
			setInventory(input.characterId, prev);
		if ((error as RpcErrorLike | null)?.code === "offline") {
			return {
				ok: false,
				reason: "offline",
				message: "Sem conexão: o equipamento não foi salvo.",
			};
		}
		return toFailure(error);
	}
}
