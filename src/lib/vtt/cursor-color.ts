/**
 * Cor do cursor (e do ping e da régua) de cada integrante da mesa.
 *
 * Antes cada pessoa sorteava a cor ao abrir a página (`Math.random()` entre 8),
 * então duas pessoas caíam na mesma cor com frequência (com 4 jogadores, uma
 * chance em três) e a escolha não era guardada. Agora o padrão sai do id da
 * pessoa (estável) e foge das cores que já estão na mesa; cada um pode escolher
 * a sua e a escolha fica salva.
 */

/** Paleta curta e bem separada em matiz; funciona em mapa claro e escuro. */
export const CURSOR_PALETTE = [
	"#38bdf8", // Céu
	"#2563eb", // Azul
	"#4f46e5", // Índigo
	"#9333ea", // Roxo
	"#c026d3", // Fúcsia
	"#db2777", // Rosa
	"#dc2626", // Vermelho
	"#f97316", // Laranja
	"#f59e0b", // Âmbar
	"#84cc16", // Lima
	"#22c55e", // Verde
	"#14b8a6", // Turquesa
] as const;

/** Nome de cada cor da paleta, para leitores de tela e dicas. */
export const CURSOR_COLOR_NAMES: Record<string, string> = {
	"#38bdf8": "Céu",
	"#2563eb": "Azul",
	"#4f46e5": "Índigo",
	"#9333ea": "Roxo",
	"#c026d3": "Fúcsia",
	"#db2777": "Rosa",
	"#dc2626": "Vermelho",
	"#f97316": "Laranja",
	"#f59e0b": "Âmbar",
	"#84cc16": "Lima",
	"#22c55e": "Verde",
	"#14b8a6": "Turquesa",
};

export const DEFAULT_CURSOR_COLOR: string = CURSOR_PALETTE[0];

const HEX = /^#[0-9a-f]{6}$/i;

/**
 * Aceita só `#rrggbb`. Tudo que vem da rede (presença, cursor) passa por aqui:
 * o payload nunca é confiável, e a cor vira número no Pixi e `style` no React.
 */
export function normalizeCursorColor(value: unknown): string | null {
	if (typeof value !== "string") return null;
	const text = value.trim();
	return HEX.test(text) ? text.toLowerCase() : null;
}

/** FNV-1a: espalha bem ids parecidos (uuid) e dá o mesmo número sempre. */
export function hashUserId(userId: string): number {
	let hash = 0x811c9dc5;
	for (let i = 0; i < userId.length; i++) {
		hash ^= userId.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash >>> 0;
}

/**
 * A cor padrão da pessoa: a que o id dela indica ou, se alguém na mesa já usa,
 * a próxima livre da paleta. Sem ninguém usando, é sempre a mesma.
 */
export function pickCursorColor(
	userId: string,
	taken: readonly (string | null | undefined)[] = [],
): string {
	const used = new Set(
		taken
			.map((color) => normalizeCursorColor(color))
			.filter((color): color is string => color !== null),
	);
	const start = hashUserId(userId) % CURSOR_PALETTE.length;
	for (let step = 0; step < CURSOR_PALETTE.length; step++) {
		const color = CURSOR_PALETTE[(start + step) % CURSOR_PALETTE.length];
		if (!used.has(color)) return color;
	}
	return CURSOR_PALETTE[start];
}

export interface CursorColorPeer {
	userId: string;
	color: string;
	onlineAt: number;
	/** Escolheu a cor à mão (vale mais que a automática). */
	chosen?: boolean;
}

/**
 * A cor automática cede quando outra pessoa tem a mesma: para quem escolheu à
 * mão, ou para quem entrou antes (entrando ao mesmo tempo, decide o id). Assim
 * duas pessoas que se juntam sem se ver resolvem sozinhas, sem combinar nada.
 * Quem escolheu a cor à mão nunca cede.
 */
export function mustYieldColor(
	me: CursorColorPeer,
	others: readonly CursorColorPeer[],
): boolean {
	if (me.chosen) return false;
	const mine = normalizeCursorColor(me.color);
	return others.some((other) => {
		if (other.userId === me.userId) return false;
		if (normalizeCursorColor(other.color) !== mine) return false;
		if (other.chosen) return true;
		if (other.onlineAt !== me.onlineAt) return other.onlineAt < me.onlineAt;
		return other.userId < me.userId;
	});
}

function channel(hex: string, offset: number): number {
	return Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
}

function linear(value: number): number {
	return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
	return (
		0.2126 * linear(channel(hex, 1)) +
		0.7152 * linear(channel(hex, 3)) +
		0.0722 * linear(channel(hex, 5))
	);
}

/** Razão de contraste do WCAG entre duas cores `#rrggbb`. */
export function contrastRatio(a: string, b: string): number {
	const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (light + 0.05) / (dark + 0.05);
}

/** Texto da etiqueta sobre a cor da pessoa: o de maior contraste (≥ 4,5:1). */
export function readableTextColor(background: string): "#ffffff" | "#000000" {
	const color = normalizeCursorColor(background) ?? DEFAULT_CURSOR_COLOR;
	return contrastRatio(color, "#ffffff") >= contrastRatio(color, "#000000")
		? "#ffffff"
		: "#000000";
}

/** `#rrggbb` para o número que o Pixi usa. */
export function colorToNumber(color: string): number {
	const normalized = normalizeCursorColor(color) ?? DEFAULT_CURSOR_COLOR;
	return Number.parseInt(normalized.slice(1), 16);
}
