import { describe, expect, it } from "vitest";
import {
	isFullscreenTabletopPath,
	pickLayoutPathname,
} from "./layout-pathname";

describe("pickLayoutPathname", () => {
	it("usa a rota resolvida enquanto a mesa ainda carrega", () => {
		const path = pickLayoutPathname("/campaigns/c1/vtt", "/dashboard");
		expect(path).toBe("/dashboard");
		expect(isFullscreenTabletopPath(path)).toBe(false);
	});

	it("vira tela cheia quando a mesa termina de carregar", () => {
		const path = pickLayoutPathname("/campaigns/c1/vtt", "/campaigns/c1/vtt");
		expect(isFullscreenTabletopPath(path)).toBe(true);
	});

	it("no primeiro carregamento (sem rota resolvida) usa a URL", () => {
		expect(pickLayoutPathname("/campaigns/c1/vtt", undefined)).toBe(
			"/campaigns/c1/vtt",
		);
	});

	it("ao sair da mesa mantém tela cheia até o painel carregar", () => {
		const path = pickLayoutPathname("/dashboard", "/campaigns/c1/vtt");
		expect(isFullscreenTabletopPath(path)).toBe(true);
	});
});
