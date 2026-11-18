import { useCanLinkOnSheet } from "@/components/character-sheet/use-linked-items";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import {
	canEditCharacterResources,
	type ResourceChanges,
	saveCharacterResources,
} from "@/lib/character-resources";
import { saveCharacterVision, type VisionValues } from "@/lib/character-vision";
import type { Character } from "@/lib/store/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

export interface SheetResourceApi {
	/** Mestre, co-mestre ou quem criou a ficha. */
	canEdit: boolean;
	/** Mestre ou co-mestre: também pode conceder Inspiração. */
	isStaff: boolean;
	/** Muda os recursos: a tela muda na hora; se falhar, volta e avisa. */
	save: (changes: ResourceChanges) => void;
	/** Muda a visão (na luz e no escuro); mesma regra de quem pode editar. */
	saveVision: (values: VisionValues) => void;
}

/**
 * Edição dos recursos da ficha na mesa (espaços de magia, Inspiração,
 * salvaguardas contra a morte, dados de vida). Mestre e co-mestre gravam pela
 * ficha; o jogador, pela função do banco (ver `saveCharacterResources`).
 */
export function useSheetResources(
	character: Character | null,
): SheetResourceApi {
	const isStaff = useVTTStore((s) => s.isGM || s.isCoGM);
	const linkable = useCanLinkOnSheet({ createdBy: character?.createdBy });
	const { user } = useAuth();
	const toast = useToast();
	const canEdit =
		Boolean(character) &&
		canEditCharacterResources({
			isStaff,
			isCampaignEditor: linkable,
			userId: user?.id,
			createdBy: character?.createdBy,
		});
	return {
		canEdit,
		isStaff,
		save: (changes) => {
			if (!character || !canEdit) return;
			void saveCharacterResources({
				characterId: character.id,
				changes,
				isStaff,
			}).then((result) => {
				if (!result.ok) toast.error({ title: result.message });
			});
		},
		saveVision: (values) => {
			if (!character || !canEdit) return;
			void saveCharacterVision({ characterId: character.id, values }).then(
				(result) => {
					if (!result.ok) toast.error({ title: result.message });
				},
			);
		},
	};
}
