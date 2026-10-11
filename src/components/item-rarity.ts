/**
 * Cores de raridade de item (compartilhadas entre ItemCard e o cadastro).
 * Só classes da paleta que o app já usa; nenhuma cor nova.
 */
export interface RarityStyle {
	tone: string;
	border: string;
	glow: string;
}

export const rarityStyles: Record<string, RarityStyle> = {
	comum: {
		tone: "text-slate-300",
		border: "border-border/70",
		glow: "from-slate-500/10",
	},
	incomum: {
		tone: "text-emerald-300",
		border: "border-emerald-500/35",
		glow: "from-emerald-500/15",
	},
	raro: {
		tone: "text-blue-300",
		border: "border-blue-500/35",
		glow: "from-blue-500/15",
	},
	"muito raro": {
		tone: "text-fuchsia-300",
		border: "border-fuchsia-500/35",
		glow: "from-fuchsia-500/15",
	},
	lendario: {
		tone: "text-amber-300",
		border: "border-amber-500/35",
		glow: "from-amber-500/15",
	},
	artefato: {
		tone: "text-rose-300",
		border: "border-rose-500/40",
		glow: "from-rose-500/15",
	},
};

export function normalizeRarityKey(value?: string): string {
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

export function rarityStyleFor(value?: string): RarityStyle {
	return rarityStyles[normalizeRarityKey(value)] ?? rarityStyles.comum;
}
