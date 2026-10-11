/**
 * Assistente da mesa — patch de ficha existente no cliente.
 * Funções puras: montam o diff (antes → depois) e o objeto que o Aplicar grava.
 * Nada aqui escreve no store; quem chama decide (só depois de Confirmar).
 */
import {
	CHARACTER_NUMERIC_FIELD_KEYS,
	CHARACTER_NUMERIC_FIELDS,
	type IaMesaCharacterPatchProposal,
	type PatchWeaponStats,
} from "../../../supabase/functions/_shared/ia-mesa-character";
import type {
	Character,
	InventoryItem,
	InventoryWeaponStats,
} from "../store/types";

export type DiffKind = "field" | "item-add" | "item-update" | "item-remove";

export interface CharacterDiffRow {
	kind: DiffKind;
	label: string;
	before: string;
	after: string;
}

const LOCATION_LABELS: Record<InventoryItem["location"], string> = {
	equipped: "No corpo",
	backpack: "Mochila",
	mount_stash: "Montaria",
};

function weaponLabel(weapon?: PatchWeaponStats | InventoryWeaponStats): string {
	if (!weapon) return "";
	const magic = weapon.magicBonus ? ` +${weapon.magicBonus}` : "";
	const extras = (weapon.extraDamage ?? [])
		.map((e) => ` + ${e.amount} ${e.type}`)
		.join("");
	return `${weapon.damageDice} ${weapon.damageType}${magic}${extras}`;
}

function itemLabel(item: {
	name: string;
	quantity?: number;
	location?: InventoryItem["location"];
	weapon?: PatchWeaponStats | InventoryWeaponStats;
}): string {
	const parts = [
		item.quantity && item.quantity !== 1
			? `${item.name} ×${item.quantity}`
			: item.name,
	];
	if (item.location) parts.push(LOCATION_LABELS[item.location]);
	const w = weaponLabel(item.weapon);
	if (w) parts.push(w);
	return parts.join(" · ");
}

function numberOf(character: Character, key: string): number | undefined {
	const v = (character as unknown as Record<string, unknown>)[key];
	return typeof v === "number" ? v : undefined;
}

/** Itens citados no patch que não existem mais na ficha (proposta velha). */
export function missingPatchItems(
	character: Character,
	proposal: IaMesaCharacterPatchProposal,
): string[] {
	const ids = new Set((character.inventoryList ?? []).map((i) => i.id));
	return [
		...proposal.updateItems.map((u) => u.itemId),
		...proposal.removeItemIds,
	].filter((id) => !ids.has(id));
}

/** Diff legível (antes → depois). Campos iguais ao atual não aparecem. */
export function buildCharacterPatchDiff(
	character: Character,
	proposal: IaMesaCharacterPatchProposal,
): CharacterDiffRow[] {
	const rows: CharacterDiffRow[] = [];
	for (const key of CHARACTER_NUMERIC_FIELD_KEYS) {
		const next = proposal.fields[key];
		if (next === undefined) continue;
		const prev = numberOf(character, key);
		if (prev === next) continue;
		rows.push({
			kind: "field",
			label: CHARACTER_NUMERIC_FIELDS[key].label,
			before: prev === undefined ? "—" : String(prev),
			after: String(next),
		});
	}
	const inventory = character.inventoryList ?? [];
	for (const u of proposal.updateItems) {
		const prev = inventory.find((i) => i.id === u.itemId);
		if (!prev) continue;
		const next = { ...prev, ...stripUndefined(u) };
		const before = itemLabel(prev);
		const after = itemLabel(next);
		if (before === after && prev.description === next.description) continue;
		rows.push({ kind: "item-update", label: prev.name, before, after });
	}
	for (const item of proposal.addItems) {
		rows.push({
			kind: "item-add",
			label: item.name,
			before: "—",
			after: itemLabel(item),
		});
	}
	for (const id of proposal.removeItemIds) {
		const prev = inventory.find((i) => i.id === id);
		if (!prev) continue;
		rows.push({
			kind: "item-remove",
			label: prev.name,
			before: itemLabel(prev),
			after: "—",
		});
	}
	return rows;
}

function stripUndefined<T extends object>(value: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(value).filter(([k, v]) => v !== undefined && k !== "itemId"),
	) as Partial<T>;
}

function toWeapon(
	weapon: PatchWeaponStats,
	newId: () => string,
): InventoryWeaponStats {
	return {
		damageDice: weapon.damageDice,
		damageType: weapon.damageType,
		ability: weapon.ability,
		...(weapon.magicBonus ? { magicBonus: weapon.magicBonus } : {}),
		...(weapon.proficient !== undefined
			? { proficient: weapon.proficient }
			: {}),
		...(weapon.extraDamage?.length
			? {
					extraDamage: weapon.extraDamage.map((e) => ({
						id: newId(),
						label: e.label,
						amount: e.amount,
						type: e.type,
					})),
				}
			: {}),
	};
}

export type CharacterPatchResult =
	| {
			ok: true;
			/** O que `updateCharacter` recebe. */
			changes: Partial<Character>;
			/** Valores anteriores, para Desfazer. */
			before: Partial<Character>;
	  }
	| { ok: false; error: string };

/**
 * Monta o patch a gravar. Não escreve nada. Falha (sem gravar) se a ficha não
 * é a da proposta ou se algum item citado sumiu.
 */
export function applyCharacterPatch(
	character: Character,
	proposal: IaMesaCharacterPatchProposal,
	newId: () => string = () => crypto.randomUUID(),
): CharacterPatchResult {
	if (character.id !== proposal.characterId) {
		return { ok: false, error: "Esta proposta é de outra ficha." };
	}
	if (missingPatchItems(character, proposal).length) {
		return {
			ok: false,
			error:
				"A ficha mudou desde a proposta (item não encontrado). Nada foi alterado; peça de novo.",
		};
	}
	const changes: Partial<Character> = {};
	const before: Partial<Character> = {};
	const changesRec = changes as Record<string, unknown>;
	const beforeRec = before as Record<string, unknown>;
	for (const key of CHARACTER_NUMERIC_FIELD_KEYS) {
		const next = proposal.fields[key];
		if (next === undefined) continue;
		changesRec[key] = next;
		beforeRec[key] = numberOf(character, key);
	}

	const touchesInventory =
		proposal.addItems.length > 0 ||
		proposal.updateItems.length > 0 ||
		proposal.removeItemIds.length > 0;
	if (touchesInventory) {
		const current = character.inventoryList ?? [];
		const removing = new Set(proposal.removeItemIds);
		const next: InventoryItem[] = current
			.filter((item) => !removing.has(item.id))
			.map((item) => {
				const u = proposal.updateItems.find((x) => x.itemId === item.id);
				if (!u) return item;
				const { weapon, ...rest } = stripUndefined(u);
				return {
					...item,
					...rest,
					...(weapon ? { weapon: toWeapon(weapon, newId) } : {}),
				};
			});
		for (const add of proposal.addItems) {
			const { weapon, ...rest } = add;
			next.push({
				id: newId(),
				weightLbs: 0,
				...rest,
				...(weapon ? { weapon: toWeapon(weapon, newId) } : {}),
			});
		}
		changes.inventoryList = next;
		before.inventoryList = current;
	}
	return { ok: true, changes, before };
}
