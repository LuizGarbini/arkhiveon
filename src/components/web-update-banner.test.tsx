// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	parseBuildId,
	shouldOfferWebUpdate,
	WEB_UPDATE_SNOOZE_KEY,
} from "@/lib/web-update";

vi.mock("@/lib/apk-update", () => ({ isAndroidApp: () => false }));
vi.mock("@/lib/web-update", async (importOriginal) => {
	const real = await importOriginal<typeof import("@/lib/web-update")>();
	return { ...real, currentBuildId: () => "build-a" };
});

import { WebUpdateBanner } from "./web-update-banner";

const reload = vi.fn();
let served = "build-b";

beforeEach(() => {
	vi.stubEnv("DEV", false);
	served = "build-b";
	sessionStorage.clear();
	vi.stubGlobal(
		"fetch",
		vi.fn(async () => ({ ok: true, json: async () => ({ buildId: served }) })),
	);
	Object.defineProperty(window, "location", {
		configurable: true,
		value: { ...window.location, reload },
	});
});
afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	reload.mockClear();
});

async function mount() {
	await act(async () => {
		render(<WebUpdateBanner />);
	});
}

describe("Nova versão disponível (web)", () => {
	it("deploy novo mostra o aviso; Atualizar recarrega só no clique", async () => {
		await mount();
		expect(screen.getByText("Nova versão disponível")).toBeTruthy();
		expect(reload).not.toHaveBeenCalled();
		fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
		expect(reload).toHaveBeenCalledTimes(1);
	});

	it("mesma versão não mostra nada", async () => {
		served = "build-a";
		await mount();
		expect(screen.queryByText("Nova versão disponível")).toBeNull();
	});

	it("Depois esconde e não volta para o mesmo build ao reabrir a aba", async () => {
		await mount();
		fireEvent.click(screen.getByRole("button", { name: "Depois" }));
		expect(screen.queryByText("Nova versão disponível")).toBeNull();
		expect(sessionStorage.getItem(WEB_UPDATE_SNOOZE_KEY)).toBe("build-b");
		cleanup();
		await mount();
		expect(screen.queryByText("Nova versão disponível")).toBeNull();
	});

	it("volta a checar quando a aba fica visível e mostra um build mais novo", async () => {
		served = "build-a";
		await mount();
		expect(screen.queryByText("Nova versão disponível")).toBeNull();
		served = "build-c";
		vi.spyOn(Date, "now").mockReturnValue(Date.now() + 120_000);
		Object.defineProperty(document, "visibilityState", {
			configurable: true,
			value: "visible",
		});
		await act(async () => {
			document.dispatchEvent(new Event("visibilitychange"));
		});
		expect(screen.getByText("Nova versão disponível")).toBeTruthy();
		vi.restoreAllMocks();
	});

	it("falha de rede fica em silêncio", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => {
				throw new Error("offline");
			}),
		);
		await mount();
		expect(screen.queryByText("Nova versão disponível")).toBeNull();
	});
});

describe("regras", () => {
	it("parseBuildId e shouldOfferWebUpdate", () => {
		expect(parseBuildId({ buildId: " x " })).toBe("x");
		expect(parseBuildId({})).toBeNull();
		expect(parseBuildId(null)).toBeNull();
		expect(shouldOfferWebUpdate("a", "b", null)).toBe(true);
		expect(shouldOfferWebUpdate("a", "a", null)).toBe(false);
		expect(shouldOfferWebUpdate("a", "b", "b")).toBe(false);
		expect(shouldOfferWebUpdate("", "b", null)).toBe(false);
		expect(shouldOfferWebUpdate("a", null, null)).toBe(false);
	});
});
