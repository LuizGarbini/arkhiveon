// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { ImageViewer } from "./image-viewer";

afterEach(cleanup);

function Harness({ src = "https://cdn.test/a.png" }: { src?: string }) {
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);
	return (
		<>
			<button ref={triggerRef} type="button" onClick={() => setOpen(true)}>
				Abrir
			</button>
			<ImageViewer
				open={open}
				onOpenChange={setOpen}
				src={src}
				alt="Tiamat"
				title="Tiamat"
				finalFocus={triggerRef}
			/>
		</>
	);
}

async function openViewer() {
	await act(async () => {
		fireEvent.click(screen.getByRole("button", { name: "Abrir" }));
	});
	return screen.findByRole("dialog");
}

describe("ImageViewer", () => {
	it("abre com título acessível, alt e imagem em object-contain", async () => {
		render(<Harness />);
		const dialog = await openViewer();
		expect(dialog.textContent).toContain("Tiamat");
		expect(screen.getByRole("dialog", { name: "Tiamat" })).toBeTruthy();
		const img = screen.getByRole("img", { name: "Tiamat" });
		expect(img.getAttribute("src")).toBe("https://cdn.test/a.png");
		expect(img.className).toContain("object-contain");
	});

	it("mostra carregando até a imagem carregar", async () => {
		render(<Harness />);
		const dialog = await openViewer();
		expect(
			dialog.querySelector('[data-slot="image-viewer-loading"]'),
		).not.toBeNull();
		await act(async () => {
			fireEvent.load(screen.getByRole("img", { name: "Tiamat" }));
		});
		expect(
			dialog.querySelector('[data-slot="image-viewer-loading"]'),
		).toBeNull();
	});

	it("mostra o estado de erro quando a imagem falha", async () => {
		render(<Harness />);
		await openViewer();
		await act(async () => {
			fireEvent.error(screen.getByRole("img", { name: "Tiamat" }));
		});
		expect(screen.getByRole("alert").textContent).toContain(
			"Não foi possível carregar a imagem",
		);
		expect(screen.queryByRole("img", { name: "Tiamat" })).toBeNull();
	});

	it("fecha no X e devolve o foco ao gatilho", async () => {
		render(<Harness />);
		await openViewer();
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
		await waitFor(() =>
			expect(document.activeElement).toBe(
				screen.getByRole("button", { name: "Abrir" }),
			),
		);
	});

	it("fecha no Esc", async () => {
		render(<Harness />);
		const dialog = await openViewer();
		await act(async () => {
			fireEvent.keyDown(dialog, { key: "Escape" });
		});
		await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
	});

	it("o X tem alvo de 44 px", async () => {
		render(<Harness />);
		await openViewer();
		expect(screen.getByRole("button", { name: "Fechar" }).className).toContain(
			"size-[44px]",
		);
	});
});
