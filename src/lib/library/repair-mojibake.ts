/**
 * Conserta nomes de arquivo com acento quebrado ("mojibake"): UTF-8 que foi
 * lido como Latin-1 no disco de origem, às vezes ainda em NFD
 * (ex.: "PoÃ§Ãµes" → "Poções", "Ã" vindo como "A" + U+0303).
 *
 * Só mexe nos pares "Ã"/"Â" + caractere U+0080–U+00BF, que é como os acentos
 * do português (U+00A0–U+00FF) aparecem quando o UTF-8 é lido como Latin-1.
 * Cada par é decodificado de volta como UTF-8 estrito; o que não decodifica
 * fica como está. Um byte perdido (ex.: "Ã_lfica", que era "Élfica") não tem
 * como ser adivinhado e continua igual, pra ser renomeado à mão.
 */

const MOJIBAKE_PAIR = /[\u00C2\u00C3][\u0080-\u00BF]/g;
const MOJIBAKE_TEST = /[\u00C2\u00C3][\u0080-\u00BF]/;

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

function decodeLatin1AsUtf8(text: string): string | null {
	const bytes = new Uint8Array(text.length);
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code > 0xff) return null;
		bytes[i] = code;
	}
	try {
		const decoded = strictUtf8.decode(bytes);
		return decoded.includes("\uFFFD") ? null : decoded;
	} catch {
		return null;
	}
}

export function hasMojibake(title: string): boolean {
	return MOJIBAKE_TEST.test(title.normalize("NFC"));
}

export function repairMojibake(title: string): string {
	const nfc = title.normalize("NFC");
	if (!MOJIBAKE_TEST.test(nfc)) return nfc;
	return nfc
		.replace(MOJIBAKE_PAIR, (pair) => decodeLatin1AsUtf8(pair) ?? pair)
		.normalize("NFC");
}

/**
 * Sobrou sinal de nome quebrado que o conserto automático não resolve?
 * ("Ã"/"Â" seguido de byte de continuação, "_", "?" ou U+FFFD; "SÃO" não conta.)
 */
export function needsManualRename(title: string): boolean {
	return /[\u00C2\u00C3][\u0080-\u00BF_?\uFFFD]/.test(title.normalize("NFC"));
}
