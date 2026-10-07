// @vitest-environment jsdom

import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VTTGridSettings } from "@/components/vtt/vtt-grid-settings";
import { VTTSheetDrawer } from "@/components/vtt/vtt-sheet-drawer";
import { VTTTemplateControls } from "@/components/vtt/vtt-template-controls";
import { VTTTokenMenu } from "@/components/vtt/vtt-token-menu";
import type { VTTToken } from "./types";
import { useVTTStore } from "./vtt-store";

const rolls = vi.hoisted(() => ({ starts: 0, stops: 0 }));
vi.mock("@/lib/store", () => ({
	RPG_SYSTEMS: [],
	getAttributeFullName: (label: string) => label,
	useRPGStore: (selector: (s: { characters: never[] }) => unknown) =>
		selector({ characters: [] }),
	abilityModifier: () => 0,
	formatModifier: () => "+0",
}));
vi.mock("@/components/dice-roll-overlay", async () => {
	const { useEffect } = await import("react");
	return {
		DiceRollOverlay: ({
			open,
			onComplete,
			onClose,
		}: {
			open: boolean;
			onComplete: unknown;
			onClose: unknown;
		}) => {
			useEffect(() => {
				if (open) {
					rolls.starts++;
					return () => {
						rolls.stops++;
					};
				}
			}, [open, onComplete, onClose]);
			return null;
		},
	};
});
const initial = useVTTStore.getState();
const a: VTTToken = {
	id: "a",
	sceneId: "scene",
	characterId: "hero",
	name: "A",
	x: 0,
	y: 0,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	layer: "token",
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
	hpCurrent: 20,
	hpMax: 20,
};
const b = { ...a, id: "b", name: "B", hpCurrent: 10 };
const template = {
	id: "one",
	kind: "sphere" as const,
	originX: 0,
	originY: 0,
	targetX: 70,
	targetY: 70,
	color: "white",
};
beforeEach(() => {
	useVTTStore.setState(initial, true);
	rolls.starts = 0;
	rolls.stops = 0;
});
afterEach(cleanup);
it("preserves multiple remote placed templates by ID", () => {
	const store = useVTTStore.getState();
	store.setRemoteTemplate("player", template);
	store.setRemoteTemplate("player", { ...template, id: "two" });
	expect(
		Object.values(useVTTStore.getState().remoteTemplates)
			.map((t) => t.id)
			.sort(),
	).toEqual(["one", "two"]);
});
it("edits the exact token opened from the token panel", () => {
	useVTTStore.setState({ tokens: [a, b], activeTokenIdForMenu: "b" });
	const update = vi.fn().mockResolvedValue(undefined);
	render(
		<>
			<VTTTokenMenu token={b} onUpdateToken={update} onDeleteToken={update} />
			<VTTSheetDrawer onUpdateToken={update} />
		</>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Abrir ficha na mesa" }));
	expect(useVTTStore.getState().activeTokenIdForMenu).toBeNull();
	fireEvent.click(screen.getByRole("button", { name: "-1" }));
	expect(update).toHaveBeenCalledWith("b", { hpCurrent: 9 });
});
it("keeps the running dice renderer when unrelated tokens update", () => {
	useVTTStore.setState({ tokens: [a, b], showCharacterSheetId: "b" });
	render(<VTTSheetDrawer onUpdateToken={vi.fn()} />);
	fireEvent.click(screen.getByRole("button", { name: "Rolar d20" }));
	act(() => useVTTStore.getState().updateToken("a", { x: 200 }));
	expect(rolls.starts).toBe(1);
	expect(rolls.stops).toBe(0);
});
it("associates grid scale and unit labels with inputs", () => {
	useVTTStore.setState({
		showGridSettings: true,
		activeSceneId: "scene",
		scenes: [
			{
				id: "scene",
				campaignId: "c",
				name: "scene",
				gridType: "square",
				gridSize: 70,
				gridColor: "white",
				gridOpacity: 0.2,
				gridScaleDistance: 1.5,
				gridScaleUnit: "m",
				width: 1000,
				height: 1000,
				fogEnabled: false,
				fogExploration: false,
				isActive: true,
				orderIndex: 0,
			},
		],
	});
	render(<VTTGridSettings onUpdateSceneSettings={vi.fn()} />);
	expect(screen.getByRole("spinbutton", { name: "Escala" })).toBeTruthy();
	expect(screen.getByRole("combobox", { name: "Unidade" })).toBeTruthy();
});

it("keeps the token panel inside both horizontal viewport edges", () => {
	for (const x of [-500, 0, 5000]) {
		const token = { ...a, x };
		useVTTStore.setState({ tokens: [token], activeTokenIdForMenu: "a" });
		const { unmount } = render(
			<VTTTokenMenu
				token={token}
				onUpdateToken={vi.fn()}
				onDeleteToken={vi.fn()}
			/>,
		);
		const button = screen.getByRole("button", { name: "Travar no Lugar" });
		const panel = button.closest(".fixed") as HTMLElement;
		const left = Number.parseFloat(panel.style.left);
		expect(left).toBeGreaterThanOrEqual(12);
		// The panel is at most 20rem (320px) wide.
		expect(left + 320).toBeLessThanOrEqual(window.innerWidth);
		unmount();
	}
});

it("broadcasts IDs when clearing local templates and removes only the author copies", () => {
	const store = useVTTStore.getState();
	store.addPlacedTemplate(template);
	store.addPlacedTemplate({ ...template, id: "two" });
	store.setActiveTool("template");
	store.setRemoteTemplate("player", template);
	store.setRemoteTemplate("player", { ...template, id: "two" });
	store.setRemoteTemplate("other", { ...template, id: "other" });
	const broadcast = vi.fn((ids: string[]) =>
		useVTTStore.getState().removeRemoteTemplates("player", ids),
	);
	render(<VTTTemplateControls onClearTemplates={broadcast} />);
	fireEvent.click(screen.getByRole("button", { name: "Limpar moldes (2)" }));
	expect(broadcast).toHaveBeenCalledWith(["one", "two"]);
	expect(useVTTStore.getState().placedTemplates).toHaveLength(0);
	expect(Object.keys(useVTTStore.getState().remoteTemplates)).toEqual([
		"other",
	]);
});
it("preview movement and cancellation preserve committed remote templates", () => {
	const store = useVTTStore.getState();
	store.setRemoteTemplate("player", template);
	store.setRemoteTemplatePreview("player", {
		...template,
		id: "live-template",
	});
	store.setRemoteTemplatePreview("player", null);
	expect(Object.keys(useVTTStore.getState().remoteTemplates)).toEqual(["one"]);
	expect(useVTTStore.getState().remoteTemplatePreviews).toEqual({});
});
