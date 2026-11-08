/**
 * Quem vê uma imagem privada da Biblioteca (migração 0054).
 * Colunas: `is_private` + `visible_to_co_gms` + `visible_to_players`, livres entre si.
 * O mestre (dono da campanha) sempre vê tudo; quem subiu sempre vê a própria.
 * Os dois desmarcados = "só o mestre".
 */
export interface ImageAudience {
	coGms: boolean;
	players: boolean;
	/** Pessoas marcadas. Veem a imagem mesmo com os grupos desligados. */
	userIds?: string[];
}

export interface ImageViewer {
	role?: "owner" | "editor" | "viewer" | null;
	userId?: string | null;
}

/** Igual ao default do banco: reproduz a regra antiga (co-mestres sim, jogadores não). */
export const DEFAULT_PRIVATE_AUDIENCE: ImageAudience = {
	coGms: true,
	players: false,
};

export function normalizeUserIds(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.filter(
		(id): id is string => typeof id === "string" && id !== "",
	);
}

/** Lê da linha; banco sem a 0054 cai no default (a regra antiga). */
export function audienceFromRow(
	coGms: unknown,
	players: unknown,
	userIds?: unknown,
): ImageAudience {
	return {
		coGms: typeof coGms === "boolean" ? coGms : DEFAULT_PRIVATE_AUDIENCE.coGms,
		players:
			typeof players === "boolean" ? players : DEFAULT_PRIVATE_AUDIENCE.players,
		...(userIds !== undefined ? { userIds: normalizeUserIds(userIds) } : {}),
	};
}

/**
 * Espelha a regra da 0061: mestre e quem subiu sempre veem.
 * Co-mestre é `editor`. Jogador é `viewer`. `userIds` entra mesmo com os grupos desligados.
 * Sem `audience`, privada continua só para o mestre e para quem subiu.
 */
export function canViewImageAsset(
	asset: {
		isPrivate: boolean;
		createdBy?: string;
		audience?: ImageAudience;
	},
	viewer: ImageViewer,
): boolean {
	if (!asset.isPrivate) return true;
	if (viewer.role === "owner") return true;
	if (viewer.userId && asset.createdBy && asset.createdBy === viewer.userId) {
		return true;
	}
	const audience = asset.audience;
	if (viewer.userId && audience?.userIds?.includes(viewer.userId)) return true;
	if (!audience) return false;
	if (viewer.role === "editor" && audience.coGms) return true;
	if (viewer.role === "viewer" && audience.players) return true;
	return false;
}

export function imageVisibilityLabel(
	isPrivate: boolean,
	audience: ImageAudience = DEFAULT_PRIVATE_AUDIENCE,
): string {
	if (!isPrivate) return "Pública";
	const people = audience.userIds?.length ?? 0;
	const peopleLabel =
		people === 1 ? "1 pessoa" : people > 1 ? `${people} pessoas` : null;
	if (audience.coGms && audience.players) {
		return peopleLabel
			? `Co-mestres, jogadores e ${peopleLabel}`
			: "Co-mestres e jogadores";
	}
	if (audience.coGms) {
		return peopleLabel ? `Co-mestres e ${peopleLabel}` : "Só co-mestres";
	}
	if (audience.players) {
		return peopleLabel ? `Jogadores e ${peopleLabel}` : "Só jogadores";
	}
	if (peopleLabel) return peopleLabel;
	return "Só o mestre";
}
