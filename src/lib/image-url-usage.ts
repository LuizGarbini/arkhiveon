/**
 * Antes de apagar o arquivo de uma imagem no R2, confere se mais alguma coisa
 * ainda aponta para a mesma URL: outra imagem da galeria, ou uma ficha, NPC,
 * local etc. que guarde a URL direto (sem passar pela galeria).
 */
export function isImageUrlInUse(
	state: Record<string, unknown>,
	url: string,
	exceptAssetId: string,
): boolean {
	if (!url) return false;
	for (const [name, value] of Object.entries(state)) {
		if (typeof value === "function" || value == null) continue;
		if (typeof value !== "object") continue;
		const scoped =
			name === "imageAssets" && Array.isArray(value)
				? value.filter(
						(item) => (item as { id?: unknown })?.id !== exceptAssetId,
					)
				: value;
		try {
			if (JSON.stringify(scoped).includes(url)) return true;
		} catch {
			// Estrutura que não vira JSON: na dúvida, o arquivo fica.
			return true;
		}
	}
	return false;
}

/** Chave do R2 dentro de uma URL pública; `null` para qualquer outra URL. */
export function r2KeyFromPublicUrl(
	url: string,
	publicBase: string | undefined,
): string | null {
	if (!publicBase) return null;
	const prefix = `${publicBase.replace(/\/$/, "")}/`;
	if (!url.startsWith(prefix)) return null;
	const key = url.slice(prefix.length).split(/[?#]/)[0];
	return key.length > 0 ? key : null;
}
