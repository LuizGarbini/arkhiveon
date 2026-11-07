// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createSceneSession } from "@/lib/vtt/scene-session";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

// Controlled DS event seam: emits preview without the keyboard's immediate commit.
vi.mock("@/components/ui/slider", () => ({
	Slider: ({
		thumbLabel,
		value,
		onValueChange,
	}: {
		thumbLabel: string;
		value: number;
		onValueChange: (n: number) => void;
	}) => (
		<input
			type="range"
			aria-label={thumbLabel}
			value={value}
			min={10}
			max={400}
			onChange={(e) => onValueChange(Number(e.target.value))}
		/>
	),
}));

import { VTTGridSettings } from "./vtt-grid-settings";

const scene: VTTScene = {
	id: "a",
	campaignId: "c",
	name: "A",
	gridType: "square",
	gridSize: 70,
	gridOffsetX: 0,
	gridOffsetY: 0,
	gridColor: "#fff",
	gridOpacity: 0.2,
	gridScaleDistance: 1.5,
	gridScaleUnit: "m",
	mapScale: 1,
	width: 1000,
	height: 1000,
	fogEnabled: false,
	fogExploration: false,
	isActive: true,
	orderIndex: 0,
};
beforeEach(() => {
	vi.useFakeTimers();
	useVTTStore.setState({
		isGM: true,
		showGridSettings: true,
		activeSceneId: "a",
		scenes: [scene, { ...scene, id: "b" }],
		gridMoreOpen: false,
	});
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
});
it("cleanup cancela somente preview não commitado ao trocar cena", async () => {
	const save = vi.fn().mockResolvedValue(true);
	render(<VTTGridSettings onUpdateSceneSettings={save} />);
	fireEvent.change(screen.getByRole("slider", { name: "Tamanho da célula" }), {
		target: { value: "90" },
	});
	expect(useVTTStore.getState().scenes[0].gridSize).toBe(90);
	act(() => useVTTStore.getState().setActiveSceneId("b"));
	await act(async () => vi.advanceTimersByTimeAsync(300));
	expect(save).toHaveBeenCalledTimes(0);
	expect(useVTTStore.getState().scenes[0].gridSize).toBe(70);
});
it("cleanup de preview não descarta writer/patch aceito do P1", async () => {
	let ack!: (v: undefined) => void;
	const writer = vi.fn(
		() =>
			new Promise<undefined>((r) => {
				ack = r;
			}),
	);
	const session = createSceneSession({
		userId: "gm",
		campaignId: "c",
		sessionId: "tab",
		writeScene: writer,
		scaleScene: async () => ({ kind: "confirmed" }),
		readGeometry: async () => null,
	});
	for (const s of useVTTStore.getState().scenes) session.acceptRemote(s);
	const saving = session.update("a", { gridSize: 71 });
	await vi.advanceTimersByTimeAsync(0);
	render(
		<VTTGridSettings
			session={session}
			onUpdateSceneSettings={(patch) => session.update("a", patch)}
		/>,
	);
	fireEvent.change(screen.getByRole("slider", { name: "Tamanho da célula" }), {
		target: { value: "90" },
	});
	act(() => useVTTStore.getState().setActiveSceneId("b"));
	await act(async () => vi.advanceTimersByTimeAsync(300));
	expect(writer).toHaveBeenCalledTimes(1);
	expect(session.persistence.getSceneSnapshot("a").pendingPatch).toEqual({
		gridSize: 71,
	});
	expect(useVTTStore.getState().scenes[0].gridSize).toBe(71);
	ack(undefined);
	await act(async () => saving);
	session.dispose();
});
