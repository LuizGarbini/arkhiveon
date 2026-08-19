import { describe, expect, it } from "vitest";

function normalizeRarityKey(value?: string): string {
	if (!value) return "comum";
	const normalized = value
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[_-]/g, " ")
		.trim();

	if (normalized === "common" || normalized === "comum") return "comum";
	if (normalized === "uncommon" || normalized === "incomum") return "incomum";
	if (normalized === "rare" || normalized === "raro") return "raro";
	if (normalized === "very rare" || normalized === "muito raro")
		return "muito raro";
	if (
		normalized === "legendary" ||
		normalized === "lendario" ||
		normalized === "lendaria"
	)
		return "lendario";
	if (normalized === "artifact" || normalized === "artefato") return "artefato";
	return normalized;
}

function matchesCategoryFilter(
	itemType: string,
	categoryFilter: string,
): boolean {
	if (!categoryFilter || categoryFilter === "all") return true;
	const normalizedType = (itemType || "")
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();

	const normalizedCat = categoryFilter
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();

	if (!normalizedType)
		return normalizedCat === "outro" || normalizedCat === "misc";
	if (normalizedType.includes(normalizedCat)) return true;

	const categoryMap: Record<string, string[]> = {
		arma: [
			"arma",
			"weapon",
			"espada",
			"machado",
			"arco",
			"adaga",
			"lanca",
			"martelo",
			"maca",
		],
		armadura: [
			"armadura",
			"armor",
			"escudo",
			"shield",
			"traje",
			"veste",
			"elmo",
			"peitoral",
		],
		pocao: [
			"pocao",
			"potion",
			"consumivel",
			"consumable",
			"elixir",
			"oleo",
			"frasco",
			"ingrediente",
		],
		anel: [
			"anel",
			"ring",
			"amuleto",
			"amulet",
			"colar",
			"acessorio",
			"joia",
			"brinco",
			"tiara",
			"bracelete",
		],
		pergaminho: [
			"pergaminho",
			"scroll",
			"tomo",
			"tome",
			"grimoire",
			"livro",
			"grimorio",
			"carta",
			"mapa",
		],
		varinha: ["varinha", "wand", "cajado", "staff", "cetro", "foco", "orbe"],
		outro: [
			"outro",
			"misc",
			"utilitario",
			"ferramenta",
			"item",
			"equipamento",
			"moeda",
			"reliquia",
		],
	};

	const aliases = categoryMap[normalizedCat];
	if (aliases) {
		return aliases.some((alias) => normalizedType.includes(alias));
	}

	return false;
}

describe("Item Filter Helpers", () => {
	describe("normalizeRarityKey", () => {
		it("normalizes Portuguese rarity values", () => {
			expect(normalizeRarityKey("comum")).toBe("comum");
			expect(normalizeRarityKey("incomum")).toBe("incomum");
			expect(normalizeRarityKey("raro")).toBe("raro");
			expect(normalizeRarityKey("muito raro")).toBe("muito raro");
			expect(normalizeRarityKey("lendário")).toBe("lendario");
			expect(normalizeRarityKey("lendario")).toBe("lendario");
			expect(normalizeRarityKey("artefato")).toBe("artefato");
		});

		it("normalizes English rarity aliases", () => {
			expect(normalizeRarityKey("common")).toBe("comum");
			expect(normalizeRarityKey("uncommon")).toBe("incomum");
			expect(normalizeRarityKey("rare")).toBe("raro");
			expect(normalizeRarityKey("very_rare")).toBe("muito raro");
			expect(normalizeRarityKey("very rare")).toBe("muito raro");
			expect(normalizeRarityKey("legendary")).toBe("lendario");
			expect(normalizeRarityKey("artifact")).toBe("artefato");
		});

		it("defaults empty or undefined to comum", () => {
			expect(normalizeRarityKey("")).toBe("comum");
			expect(normalizeRarityKey(undefined)).toBe("comum");
		});
	});

	describe("matchesCategoryFilter", () => {
		it("matches 'all' or empty filter for any item type", () => {
			expect(matchesCategoryFilter("Arma", "all")).toBe(true);
			expect(matchesCategoryFilter("Armadura", "")).toBe(true);
		});

		it("matches weapon categories and synonyms", () => {
			expect(matchesCategoryFilter("Arma", "arma")).toBe(true);
			expect(matchesCategoryFilter("Espada Longa", "arma")).toBe(true);
			expect(matchesCategoryFilter("weapon", "arma")).toBe(true);
			expect(matchesCategoryFilter("Machado de Guerra", "arma")).toBe(true);
			expect(matchesCategoryFilter("Poção de Cura", "arma")).toBe(false);
		});

		it("matches armor and shield categories", () => {
			expect(matchesCategoryFilter("Armadura", "armadura")).toBe(true);
			expect(matchesCategoryFilter("Escudo Pesado", "armadura")).toBe(true);
			expect(matchesCategoryFilter("Elmo de Ferro", "armadura")).toBe(true);
			expect(matchesCategoryFilter("Arma", "armadura")).toBe(false);
		});

		it("matches potions and consumables", () => {
			expect(matchesCategoryFilter("Poção", "pocao")).toBe(true);
			expect(matchesCategoryFilter("Elixir da Vida", "pocao")).toBe(true);
			expect(matchesCategoryFilter("Consumível", "pocao")).toBe(true);
		});

		it("matches jewelry, rings and amulets", () => {
			expect(matchesCategoryFilter("Anel de Proteção", "anel")).toBe(true);
			expect(matchesCategoryFilter("Amuleto Sagrado", "anel")).toBe(true);
			expect(matchesCategoryFilter("Colar Arcano", "anel")).toBe(true);
		});

		it("matches scrolls and grimoires", () => {
			expect(matchesCategoryFilter("Pergaminho", "pergaminho")).toBe(true);
			expect(matchesCategoryFilter("Grimório das Sombras", "pergaminho")).toBe(
				true,
			);
			expect(matchesCategoryFilter("Tomo Antigo", "pergaminho")).toBe(true);
		});

		it("matches wands, staves and focuses", () => {
			expect(matchesCategoryFilter("Varinha Mágica", "varinha")).toBe(true);
			expect(matchesCategoryFilter("Cajado Elemental", "varinha")).toBe(true);
			expect(matchesCategoryFilter("Foco Arcano", "varinha")).toBe(true);
		});

		it("matches misc / outro for generic items", () => {
			expect(matchesCategoryFilter("Utilitário", "outro")).toBe(true);
			expect(matchesCategoryFilter("Ferramenta de Ladrão", "outro")).toBe(true);
			expect(matchesCategoryFilter("", "outro")).toBe(true);
		});
	});
});
