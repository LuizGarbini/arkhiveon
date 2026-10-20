// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EntityImageViewer } from "./entity-image-viewer";

afterEach(cleanup);

const SRC = "https://cdn.test/elbereth.png";

async function openFromTrigger(name = "Elbereth") {
	const trigger = screen.getByRole("button", {
		name: `Ver imagem de ${name} em tela cheia`,
	});
	await act(async () => {
		fireEvent.click(trigger);
	});
	await screen.findByRole("dialog", { name });
	return trigger;
}

describe("EntityImageViewer", () => {
	it("sem src não há gatilho (sem imagem ou privada)", () => {
		const { container } = render(
			<EntityImageViewer src="" name="Elbereth" canEdit onEdit={vi.fn()} />,
		);
		expect(container.innerHTML).toBe("");
		render(<EntityImageViewer name="Elbereth" />);
		expect(screen.queryByRole("button")).toBeNull();
	});

	it("gatilho acessível com aria-haspopup e alvo de 44 px", () => {
		render(<EntityImageViewer src={SRC} name="Elbereth" />);
		const trigger = screen.getByRole("button", {
			name: "Ver imagem de Elbereth em tela cheia",
		});
		expect(trigger.getAttribute("aria-haspopup")).toBe("dialog");
		expect(trigger.className).toContain("min-h-[44px]");
		expect(trigger.className).toContain("focus-visible:ring-2");
	});

	it("viewer abre a imagem e não vê Trocar imagem", async () => {
		render(<EntityImageViewer src={SRC} name="Elbereth" canEdit={false} />);
		await openFromTrigger();
		expect(screen.getByRole("img", { name: "Elbereth" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Trocar imagem" })).toBeNull();
	});

	it("owner: Trocar imagem fecha o viewer, chama onEdit e o foco fica no gatilho", async () => {
		const onEdit = vi.fn();
		render(
			<EntityImageViewer src={SRC} name="Elbereth" canEdit onEdit={onEdit} />,
		);
		const trigger = await openFromTrigger();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Trocar imagem" }));
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(onEdit).toHaveBeenCalledTimes(1));
		expect(document.activeElement).toBe(trigger);
	});

	it("fechar sem trocar não chama onEdit", async () => {
		const onEdit = vi.fn();
		render(
			<EntityImageViewer src={SRC} name="Elbereth" canEdit onEdit={onEdit} />,
		);
		const trigger = await openFromTrigger();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() => expect(document.activeElement).toBe(trigger));
		expect(onEdit).not.toHaveBeenCalled();
	});

	it("nome vazio vira Sem nome", () => {
		render(<EntityImageViewer src={SRC} name="  " />);
		expect(
			screen.getByRole("button", {
				name: "Ver imagem de Sem nome em tela cheia",
			}),
		).toBeTruthy();
	});
});

describe("EntityImageViewer variant=corner", () => {
	it("botão ícone com tooltip, sem cobrir o retrato, e não propaga o clique", async () => {
		const parentClick = vi.fn();
		render(
			// biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/noStaticElementInteractions: pai de teste
			<div onClick={parentClick}>
				<EntityImageViewer src={SRC} name="Elbereth" variant="corner" />
			</div>,
		);
		const trigger = screen.getByRole("button", {
			name: "Ver imagem de Elbereth em tela cheia",
		});
		expect(trigger.className).not.toContain("inset-0");
		expect(trigger.className).toContain("after:-inset-[10px]");
		await act(async () => {
			fireEvent.click(trigger);
		});
		await screen.findByRole("dialog", { name: "Elbereth" });
		expect(parentClick).not.toHaveBeenCalled();
	});

	it("corner sem src não renderiza", () => {
		const { container } = render(
			<EntityImageViewer name="Elbereth" variant="corner" />,
		);
		expect(container.innerHTML).toBe("");
	});
});
