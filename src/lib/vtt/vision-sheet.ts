import { SYSTEM_CONFIG } from "@/lib/systems";
import { characterVisionCells } from "./vision";

/**
 * Ponte ficha → mesa. Fica fora de vision.ts de propósito: precisa da unidade
 * padrão de cada sistema (`@/lib/systems`), e vision.ts tem de continuar puro
 * para carregar em qualquer teste.
 */

interface SheetVisionCharacter {
	id: string;
	system?: string;
	visionDistance?: unknown;
	speedUnit?: unknown;
}

/**
 * Selo (texto) com a visão, em casas, dos personagens ligados a tokens da mesa.
 * Devolve só primitivo para o seletor do Zustand ficar estável: só muda quando a
 * visão de alguém realmente muda. Formato: `id:casas;id:casas;`.
 */
export function selectLinkedVisionStamp(
	characters: readonly SheetVisionCharacter[],
	characterIds: string,
): string {
	if (!characterIds) return "";
	const wanted = new Set(characterIds.split("|"));
	let stamp = "";
	for (const character of characters) {
		if (!wanted.has(character.id)) continue;
		const systemUnit =
			(SYSTEM_CONFIG as Record<string, { speedUnit: string } | undefined>)[
				character.system ?? ""
			]?.speedUnit ?? "ft";
		const cells = characterVisionCells(character, systemUnit);
		if (cells !== undefined)
			stamp += `${character.id}:${Math.round(cells * 100) / 100};`;
	}
	return stamp;
}

/** Lê o selo de volta: id do personagem → alcance em casas. */
export function parseVisionStamp(stamp: string): Map<string, number> {
	const map = new Map<string, number>();
	for (const part of stamp.split(";")) {
		const at = part.lastIndexOf(":");
		if (at <= 0) continue;
		const cells = Number(part.slice(at + 1));
		if (cells > 0) map.set(part.slice(0, at), cells);
	}
	return map;
}
