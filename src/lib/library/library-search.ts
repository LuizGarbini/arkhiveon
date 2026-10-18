/** Busca da Biblioteca: pelo nome, sem diferenciar maiúscula nem acento. */

export function normalizeForSearch(text: string): string {
	return text
		.normalize("NFD")
		.replace(/\p{M}/gu, "")
		.toLocaleLowerCase("pt-BR")
		.replace(/\s+/g, " ")
		.trim();
}

export function filterByTitle<T extends { title: string }>(
	files: readonly T[],
	query: string,
): readonly T[] {
	const needle = normalizeForSearch(query);
	if (!needle) return files;
	return files.filter((file) =>
		normalizeForSearch(file.title).includes(needle),
	);
}

/** Contador do cabeçalho: "6" ou, com busca, "2 de 6". */
export function libraryCountLabel(
	visible: number,
	total: number,
	query: string,
): string {
	return normalizeForSearch(query) ? `${visible} de ${total}` : String(total);
}
