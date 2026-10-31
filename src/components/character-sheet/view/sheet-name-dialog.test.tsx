// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { thalia } from "@/core/rules/thalia.fixture";
import { CharacterNameDialog } from "./sheet-name-dialog";

const draftKey = `arkhiveon:draft:character-name:${thalia.id}`;

function seedDraft(name: string) {
	sessionStorage.setItem(
		draftKey,
		JSON.stringify({ v: 1, savedAt: 1, values: { name } }),
	);
}

function input() {
	return screen.getByPlaceholderText("Ex: Lyra Cinzal") as HTMLInputElement;
}

function clickOutside() {
	const overlay = document.querySelector('[data-slot="dialog-overlay"]');
	expect(overlay).not.toBeNull();
	fireEvent.click(overlay as Element);
}

function Harness({ onSave }: { onSave: (name: string) => void }) {
	const [open, setOpen] = useState(true);
	return (
		<>
			<p>{open ? "dialog-aberto" : "dialog-fechado"}</p>
			<button type="button" onClick={() => setOpen(true)}>
				Reabrir
			</button>
			<CharacterNameDialog
				character={thalia}
				open={open}
				onOpenChange={setOpen}
				onSave={onSave}
			/>
		</>
	);
}

beforeEach(() => {
	sessionStorage.clear();
});

afterEach(cleanup);

describe("CharacterNameDialog salva ao fechar", () => {
	it("nome válido diferente do inicial salva ao clicar fora e apaga o rascunho", () => {
		seedDraft("velho");
		const onSave = vi.fn();
		render(<Harness onSave={onSave} />);
		fireEvent.change(input(), { target: { value: "  Lyra Cinzal  " } });
		clickOutside();
		expect(onSave).toHaveBeenCalledTimes(1);
		expect(onSave).toHaveBeenCalledWith("Lyra Cinzal");
		expect(sessionStorage.getItem(draftKey)).toBeNull();
		expect(screen.getByText("dialog-fechado")).toBeTruthy();
	});

	it("nome vazio vira rascunho e é restaurado ao reabrir", () => {
		const onSave = vi.fn();
		render(<Harness onSave={onSave} />);
		fireEvent.change(input(), { target: { value: "" } });
		clickOutside();
		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByText("dialog-fechado")).toBeTruthy();
		const raw = sessionStorage.getItem(draftKey);
		expect(raw).not.toBeNull();
		expect(JSON.parse(raw ?? "").values).toEqual({ name: "" });

		fireEvent.click(screen.getByRole("button", { name: "Reabrir" }));
		expect(input().value).toBe("");
		const hint = screen.getByText("Rascunho restaurado");
		expect(hint.className).toContain("text-muted-foreground");
	});

	it("Cancelar limpa o rascunho e descarta o que foi digitado", () => {
		seedDraft("");
		const onSave = vi.fn();
		render(<Harness onSave={onSave} />);
		expect(screen.getByText("Rascunho restaurado")).toBeTruthy();
		fireEvent.change(input(), { target: { value: "Lyra" } });
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		expect(onSave).not.toHaveBeenCalled();
		expect(sessionStorage.getItem(draftKey)).toBeNull();
		expect(screen.getByText("dialog-fechado")).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Reabrir" }));
		expect(input().value).toBe("Thalia Ventoclaro");
		expect(screen.queryByText("Rascunho restaurado")).toBeNull();
	});

	it("sem mudança só fecha, sem salvar e sem gravar rascunho", () => {
		const onSave = vi.fn();
		render(<Harness onSave={onSave} />);
		clickOutside();
		expect(onSave).not.toHaveBeenCalled();
		expect(sessionStorage.getItem(draftKey)).toBeNull();
		expect(screen.getByText("dialog-fechado")).toBeTruthy();
	});

	it("o X limpa o rascunho e não salva", () => {
		seedDraft("Rascunho");
		const onSave = vi.fn();
		render(<Harness onSave={onSave} />);
		fireEvent.click(screen.getByRole("button", { name: "Close" }));
		expect(onSave).not.toHaveBeenCalled();
		expect(sessionStorage.getItem(draftKey)).toBeNull();
	});

	it("Salvar nome apaga o rascunho", () => {
		seedDraft("");
		const onSave = vi.fn();
		render(<Harness onSave={onSave} />);
		fireEvent.change(input(), { target: { value: "Lyra Cinzal" } });
		fireEvent.click(screen.getByRole("button", { name: "Salvar nome" }));
		expect(onSave).toHaveBeenCalledWith("Lyra Cinzal");
		expect(sessionStorage.getItem(draftKey)).toBeNull();
		expect(screen.getByText("dialog-fechado")).toBeTruthy();
	});
});
