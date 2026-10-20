/**
 * Igualdade estrutural para valores JSON da ficha (primitivos, arrays e
 * objetos simples). NaN é igual a NaN; `undefined` numa chave conta como
 * ausente, igual ao que sobrevive ao JSON salvo no banco.
 */
export function isDeepEqual(a: unknown, b: unknown): boolean {
	if (Object.is(a, b)) return true;
	if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
	if (Array.isArray(a) !== Array.isArray(b)) return false;
	if (Array.isArray(a) && Array.isArray(b)) {
		return a.length === b.length && a.every((v, i) => isDeepEqual(v, b[i]));
	}
	const ra = a as Record<string, unknown>;
	const rb = b as Record<string, unknown>;
	const keys = new Set([...Object.keys(ra), ...Object.keys(rb)]);
	for (const key of keys) {
		if (!isDeepEqual(ra[key], rb[key])) return false;
	}
	return true;
}
