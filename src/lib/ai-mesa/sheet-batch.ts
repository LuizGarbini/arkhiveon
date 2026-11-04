import {
	commitSheetBatch,
	type SheetBatchProposal,
	type SheetSnapshot,
} from "../../../supabase/functions/_shared/ia-mesa-sheet-batch";
import type { Character } from "../store/types";

export type {
	SheetBatchProposal,
	SheetDiffLine,
	SheetRejection,
	SheetSection,
	SheetSnapshot,
} from "../../../supabase/functions/_shared/ia-mesa-sheet-batch";
export {
	canEditCampaignSheet,
	commitSheetBatch,
	reviewSheetBatch,
	SHEET_SECTIONS,
	validateSheetBatch,
} from "../../../supabase/functions/_shared/ia-mesa-sheet-batch";

export function snapshotFromCharacter(character: Character): SheetSnapshot {
	return {
		id: character.id,
		name: character.characterName || "Personagem",
		data: character as unknown as Record<string, unknown>,
		itemIds: (character.inventoryList ?? []).map((item) => item.id),
	};
}

/** Uma escrita com a ficha inteira do lote, ou nenhuma. */
export function commitCharacterBatch(input: {
	allowed: boolean;
	character: Character;
	proposal: SheetBatchProposal;
	write: (id: string, changes: Partial<Character>) => void;
	newId?: () => string;
}): { ok: true; before: Partial<Character> } | { ok: false; error: string } {
	const result = commitSheetBatch({
		allowed: input.allowed,
		proposal: input.proposal,
		data: input.character as unknown as Record<string, unknown>,
		characterId: input.character.id,
		newId: input.newId,
		write: (id, changes) => {
			input.write(id, changes as Partial<Character>);
		},
	});
	if (!result.ok) return result;
	return { ok: true, before: result.before as Partial<Character> };
}
