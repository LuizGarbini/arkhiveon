import { describe, expect, it } from "vitest";
import {
	HERO_COLLAPSE_AFTER_PX,
	HERO_FREED_PX,
	HERO_SETTLE_MS,
	nextHeroCollapsed,
} from "./hero-collapse";

const settled = HERO_SETTLE_MS + 1;
const tall = HERO_FREED_PX + 200; // dá para rolar bastante mesmo depois de recolher

describe("nextHeroCollapsed", () => {
	it("aberto: recolhe ao passar do limite de rolagem", () => {
		expect(
			nextHeroCollapsed({
				collapsed: false,
				scrollTop: HERO_COLLAPSE_AFTER_PX + 1,
				overflow: tall,
				sinceToggleMs: settled,
			}),
		).toBe(true);
	});

	it("aberto: rolou pouco, continua aberto", () => {
		expect(
			nextHeroCollapsed({
				collapsed: false,
				scrollTop: HERO_COLLAPSE_AFTER_PX,
				overflow: tall,
				sinceToggleMs: settled,
			}),
		).toBe(false);
		expect(
			nextHeroCollapsed({
				collapsed: false,
				scrollTop: 0,
				overflow: tall,
				sinceToggleMs: settled,
			}),
		).toBe(false);
	});

	it("conteúdo curto: NÃO recolhe (depois de recolher não teria mais o que rolar e reabriria)", () => {
		expect(
			nextHeroCollapsed({
				collapsed: false,
				scrollTop: 100,
				overflow: HERO_FREED_PX,
				sinceToggleMs: settled,
			}),
		).toBe(false);
	});

	it("recolhido: só reabre no topo", () => {
		expect(
			nextHeroCollapsed({
				collapsed: true,
				scrollTop: 0,
				overflow: tall,
				sinceToggleMs: settled,
			}),
		).toBe(false);
		expect(
			nextHeroCollapsed({
				collapsed: true,
				scrollTop: 1,
				overflow: tall,
				sinceToggleMs: settled,
			}),
		).toBe(true);
		expect(
			nextHeroCollapsed({
				collapsed: true,
				scrollTop: 400,
				overflow: tall,
				sinceToggleMs: settled,
			}),
		).toBe(true);
	});

	it("logo depois de uma troca, ignora (anti pisca-pisca)", () => {
		expect(
			nextHeroCollapsed({
				collapsed: true,
				scrollTop: 0,
				overflow: tall,
				sinceToggleMs: 10,
			}),
		).toBe(true);
		expect(
			nextHeroCollapsed({
				collapsed: false,
				scrollTop: 500,
				overflow: tall,
				sinceToggleMs: 10,
			}),
		).toBe(false);
	});

	it("nunca oscila: simulação de rolagem para baixo e para cima termina estável", () => {
		let collapsed = false;
		let t = 0;
		const log: boolean[] = [];
		const run = (scrollTop: number) => {
			t += 300;
			const next = nextHeroCollapsed({
				collapsed,
				scrollTop,
				overflow: tall,
				sinceToggleMs: t,
			});
			if (next !== collapsed) {
				collapsed = next;
				t = 0;
			}
			log.push(collapsed);
		};
		for (const y of [0, 10, 40, 80, 120, 80, 40, 5, 0]) run(y);
		const changes = log.filter((v, i) => i > 0 && v !== log[i - 1]).length;
		expect(changes).toBe(2); // recolheu uma vez e reabriu uma vez
		expect(collapsed).toBe(false);
	});
});
