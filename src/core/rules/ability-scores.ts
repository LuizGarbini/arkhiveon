import { weaponAbilityScores } from "./weapon-damage";

const WEAPON_KEYS = [
	"strength",
	"dexterity",
	"constitution",
	"intelligence",
	"wisdom",
	"charisma",
] as const;
type WeaponKey = (typeof WEAPON_KEYS)[number];
const EXTRA_STANDARD_KEYS = ["power", "size", "education"] as const;

function isWeaponKey(key: string): key is WeaponKey {
	return (WEAPON_KEYS as readonly string[]).includes(key);
}

/**
 * Score de um atributo como a ficha exibe: valor salvo, ou 10 quando ausente,
 * vazio, inválido ou 0 (fichas antigas). Só leitura: nada é gravado.
 * Chaves padrão vêm do topo da ficha; as demais, de `systemAttributes`.
 */
export function characterAttributeScore(
	character: object,
	key: string,
): number {
	const fields = character as Record<string, unknown>;
	if (isWeaponKey(key)) return weaponAbilityScores(fields)[key];
	if ((EXTRA_STANDARD_KEYS as readonly string[]).includes(key)) {
		return Number(fields[key]) || 10;
	}
	const extra = fields.systemAttributes;
	if (!extra || typeof extra !== "object") return 10;
	return Number((extra as Record<string, unknown>)[key]) || 10;
}
