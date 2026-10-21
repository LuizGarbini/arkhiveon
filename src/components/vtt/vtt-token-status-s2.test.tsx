// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VTTScene, VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const showToast = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", async (orig) => ({
	...(await orig<typeof import("@/components/ui/toast")>()),
	showToast,
}));

import { VTTTokenMenu } from "./vtt-token-menu";
import { VTTTokenStatusTooltip } from "./vtt-token-status-tooltip";

const base: VTTToken = {
	id: "tok-1",
	sceneId: "s1",
	name: "Goblin",
	layer: "token",
	x: 200,
	y: 300,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: ["caido"],
	auras: [],
	visionRange: 0,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
};

/** Menu lendo o token da store, como na mesa (otimista aparece na hora). */
function LiveMenu({
	save,
}: {
	save: (id: string, u: Partial<VTTToken>) => Promise<unknown>;
}) {
	const token = useVTTStore((s) => s.tokens[0] ?? null);
	return (
		<VTTTokenMenu
			token={token}
			onUpdateToken={save}
			onDeleteToken={vi.fn(async () => {})}
		/>
	);
}

const conds = () => useVTTStore.getState().tokens[0].conditions;

beforeEach(() => {
	showToast.mockReset();
	useVTTStore.setState({
		isGM: true,
		tokens: [base],
		activeTokenIdForMenu: "tok-1",
		scenes: [{ id: "s1", gridSize: 70 } as VTTScene],
		activeSceneId: "s1",
		viewport: { x: 0, y: 0, scale: 1 },
		hoveredStatusTokenId: null,
		draggedTokenId: null,
	});
});
afterEach(cleanup);

describe("Status S2 — salvar otimista", () => {
	it("aplica na hora, mostra 'Salvando' e mantém quando o servidor aceita", async () => {
		let resolve!: (ok: boolean) => void;
		const save = vi.fn(
			() =>
				new Promise<boolean>((r) => {
					resolve = r;
				}),
		);
		render(<LiveMenu save={save} />);
		fireEvent.click(screen.getByRole("button", { name: "Envenenado" }));
		expect(conds()).toEqual(["caido", "envenenado"]);
		expect(screen.getByText("Salvando token…")).toBeTruthy();
		expect(
			screen.getByRole("button", { name: "Cego" }).closest("fieldset")
				?.disabled,
		).toBe(true);
		await act(async () => resolve(true));
		expect(conds()).toEqual(["caido", "envenenado"]);
		expect(showToast).not.toHaveBeenCalled();
		expect(save).toHaveBeenCalledWith("tok-1", {
			conditions: ["caido", "envenenado"],
		});
	});

	it("servidor recusa: volta ao que estava e avisa com toast", async () => {
		const save = vi.fn(async () => false);
		render(<LiveMenu save={save} />);
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Caído" }));
		});
		await waitFor(() => expect(conds()).toEqual(["caido"]));
		expect(showToast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({ title: "Não foi possível salvar o status" }),
		);
	});

	it("rollback: chip Atordoado volta a aria-pressed=false, sem visual de selecionado", async () => {
		const save = vi.fn(async () => false);
		render(<LiveMenu save={save} />);
		const chip = screen.getByRole("button", { name: "Atordoado" });
		expect(chip.getAttribute("aria-pressed")).toBe("false");
		await act(async () => {
			fireEvent.click(chip);
		});
		await waitFor(() => expect(conds()).toEqual(["caido"]));
		const after = screen.getByRole("button", { name: "Atordoado" });
		expect(after.getAttribute("aria-pressed")).toBe("false");
		// Cores do status aplicado (text-yellow-400 / bg-yellow-500/10) não ficam.
		expect(after.className).not.toMatch(/yellow/);
		expect(showToast).toHaveBeenCalledTimes(1);
	});

	it("Select do DS adiciona status (só lista os que faltam)", async () => {
		const save = vi.fn(async () => true);
		render(<LiveMenu save={save} />);
		const trigger = screen.getByRole("combobox", { name: "Adicionar status" });
		await act(async () => {
			fireEvent.click(trigger);
		});
		const options = await screen.findAllByRole("option");
		const names = options.map((o) => o.textContent ?? "");
		expect(names.some((n) => n.includes("Caído"))).toBe(false);
		const cego = options.find((o) => o.textContent?.includes("Cego"));
		await act(async () => {
			fireEvent.mouseMove(cego as HTMLElement);
		});
		await act(async () => {
			fireEvent.click(cego as HTMLElement);
		});
		await waitFor(() => expect(conds()).toEqual(["caido", "cego"]));
	});
});

describe("Status S2 — quem vê o quê", () => {
	it("jogador não vê status de token oculto nem da camada do mestre", async () => {
		useVTTStore.setState({
			isGM: false,
			tokens: [{ ...base, isHidden: true }],
		});
		render(<VTTTokenStatusTooltip />);
		act(() => useVTTStore.getState().setHoveredStatusTokenId("tok-1"));
		expect(screen.queryByTestId("token-status-anchor")).toBeNull();
		act(() => useVTTStore.setState({ tokens: [{ ...base, layer: "gm" }] }));
		expect(screen.queryByTestId("token-status-anchor")).toBeNull();
		act(() => useVTTStore.setState({ isGM: true }));
		expect(await screen.findByText("Caído")).toBeTruthy();
	});
});
