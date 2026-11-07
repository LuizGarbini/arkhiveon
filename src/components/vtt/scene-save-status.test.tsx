// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { WriteFailure } from "@/lib/vtt/persistence-queue";
import { createSceneSession, type SceneSession } from "@/lib/vtt/scene-session";
import type { VTTScene } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";
import { SceneSaveStatus } from "./scene-save-status";

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
const sessions: SceneSession[] = [];
beforeEach(() => {
	vi.useFakeTimers();
	useVTTStore.setState({
		isGM: true,
		scenes: [scene, { ...scene, id: "b" }],
		activeSceneId: "a",
	});
});
afterEach(() => {
	cleanup();
	for (const s of sessions.splice(0)) s.dispose();
	vi.useRealTimers();
});
async function setup() {
	let answer!: (v: WriteFailure | undefined) => void;
	const writer = vi
		.fn()
		.mockResolvedValueOnce({ kind: "permanent", message: "negado" })
		.mockImplementation(
			() =>
				new Promise<WriteFailure | undefined>((r) => {
					answer = r;
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
	sessions.push(session);
	for (const s of useVTTStore.getState().scenes) session.acceptRemote(s);
	const initial = session.update("a", { gridSize: 72 });
	await vi.advanceTimersByTimeAsync(0);
	expect(await initial).toBe(false);
	const retry = vi.spyOn(session.persistence, "retry");
	return { session, writer, retry, answer: (v?: WriteFailure) => answer(v) };
}
it("duplo clique durante retry chama handler uma vez e mostra disabled/aria-busy/spinner até ACK", async () => {
	const { session, retry, writer, answer } = await setup();
	render(<SceneSaveStatus session={session} sceneId="a" />);
	const button = screen.getByRole("button", { name: "Tentar novamente" });
	act(() => {
		fireEvent.click(button);
		fireEvent.click(button);
	});
	expect(retry).toHaveBeenCalledTimes(1);
	expect(button.hasAttribute("disabled")).toBe(true);
	expect(button.getAttribute("aria-busy")).toBe("true");
	expect(button.querySelector(".animate-spin")).not.toBeNull();
	await act(async () => vi.advanceTimersByTimeAsync(0));
	expect(writer).toHaveBeenCalledTimes(2);
	await act(async () => {
		answer();
		await vi.advanceTimersByTimeAsync(0);
	});
	expect(screen.queryByRole("alert")).toBeNull();
	expect(screen.getByText("Ajustes salvos.")).toBeTruthy();
});
it("retry recusado termina loading sem apagar delta e permite tentar novamente", async () => {
	const { session, retry, answer } = await setup();
	render(<SceneSaveStatus session={session} sceneId="a" />);
	fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
	await act(async () => vi.advanceTimersByTimeAsync(0));
	await act(async () => {
		answer({ kind: "permanent", message: "ainda negado" });
		await vi.advanceTimersByTimeAsync(0);
	});
	const button = screen.getByRole("button", { name: "Tentar novamente" });
	expect(button.hasAttribute("disabled")).toBe(false);
	expect(button.getAttribute("aria-busy")).toBe("false");
	expect(session.persistence.getSceneSnapshot("a").pendingPatch).toEqual({
		gridSize: 72,
	});
	fireEvent.click(button);
	expect(retry).toHaveBeenCalledTimes(2);
});
it("remount e A→B→A durante retry mantêm busy de A sem vazar para B", async () => {
	const { session, retry, answer } = await setup();
	const view = render(<SceneSaveStatus session={session} sceneId="a" />);
	fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
	await act(async () => vi.advanceTimersByTimeAsync(0));
	view.rerender(<SceneSaveStatus session={session} sceneId="b" />);
	expect(screen.queryByRole("button")).toBeNull();
	view.rerender(<SceneSaveStatus session={session} sceneId="a" />);
	const button = screen.getByRole("button", { name: "Tentar novamente" });
	expect(button.hasAttribute("disabled")).toBe(true);
	fireEvent.click(button);
	expect(retry).toHaveBeenCalledTimes(1);
	await act(async () => {
		answer();
		await vi.advanceTimersByTimeAsync(0);
	});
	expect(screen.getByText("Ajustes salvos.")).toBeTruthy();
});
it("mensagem de erro reutiliza o token destructive do DS", async () => {
	const { session } = await setup();
	render(<SceneSaveStatus session={session} sceneId="a" />);
	expect(
		screen.getByText("Não foi possível salvar este ajuste.").className,
	).toContain("text-destructive");
});
