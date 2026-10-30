/**
 * Quem vê uma imagem da Biblioteca (coluna `image_assets.visibility`, migração 0054).
 * O mestre (dono da campanha) sempre vê tudo; quem subiu sempre vê a própria.
 */
export type ImageVisibility = "public" | "players" | "co_gm" | "gm_only";

export const IMAGE_VISIBILITIES: readonly ImageVisibility[] = [
	"public",
	"players",
	"co_gm",
	"gm_only",
];

export const IMAGE_VISIBILITY_LABEL: Record<ImageVisibility, string> = {
	public: "Pública",
	players: "Jogadores da mesa",
	co_gm: "Mestre e co-mestres",
	gm_only: "Só o mestre",
};

export function isImageVisibility(value: unknown): value is ImageVisibility {
	return (
		typeof value === "string" &&
		(IMAGE_VISIBILITIES as readonly string[]).includes(value)
	);
}

/** Lê a visibilidade da linha; banco sem a 0054 cai no `is_private` antigo. */
export function visibilityFromRow(
	visibility: unknown,
	isPrivate: boolean,
): ImageVisibility {
	if (isImageVisibility(visibility)) return visibility;
	return isPrivate ? "gm_only" : "public";
}

export function isPrivateVisibility(visibility: ImageVisibility): boolean {
	return visibility !== "public";
}
