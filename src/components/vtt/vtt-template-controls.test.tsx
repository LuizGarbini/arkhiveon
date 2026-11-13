// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VTTTemplateControls } from "@/components/vtt/vtt-template-controls";
import type { VTTSpellTemplate } from "@/lib/vtt/template-math";
import { useVTTStore } from "@/lib/vtt/vtt-store";

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({
		user: { id: "lia", user_metadata: { full_name: "Lia" } },
	}),
}));

function mold(
	id: string,
	userId: string,
	userName: string,
	spellName: string,
): VTTSpellTemplate {
	return {
		id,
		kind: "sphere",
		originX: 0,
		originY: 0,
		targetX: 70,
		targetY: 0,
		color: "white",
		userId,
		userName,
		spellName,
	};
}

const initial = useVTTStore.getState();

beforeEach(() => {
	useVTTStore.setState(initial, true);
	useVTTStore.setState({ showTemplateControls: true });
});
afterEach(cleanup);

it("lists the spell name and who placed it, and deletes only the chosen template", () => {
	useVTTStore.setState({
		placedTemplates: [mold("bola", "lia", "Lia", "Bola de Fogo")],
		remoteTemplates: {
			muralha: mold("muralha", "otto", "Otto", "Muralha de Gelo"),
		},
	});
	const remove = vi.fn();
	render(
		<VTTTemplateControls
			onClearTemplates={vi.fn()}
			onRemoveTemplates={remove}
		/>,
	);
	expect(screen.getByText("Bola de Fogo")).toBeTruthy();
	expect(screen.getByText("Lia")).toBeTruthy();
	expect(screen.getByText("Muralha de Gelo")).toBeTruthy();
	expect(screen.getByText("Otto")).toBeTruthy();
	expect(screen.queryByText("otto")).toBeNull();
	expect(
		(
			screen.getByRole("button", {
				name: "Excluir Muralha de Gelo de Otto",
			}) as HTMLButtonElement
		).disabled,
	).toBe(true);
	fireEvent.click(
		screen.getByRole("button", { name: "Excluir Bola de Fogo de Lia" }),
	);
	expect(remove).toHaveBeenCalledWith(["bola"]);
	expect(useVTTStore.getState().placedTemplates).toEqual([]);
	expect(Object.keys(useVTTStore.getState().remoteTemplates)).toEqual([
		"muralha",
	]);
});

it("lets a GM delete someone else's template and clear every template", () => {
	useVTTStore.setState({
		isGM: true,
		placedTemplates: [mold("bola", "lia", "Lia", "Bola de Fogo")],
		remoteTemplates: {
			muralha: mold("muralha", "otto", "Otto", "Muralha de Gelo"),
		},
	});
	const clear = vi.fn();
	render(
		<VTTTemplateControls
			onClearTemplates={clear}
			onRemoveTemplates={vi.fn()}
		/>,
	);
	expect(
		(
			screen.getByRole("button", {
				name: "Excluir Muralha de Gelo de Otto",
			}) as HTMLButtonElement
		).disabled,
	).toBe(false);
	fireEvent.click(screen.getByRole("button", { name: "Limpar moldes (2)" }));
	expect(clear).toHaveBeenCalledWith(["bola", "muralha"]);
	expect(useVTTStore.getState().placedTemplates).toEqual([]);
	expect(useVTTStore.getState().remoteTemplates).toEqual({});
});

it("keeps clear-all on the local templates when the viewer is a player", () => {
	useVTTStore.setState({
		isGM: false,
		isCoGM: false,
		placedTemplates: [mold("bola", "lia", "Lia", "Bola de Fogo")],
		remoteTemplates: {
			muralha: mold("muralha", "otto", "Otto", "Muralha de Gelo"),
		},
	});
	const clear = vi.fn();
	render(<VTTTemplateControls onClearTemplates={clear} />);
	fireEvent.click(screen.getByRole("button", { name: "Limpar moldes (1)" }));
	expect(clear).toHaveBeenCalledWith(["bola"]);
	expect(useVTTStore.getState().placedTemplates).toEqual([]);
	expect(Object.keys(useVTTStore.getState().remoteTemplates)).toEqual([
		"muralha",
	]);
});
