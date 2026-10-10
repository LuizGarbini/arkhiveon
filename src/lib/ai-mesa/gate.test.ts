import { describe, expect, it } from "vitest";
import { canUseMesaAssistant, isVttPath } from "./gate";

describe("canUseMesaAssistant", () => {
	it("libera dono, owner e editor", () => {
		expect(canUseMesaAssistant({ ownerId: "u1" }, "u1")).toBe(true);
		expect(canUseMesaAssistant({ ownerId: "x", myRole: "owner" }, "u1")).toBe(
			true,
		);
		expect(canUseMesaAssistant({ ownerId: "x", myRole: "editor" }, "u1")).toBe(
			true,
		);
	});
	it("bloqueia jogador/leitor, sem campanha ou sem usuário", () => {
		expect(canUseMesaAssistant({ ownerId: "x", myRole: "player" }, "u1")).toBe(
			false,
		);
		expect(canUseMesaAssistant({ ownerId: "x", myRole: "viewer" }, "u1")).toBe(
			false,
		);
		expect(canUseMesaAssistant(undefined, "u1")).toBe(false);
		expect(canUseMesaAssistant({ ownerId: "u1" }, undefined)).toBe(false);
	});
});

describe("isVttPath", () => {
	it("reconhece rotas da mesa", () => {
		expect(isVttPath("/campaigns/abc/vtt")).toBe(true);
		expect(isVttPath("/campaigns/abc/vtt/")).toBe(true);
	});
	it("não confunde outras rotas", () => {
		expect(isVttPath("/sheets")).toBe(false);
		expect(isVttPath("/world")).toBe(false);
		expect(isVttPath("/npcs/vttish")).toBe(false);
	});
});
