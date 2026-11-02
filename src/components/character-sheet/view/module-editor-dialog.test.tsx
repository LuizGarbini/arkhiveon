// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultSheetLayout } from "@/lib/sheet-modules";
import type { Character } from "@/lib/store";
import { ModuleEditorDialog } from "./module-editor-dialog";

const TECHNICAL =
	'duplicate key value violates unique constraint "characters_pkey"';

function character(): Character {
	return {
		id: "ficha-1",
		system: "dnd5e",
		characterName: "Thalia",
		speed: 30,
		sheetLayout: createDefaultSheetLayout("dnd5e"),
	} as Character;
}

afterEach(cleanup);

describe("ModuleEditorDialog erro ao salvar", () => {
	it("mostra frase em português mesmo quando error.message é técnico", async () => {
		const sheet = character();
		const layout = sheet.sheetLayout ?? createDefaultSheetLayout("dnd5e");
		const combat = layout.modules.find((module) => module.kind === "combat");
		if (!combat) throw new Error("módulo de combate ausente");
		const onSave = vi.fn(() => Promise.reject(new Error(TECHNICAL)));
		render(
			<ModuleEditorDialog
				character={sheet}
				module={combat}
				layout={layout}
				open
				onOpenChange={() => {}}
				onSave={onSave}
			/>,
		);
		const speed = document.querySelector<HTMLInputElement>(
			'input[name="speed"]',
		);
		if (!speed) throw new Error("campo Deslocamento não encontrado");
		fireEvent.change(speed, { target: { value: "35" } });
		fireEvent.click(screen.getByRole("button", { name: "Salvar módulo" }));
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toBe("Não foi possível salvar. Tente de novo.");
		expect(document.body.textContent).not.toContain(TECHNICAL);
		expect(onSave).toHaveBeenCalledTimes(1);
	});
});
