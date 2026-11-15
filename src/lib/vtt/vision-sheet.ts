import { SYSTEM_CONFIG } from "@/lib/systems";
import { type SheetVision, sheetVisionCells } from "./vision";

/**
 * Ponte ficha → mesa. Fica fora de vision.ts de propósito: precisa da unidade
 * padrão de cada sistema (`@/lib/systems`), e vision.ts tem de continuar puro
 * para carregar em qualquer teste.
 */

interface SheetVisionCharacter {
	id: string;
	system?: string;
	visionDistance?: unknown;
	darkvisionDistance?: unknown;
	speedUnit?: unknown;
}

/**
 * Selo (texto) com a visão, em casas, dos personagens ligados a tokens da mesa,
 * nas TRÊS luzes (a luz depende de onde o token está, e isso muda a cada passo).
 * Devolve só primitivo para o seletor do Zustand ficar estável: só muda quando a
 * visão de alguém realmente muda. Formato: `id:dia,penumbra,escuro;` (o dia fica
 * vazio quando a ficha não define nada).
 */
export function selectLinkedVisionStamp(
	characters: readonly SheetVisionCharacter[],
	characterIds: string,
): string {
	if (!characterIds) return "";
	const wanted = new Set(characterIds.split("|"));
	let stamp = "";
	const round = (n: number) => Math.round(n * 100) / 100;
	for (const character of characters) {
		if (!wanted.has(character.id)) continue;
		const systemUnit =
			(SYSTEM_CONFIG as Record<string, { speedUnit: string } | undefined>)[
				character.system ?? ""
			]?.speedUnit ?? "ft";
		const bright = sheetVisionCells(character, systemUnit, "bright");
		const dim = sheetVisionCells(character, systemUnit, "dim") as number;
		const dark = sheetVisionCells(character, systemUnit, "dark") as number;
		stamp += `${character.id}:${bright === undefined ? "" : round(bright)},${round(dim)},${round(dark)};`;
	}
	return stamp;
}

/** Lê o selo de volta: id do personagem → alcance em casas em cada luz. */
export function parseVisionStamp(stamp: string): Map<string, SheetVision> {
	const map = new Map<string, SheetVision>();
	for (const part of stamp.split(";")) {
		const at = part.lastIndexOf(":");
		if (at <= 0) continue;
		const [bright, dim, dark] = part.slice(at + 1).split(",");
		const dimCells = Number(dim);
		const darkCells = Number(dark);
		if (!(dimCells > 0) || !(darkCells > 0)) continue;
		const brightCells = bright === "" ? undefined : Number(bright);
		map.set(part.slice(0, at), {
			...(brightCells !== undefined && brightCells > 0
				? { bright: brightCells }
				: {}),
			dim: dimCells,
			dark: darkCells,
		});
	}
	return map;
}
