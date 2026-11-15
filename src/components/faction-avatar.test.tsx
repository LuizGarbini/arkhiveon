// @vitest-environment jsdom
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FactionAvatar } from "./faction-avatar";

afterEach(cleanup);

const img = (c: HTMLElement) => c.querySelector("img");
const kind = (c: HTMLElement) => c.firstElementChild?.getAttribute("data-kind");

describe("FactionAvatar", () => {
	it("com imagem: mostra o brasão", () => {
		const { container } = render(
			<FactionAvatar imageUrl="https://cdn.test/a.webp" />,
		);
		expect(kind(container)).toBe("image");
		expect(img(container)?.getAttribute("src")).toBe("https://cdn.test/a.webp");
	});

	it("a imagem é decorativa (o nome já está ao lado) e carrega de forma preguiçosa", () => {
		const { container } = render(
			<FactionAvatar imageUrl="https://cdn.test/a.webp" />,
		);
		expect(img(container)?.getAttribute("alt")).toBe("");
		expect(img(container)?.getAttribute("loading")).toBe("lazy");
	});

	it.each([[undefined], [null], [""], ["   "]])(
		"sem imagem (%j): mostra o ícone",
		(url) => {
			const { container } = render(<FactionAvatar imageUrl={url} />);
			expect(kind(container)).toBe("icon");
			expect(img(container)).toBeNull();
			expect(container.querySelector("svg")).not.toBeNull();
		},
	);

	it("patrono sem imagem usa a coroa (dourada); o resto, a bandeira", () => {
		const patron = render(<FactionAvatar isPatron />).container;
		expect(patron.firstElementChild?.className).toMatch(/amber/);
		expect(patron.querySelector("svg")?.getAttribute("class")).toBeTruthy();
		const other = render(<FactionAvatar />).container;
		expect(other.firstElementChild?.className).not.toMatch(/amber/);
		// ícones diferentes: o desenho (path) da coroa não é o da bandeira
		expect(patron.querySelector("svg")?.innerHTML).not.toBe(
			other.querySelector("svg")?.innerHTML,
		);
	});

	it("imagem que não carrega (link quebrado) cai no ícone, sem deixar quadro vazio", () => {
		const { container } = render(
			<FactionAvatar imageUrl="https://cdn.test/quebrada.webp" />,
		);
		fireEvent.error(img(container) as HTMLImageElement);
		expect(kind(container)).toBe("icon");
		expect(img(container)).toBeNull();
	});

	it("se a facção ganha outra imagem depois de uma falha, a nova é tentada", () => {
		const { container, rerender } = render(
			<FactionAvatar imageUrl="https://cdn.test/quebrada.webp" />,
		);
		fireEvent.error(img(container) as HTMLImageElement);
		expect(kind(container)).toBe("icon");
		rerender(<FactionAvatar imageUrl="https://cdn.test/nova.webp" />);
		expect(kind(container)).toBe("image");
		expect(img(container)?.getAttribute("src")).toBe(
			"https://cdn.test/nova.webp",
		);
	});

	it("aceita classes extras sem perder o formato", () => {
		const { container } = render(<FactionAvatar className="mt-0.5" />);
		expect(container.firstElementChild?.className).toMatch(/mt-0\.5/);
		expect(container.firstElementChild?.className).toMatch(/rounded-xl/);
	});
});
