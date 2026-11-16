// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountPage } from "@/routes/account";
import { TablePhotoCard } from "./table-photo-card";

vi.mock("@/components/image-crop-dialog", () => ({
	ImageCropDialog: ({
		open,
		onApply,
	}: {
		open: boolean;
		onApply: (blob: Blob) => void;
	}) =>
		open ? (
			<button
				type="button"
				onClick={() => onApply(new Blob(["foto"], { type: "image/webp" }))}
			>
				Aplicar recorte
			</button>
		) : null,
}));

const STORAGE = {
	supabaseUrl: "https://axnektdqoxjhbbfsidfj.supabase.co",
	r2PublicUrl: "https://pub-7550a50cda5849b48c17ab5f0ad3118e.r2.dev",
};
const GOOGLE = "https://lh3.googleusercontent.com/a/foto";
const R2 =
	"https://pub-7550a50cda5849b48c17ab5f0ad3118e.r2.dev/user/table-photo/a.webp";

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	URL.createObjectURL = vi.fn(() => "blob:foto-mesa");
	URL.revokeObjectURL = vi.fn();
});

function setup(
	props: Partial<{
		metadata: unknown;
		onSave: (mode: string, url?: string | null) => Promise<string | null>;
		onUpload: (file: File) => Promise<string>;
	}> = {},
) {
	const onSave = props.onSave ?? vi.fn(async () => null);
	const onUpload = props.onUpload ?? vi.fn(async () => R2);
	render(
		<TablePhotoCard
			name="Luiz"
			metadata={props.metadata ?? { avatar_url: GOOGLE }}
			color="#db2777"
			config={STORAGE}
			onSave={onSave}
			onUpload={onUpload}
		/>,
	);
	return { onSave, onUpload };
}

describe("Foto na mesa", () => {
	it("mostra a foto do Google na prévia, com a cor do cursor na borda", () => {
		setup();
		const preview = screen.getByRole("img", { name: "Prévia da foto na mesa" });
		expect(preview.getAttribute("src")).toContain("lh3.googleusercontent.com");
		// #db2777, a cor do cursor, no formato que o DOM devolve.
		expect(preview.parentElement?.style.borderColor).toBe("rgb(219, 39, 119)");
		expect(
			(
				screen.getByRole("radio", {
					name: "Foto do Google",
				}) as HTMLInputElement
			).checked,
		).toBe(true);
		const initials = screen
			.getByRole("radio", { name: "Só iniciais" })
			.closest("label");
		expect(initials?.className).toContain("h-11");
		expect(initials?.className).not.toContain("w-full");
	});

	it("sem foto do Google, oferece só as iniciais", () => {
		setup({ metadata: {} });
		expect(screen.queryByRole("radio", { name: "Foto do Google" })).toBeNull();
		expect(
			(screen.getByRole("radio", { name: "Só iniciais" }) as HTMLInputElement)
				.checked,
		).toBe(true);
		expect(screen.getByText("LU")).toBeTruthy();
	});

	it("escolher iniciais troca a prévia na hora e grava o modo", async () => {
		let finish: (message: string | null) => void = () => {};
		const onSave = vi.fn(
			() =>
				new Promise<string | null>((resolve) => {
					finish = resolve;
				}),
		);
		setup({ onSave });
		fireEvent.click(screen.getByRole("radio", { name: "Só iniciais" }));
		expect(await screen.findByText("LU")).toBeTruthy();
		expect(
			screen.queryByRole("img", { name: "Prévia da foto na mesa" }),
		).toBeNull();
		expect(onSave).toHaveBeenCalledWith("initials", null);
		await act(async () => {
			finish(null);
		});
	});

	it("se gravar falha, o erro aparece e a prévia volta", async () => {
		const { onSave } = setup({
			onSave: vi.fn(async () => "Sessão expirada"),
		});
		fireEvent.click(screen.getByRole("radio", { name: "Só iniciais" }));
		expect((await screen.findByRole("alert")).textContent).toContain(
			"Sessão expirada",
		);
		expect(
			screen.getByRole("img", { name: "Prévia da foto na mesa" }),
		).toBeTruthy();
		expect(onSave).toHaveBeenCalledOnce();
	});

	it("desabilita o envio enquanto a imagem sobe e mostra o erro ao lado", async () => {
		let finish: (url: string) => void = () => {};
		const onUpload = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					finish = resolve;
				}),
		);
		const onSave = vi.fn(async () => null);
		setup({ onSave, onUpload });
		const input = screen.getByLabelText(
			"Enviar e recortar",
		) as HTMLInputElement;
		const file = new File(["foto"], "retrato.png", { type: "image/png" });
		fireEvent.change(input, { target: { files: [file] } });
		fireEvent.click(
			await screen.findByRole("button", { name: "Aplicar recorte" }),
		);
		expect(await screen.findByText("Enviando…")).toBeTruthy();
		expect(input.disabled).toBe(true);
		expect(onSave).not.toHaveBeenCalled();
		await act(async () => {
			finish(R2);
		});
		expect(onSave).toHaveBeenCalledWith("custom", R2);
		expect(input.disabled).toBe(false);

		onUpload.mockRejectedValueOnce(new Error("Sem rede"));
		fireEvent.change(input, { target: { files: [file] } });
		fireEvent.click(
			await screen.findByRole("button", { name: "Aplicar recorte" }),
		);
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toContain("Sem rede");
		expect(alert.parentElement).toBe(input.parentElement);
		expect(input.disabled).toBe(false);
	});

	it("não grava endereço perigoso nem arquivo que não é imagem", async () => {
		const { onSave, onUpload } = setup({
			onUpload: vi.fn(async () => "javascript:alert(1)"),
		});
		const input = screen.getByLabelText(
			"Enviar e recortar",
		) as HTMLInputElement;
		fireEvent.change(input, {
			target: {
				files: [new File(["x"], "a.png", { type: "image/png" })],
			},
		});
		fireEvent.click(
			await screen.findByRole("button", { name: "Aplicar recorte" }),
		);
		expect((await screen.findByRole("alert")).textContent).toMatch(/mesa/i);
		expect(onSave).not.toHaveBeenCalled();

		fireEvent.change(input, {
			target: {
				files: [new File(["x"], "nota.txt", { type: "text/plain" })],
			},
		});
		expect((await screen.findByRole("alert")).textContent).toMatch(/imagem/i);
		expect(onUpload).toHaveBeenCalledTimes(1);
	});

	it("a página Minha conta mostra Foto na mesa", () => {
		render(<AccountPage />);
		expect(screen.getByRole("heading", { name: "Foto na mesa" })).toBeTruthy();
		expect(screen.getByRole("radio", { name: "Só iniciais" })).toBeTruthy();
		expect(screen.getByLabelText("Enviar e recortar")).toBeTruthy();
	});

	it("a foto enviada fica como opção e a do Google continua ao lado", () => {
		setup({
			metadata: {
				avatar_url: GOOGLE,
				table_photo: "custom",
				table_photo_url: R2,
			},
		});
		expect(
			(screen.getByRole("radio", { name: "Foto enviada" }) as HTMLInputElement)
				.checked,
		).toBe(true);
		expect(screen.getByRole("radio", { name: "Foto do Google" })).toBeTruthy();
		expect(
			screen
				.getByRole("img", { name: "Prévia da foto na mesa" })
				.getAttribute("src"),
		).toContain("r2.dev");
	});
});
