/**
 * Quem vê uma imagem privada da Biblioteca (migração 0054).
 * Colunas: `is_private` + `visible_to_co_gms` + `visible_to_players`, livres entre si.
 * O mestre (dono da campanha) sempre vê tudo; quem subiu sempre vê a própria.
 * Os dois desmarcados = "só o mestre".
 */
export interface ImageAudience {
	coGms: boolean;
	players: boolean;
}

/** Igual ao default do banco: reproduz a regra antiga (co-mestres sim, jogadores não). */
export const DEFAULT_PRIVATE_AUDIENCE: ImageAudience = {
	coGms: true,
	players: false,
};

/** Lê da linha; banco sem a 0054 cai no default (a regra antiga). */
export function audienceFromRow(
	coGms: unknown,
	players: unknown,
): ImageAudience {
	return {
		coGms: typeof coGms === "boolean" ? coGms : DEFAULT_PRIVATE_AUDIENCE.coGms,
		players:
			typeof players === "boolean" ? players : DEFAULT_PRIVATE_AUDIENCE.players,
	};
}

export function imageVisibilityLabel(
	isPrivate: boolean,
	audience: ImageAudience = DEFAULT_PRIVATE_AUDIENCE,
): string {
	if (!isPrivate) return "Pública";
	if (audience.coGms && audience.players) return "Co-mestres e jogadores";
	if (audience.coGms) return "Só co-mestres";
	if (audience.players) return "Só jogadores";
	return "Só o mestre";
}
