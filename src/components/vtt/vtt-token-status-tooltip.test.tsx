// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { VTTTokenStatusTooltip } from "./vtt-token-status-tooltip";

const token = {
	id: "tok-1",
	sceneId: "s1",
	name: "Goblin",
	layer: "token",
	x: 200,
	y: 300,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: ["envenenado", "caido", "cego", "chamas"],
	auras: [],
	visionRange: 0,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
} as VTTToken;

beforeEach(() => {
	useVTTStore.setState({
		tokens: [token],
		scenes: [{ id: "s1", gridSize: 70 } as VTTScene],
		activeSceneId: "s1",
		viewport: { x: 10, y: 20, scale: 2 },
		hoveredStatusTokenId: null,
		draggedTokenId: null,
	});
});
afterEach(cleanup);

describe("Tooltip de status sobre o token", () => {
	it("sem hover não mostra nada", () => {
		render(<VTTTokenStatusTooltip />);
		expect(screen.queryByTestId("token-status-anchor")).toBeNull();
	});

	it("hover mostra todos os status (inclusive os do +N), no topo do token", async () => {
		render(<VTTTokenStatusTooltip />);
		act(() => useVTTStore.getState().setHoveredStatusTokenId("tok-1"));
		await screen.findByText("Em Chamas");
		const labels = [...document.querySelectorAll("[data-status-label]")].map(
			(el) => el.textContent?.replace("· ", ""),
		);
		expect(labels).toEqual(["Envenenado", "Caído", "Cego", "Em Chamas"]);
		// Cada status, inclusive os escondidos no "+N", tem o ícone lucide.
		expect(
			[...document.querySelectorAll("[data-status-icon]")].map((el) =>
				el.getAttribute("data-status-icon"),
			),
		).toEqual(["biohazard", "arrow-down-to-line", "eye-off", "flame"]);
		const anchor = screen.getByTestId("token-status-anchor");
		// x = 200*2+10; topo = 300*2+20 - 35*2
		expect(anchor.style.left).toBe("410px");
		expect(anchor.style.top).toBe("550px");
		expect(document.querySelector("[title]")).toBeNull();
	});

	it("arrastando o token, o tooltip some", () => {
		render(<VTTTokenStatusTooltip />);
		act(() =>
			useVTTStore.setState({
				hoveredStatusTokenId: "tok-1",
				draggedTokenId: "tok-1",
			}),
		);
		expect(screen.queryByTestId("token-status-anchor")).toBeNull();
	});

	it("token sem status não abre tooltip", () => {
		useVTTStore.setState({ tokens: [{ ...token, conditions: [] }] });
		render(<VTTTokenStatusTooltip />);
		act(() => useVTTStore.getState().setHoveredStatusTokenId("tok-1"));
		expect(screen.queryByTestId("token-status-anchor")).toBeNull();
	});
});
