import { beforeEach, expect, it, vi } from "vitest";
import { useVTTStore } from "./vtt-store";

const mock = vi.hoisted(() => ({
	answer: Promise.resolve({
		data: [] as {
			id: string;
			scene_id: string;
			x1: number;
			y1: number;
			x2: number;
			y2: number;
		}[],
		error: null,
	}),
}));
vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: () => ({
			select: () => ({ eq: () => ({ order: () => mock.answer }) }),
		}),
	}),
}));
vi.mock("@/components/ui/toast", () => ({ showToast: vi.fn() }));

import { loadWalls } from "./wall-sync";

beforeEach(() =>
	useVTTStore.setState({ activeSceneId: "a", walls: [], wallsStatus: "ready" }),
);
it("GET de paredes iniciado antes da escala não sobrescreve geometria posterior", async () => {
	let answer!: (v: Awaited<typeof mock.answer>) => void;
	mock.answer = new Promise((r) => {
		answer = r;
	});
	let current = true;
	const pending = loadWalls("a", () => current);
	current = false;
	const scaled = { id: "wall", sceneId: "a", x1: 20, y1: 40, x2: 60, y2: 80 };
	useVTTStore.setState({ walls: [scaled], wallsStatus: "ready" });
	answer({
		data: [{ id: "wall", scene_id: "a", x1: 10, y1: 20, x2: 30, y2: 40 }],
		error: null,
	});
	await pending;
	expect(useVTTStore.getState().walls).toEqual([scaled]);
	expect(useVTTStore.getState().wallsStatus).toBe("ready");
});
