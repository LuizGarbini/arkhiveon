/**
 * Tamanho das duas letras desenhadas no disco do token.
 * A fonte fica em unidades do mapa (o mesmo espaço do raio). O container do
 * mundo é que aplica o zoom: dividir de novo pela escala da câmera faria as
 * letras crescerem na tela quando a mesa afasta.
 */
export function tokenInitialsFontSize(radius: number): number {
	if (!Number.isFinite(radius) || radius <= 0) return 4;
	return Math.max(4, radius * 0.7);
}

/**
 * O fantasma do arrasto (acima da névoa) só desenha iniciais quando o token
 * não tem retrato. Com foto, as letras cobriam o rosto enquanto o token andava.
 */
export function dragGhostShowsInitials(
	avatarUrl: string | null | undefined,
): boolean {
	return !avatarUrl?.trim();
}
