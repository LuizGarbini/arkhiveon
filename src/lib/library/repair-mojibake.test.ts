import { describe, expect, it } from "vitest";
import {
	hasMojibake,
	needsManualRename,
	repairMojibake,
} from "./repair-mojibake";

function fromHex(hex: string): string {
	const bytes = new Uint8Array(
		hex.match(/../g)?.map((byte) => Number.parseInt(byte, 16)) ?? [],
	);
	return new TextDecoder().decode(bytes);
}

describe("repairMojibake", () => {
	it("conserta o exemplo do disco (NFD + Latin-1): 'PoÃ§Ãµes' → 'Poções'", () => {
		// 'Po' + 41 cc83 c2a7 + 41 cc83 c2b5 + 'es'
		const broken = fromHex("506f41cc83c2a741cc83c2b56573");
		expect(broken).not.toBe("PoÃ§Ãµes"); // está decomposto (NFD)
		expect(repairMojibake(broken)).toBe("Poções");
	});

	it("conserta a forma já composta", () => {
		expect(repairMojibake("PoÃ§Ãµes MÃ¡gicas")).toBe("Poções Mágicas");
		expect(repairMojibake("CompÃªndio de Magia")).toBe("Compêndio de Magia");
		expect(repairMojibake("Luz, EscuridÃ£o")).toBe("Luz, Escuridão");
		expect(repairMojibake("ExÃ\u00adlio")).toBe("Exílio");
	});

	it("não mexe em nome que já está certo", () => {
		expect(repairMojibake("Poções")).toBe("Poções");
		expect(repairMojibake("Península de Chult")).toBe("Península de Chult");
		expect(repairMojibake("Biblioteca Élfica")).toBe("Biblioteca Élfica");
	});

	it("só normaliza pra NFC quando o acento veio decomposto", () => {
		const nfd = "Caldeirão de Tasha".normalize("NFD");
		expect(repairMojibake(nfd)).toBe("Caldeirão de Tasha");
		expect(repairMojibake(nfd).length).toBe("Caldeirão de Tasha".length);
	});

	it("mantém o byte perdido ('Ã_lfica') como está", () => {
		expect(repairMojibake("Biblioteca Ã_lfica")).toBe("Biblioteca Ã_lfica");
		expect(needsManualRename("Biblioteca Ã_lfica")).toBe(true);
	});

	it("conserta o que dá e deixa o byte perdido no mesmo título", () => {
		const title = "QuintessÃªncia do Ladino - Biblioteca Ã_lfica";
		expect(repairMojibake(title)).toBe(
			"Quintessência do Ladino - Biblioteca Ã_lfica",
		);
	});

	it("não mexe em ASCII", () => {
		const ascii = "D&D 5E - unearthed arcana (v2) - 01_fichas";
		expect(repairMojibake(ascii)).toBe(ascii);
		expect(hasMojibake(ascii)).toBe(false);
		expect(needsManualRename(ascii)).toBe(false);
	});

	it("não confunde maiúscula legítima com nome quebrado", () => {
		expect(repairMojibake("SÃO PAULO")).toBe("SÃO PAULO");
		expect(needsManualRename("SÃO PAULO")).toBe(false);
	});

	it("é idempotente", () => {
		const once = repairMojibake("PoÃ§Ãµes MÃ¡gicas");
		expect(repairMojibake(once)).toBe(once);
	});
});
