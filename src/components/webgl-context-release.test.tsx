// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Contexto WebGL falso: só o que os componentes usam ao liberar. */
type FakeGl = { loseContext: ReturnType<typeof vi.fn> };

const contexts = new Map<HTMLCanvasElement, FakeGl>();

function fakeGlFor(canvas: HTMLCanvasElement) {
	let entry = contexts.get(canvas);
	if (!entry) {
		entry = { loseContext: vi.fn() };
		contexts.set(canvas, entry);
	}
	const { loseContext } = entry;
	return {
		getExtension: (name: string) =>
			name === "WEBGL_lose_context" ? { loseContext } : null,
	};
}

vi.mock("@/lib/performance-mode", () => ({
	isLitePerformanceMode: () => false,
}));

// Os shaders reais precisam de WebGL2; aqui cada um só desenha um <canvas>.
vi.mock("@paper-design/shaders-react", () => ({
	MeshGradient: () => <canvas data-testid="shader-canvas" />,
	Dithering: () => <canvas data-testid="shader-canvas" />,
}));

const rendererSpies = {
	dispose: vi.fn(),
	forceContextLoss: vi.fn(),
};

vi.mock("three", async (importOriginal) => {
	const actual = await importOriginal<typeof import("three")>();
	class FakeWebGLRenderer {
		domElement = document.createElement("canvas");
		setPixelRatio() {}
		setSize() {}
		setClearColor() {}
		render() {}
		dispose() {
			rendererSpies.dispose();
		}
		forceContextLoss() {
			rendererSpies.forceContextLoss();
		}
	}
	return { ...actual, WebGLRenderer: FakeWebGLRenderer };
});

beforeEach(() => {
	contexts.clear();
	rendererSpies.dispose.mockClear();
	rendererSpies.forceContextLoss.mockClear();
	vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
	vi.stubGlobal("requestIdleCallback", (cb: () => void) => {
		cb();
		return 1;
	});
	vi.stubGlobal("cancelIdleCallback", () => {});
	vi.stubGlobal(
		"matchMedia",
		vi.fn(() => ({
			matches: false,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	);
	const getContext = function (this: HTMLCanvasElement) {
		return fakeGlFor(this);
	} as unknown as HTMLCanvasElement["getContext"];
	vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
		getContext,
	);
});

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

async function findShaderCanvas(container: HTMLElement) {
	await vi.waitFor(() => {
		expect(
			container.querySelector('[data-testid="shader-canvas"]'),
		).not.toBeNull();
	});
	return container.querySelector<HTMLCanvasElement>(
		'[data-testid="shader-canvas"]',
	) as HTMLCanvasElement;
}

describe("liberação de contextos WebGL ao desmontar", () => {
	it("banner do painel (MeshGradient) chama loseContext no unmount", async () => {
		const { DashboardHeroBackground } = await import(
			"@/components/dashboard-hero-background"
		);
		const { container, unmount } = render(<DashboardHeroBackground />);
		const canvas = await findShaderCanvas(container);
		const shaderGl = contexts.get(canvas);

		// O teste de suporte já liberou o próprio contexto.
		const probes = [...contexts.entries()].filter(([c]) => c !== canvas);
		expect(probes.length).toBeGreaterThan(0);
		for (const [, gl] of probes) expect(gl.loseContext).toHaveBeenCalled();

		expect(shaderGl?.loseContext ?? vi.fn()).not.toHaveBeenCalled();
		act(() => unmount());
		expect(contexts.get(canvas)?.loseContext).toHaveBeenCalledTimes(1);
	});

	it("banner do Discord (Dithering) chama loseContext no unmount", async () => {
		const { DiscordDitherBanner } = await import(
			"@/components/discord-dither-banner"
		);
		const { container, unmount } = render(<DiscordDitherBanner />);
		const canvas = await findShaderCanvas(container);

		const probes = [...contexts.entries()].filter(([c]) => c !== canvas);
		expect(probes.length).toBeGreaterThan(0);
		for (const [, gl] of probes) expect(gl.loseContext).toHaveBeenCalled();

		act(() => unmount());
		expect(contexts.get(canvas)?.loseContext).toHaveBeenCalledTimes(1);
	});

	it("d20 chama renderer.forceContextLoss no unmount", async () => {
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				observe() {}
				disconnect() {}
			},
		);
		vi.stubGlobal("requestAnimationFrame", () => 1);
		vi.stubGlobal("cancelAnimationFrame", () => {});
		const { D20Canvas } = await import("@/components/d20-canvas");
		const { unmount } = render(<D20Canvas />);

		for (const [, gl] of contexts) expect(gl.loseContext).toHaveBeenCalled();
		expect(rendererSpies.forceContextLoss).not.toHaveBeenCalled();
		act(() => unmount());
		expect(rendererSpies.dispose).toHaveBeenCalledTimes(1);
		expect(rendererSpies.forceContextLoss).toHaveBeenCalledTimes(1);
	});
});
