// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ImageAsset } from "@/lib/store";
import { ImageLightbox } from "./image-lightbox";

afterEach(cleanup);

const asset = (id: string, name: string): ImageAsset => ({
	id,
	campaignId: "c1",
	createdBy: "u1",
	name,
	url: `https://cdn.test/${id}.png`,
	mimeType: "image/png",
	sizeBytes: 1024,
	isPrivate: false,
	createdAt: Date.now(),
});

const ASSETS = [
	asset("a", "Dragão"),
	asset("b", "Castelo"),
	asset("c", "Mapa"),
];

function Harness({ onRename = vi.fn() }: { onRename?: (n: string) => void }) {
	const [index, setIndex] = useState<number | null>(0);
	return (
		<ImageLightbox
			assets={ASSETS}
			index={index}
			onIndexChange={setIndex}
			onClose={() => setIndex(null)}
			permissionsFor={() => ({
				canRename: true,
				canDelete: true,
				canTogglePrivate: true,
			})}
			handlersFor={() => ({
				onRename,
				onDelete: vi.fn(),
				onTogglePrivate: vi.fn(),
			})}
			originLabelFor={() => null}
		/>
	);
}

describe("ImageLightbox (wrapper do ImageViewer)", () => {
	it("mantém data-slot, contador, título no painel e alt", async () => {
		render(<Harness />);
		const dialog = await screen.findByRole("dialog", { name: "Dragão" });
		expect(dialog.getAttribute("data-slot")).toBe("image-lightbox");
		expect(dialog.textContent).toContain("1 / 3");
		expect(screen.getByRole("img", { name: "Dragão" })).toBeTruthy();
	});

	it("setas da tela e do teclado navegam com volta ao início", async () => {
		render(<Harness />);
		const dialog = await screen.findByRole("dialog");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Próxima imagem" }));
		});
		expect(dialog.textContent).toContain("2 / 3");
		expect(screen.getByRole("img", { name: "Castelo" })).toBeTruthy();
		await act(async () => {
			fireEvent.keyDown(dialog, { key: "ArrowLeft" });
		});
		await act(async () => {
			fireEvent.keyDown(dialog, { key: "ArrowLeft" });
		});
		expect(dialog.textContent).toContain("3 / 3");
		expect(screen.getByRole("img", { name: "Mapa" })).toBeTruthy();
	});

	it("painel: renomear salva o nome novo", async () => {
		const onRename = vi.fn();
		render(<Harness onRename={onRename} />);
		await screen.findByRole("dialog");
		await act(async () => {
			fireEvent.click(screen.getByRole("button", { name: "Renomear" }));
		});
		const input = screen.getByRole("textbox", { name: "Nome da imagem" });
		await act(async () => {
			fireEvent.change(input, { target: { value: "Dragão vermelho" } });
		});
		await act(async () => {
			fireEvent.click(
				screen.getByRole("button", { name: "Salvar nome da imagem" }),
			);
		});
		expect(onRename).toHaveBeenCalledWith("Dragão vermelho");
		expect(screen.getByRole("button", { name: "Tornar privada" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "Remover imagem" })).toBeTruthy();
	});
});
