// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ImageAsset } from "@/lib/store";
import {
	EntityImagePicker,
	PRIVATE_SOURCE_NOTICE,
} from "./entity-image-picker";

const upload = vi.fn(async () => "https://r2.test/npcs/copia.webp");
const addImageAsset = vi.fn();

function asset(id: string, isPrivate: boolean): ImageAsset {
	return {
		id,
		campaignId: "c1",
		name: id,
		url: `https://r2.test/${id}.webp`,
		isPrivate,
	} as ImageAsset;
}

const lookup = new Map<string, ImageAsset>([
	["privada", asset("privada", true)],
	["publica", asset("publica", false)],
]);

vi.mock("@/lib/store", () => ({
	useActiveCampaignId: () => "c1",
	useActiveCampaignRole: () => "owner",
	useIsCampaignMaster: () => true,
	useImageAssetLookup: () => lookup,
	useRPGStore: (selector: (s: unknown) => unknown) =>
		selector({ loadImageAssets: vi.fn(async () => {}), addImageAsset }),
}));

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({ session: { user: { id: "u1" } } }),
}));

vi.mock("@/lib/image-storage", () => ({
	imageStorage: { upload: (...args: unknown[]) => upload(...(args as [])) },
}));

vi.mock("@/lib/image-metadata", () => ({
	readImageDimensions: async () => ({ width: 10, height: 10 }),
	readableFileName: (name: string) => name,
}));

vi.mock("@/components/image-library-picker-dialog", () => ({
	ImageLibraryPickerDialog: ({
		assets,
		onSelect,
		onOpenChange,
	}: {
		assets: ImageAsset[];
		onSelect: (a: ImageAsset) => void;
		onOpenChange: (open: boolean) => void;
	}) => (
		<div>
			{assets.map((a) => (
				<button
					key={a.id}
					type="button"
					onClick={() => {
						onSelect(a);
						onOpenChange(false);
					}}
				>
					escolher {a.id}
				</button>
			))}
		</div>
	),
}));

vi.mock("@/components/image-crop-dialog", () => ({
	ImageCropDialog: ({
		notice,
		onApply,
	}: {
		notice?: React.ReactNode;
		onApply: (blob: Blob) => Promise<void>;
	}) => (
		<div role="dialog">
			{notice}
			<button
				type="button"
				onClick={() => void onApply(new Blob(["x"], { type: "image/webp" }))}
			>
				Aplicar recorte
			</button>
		</div>
	),
}));

function renderPicker(value = { imageUrl: "", imageAssetId: "" }) {
	const onChange = vi.fn();
	render(<EntityImagePicker value={value} onChange={onChange} folder="npcs" />);
	return onChange;
}

async function pickFromLibrary(id: string) {
	fireEvent.click(screen.getByRole("button", { name: /Biblioteca/ }));
	fireEvent.click(screen.getByRole("button", { name: `escolher ${id}` }));
	await screen.findByRole("button", { name: "Aplicar recorte" });
}

describe("EntityImagePicker · aviso de imagem privada", () => {
	afterEach(cleanup);

	beforeEach(() => {
		upload.mockClear();
		addImageAsset.mockClear();
	});

	it("asset privado da galeria mostra o aviso no recorte", async () => {
		renderPicker();
		await pickFromLibrary("privada");
		expect(screen.getByRole("note").textContent).toBe(PRIVATE_SOURCE_NOTICE);
	});

	it("asset público da galeria não mostra o aviso", async () => {
		renderPicker();
		await pickFromLibrary("publica");
		expect(screen.queryByRole("note")).toBeNull();
	});

	it("upload novo não mostra o aviso", async () => {
		const { container } = render(
			<EntityImagePicker
				value={{ imageUrl: "", imageAssetId: "" }}
				onChange={vi.fn()}
				folder="npcs"
			/>,
		);
		const input = container.querySelector(
			'input[type="file"]',
		) as HTMLInputElement;
		globalThis.URL.createObjectURL = vi.fn(() => "blob:novo");
		fireEvent.change(input, {
			target: { files: [new File(["x"], "novo.png", { type: "image/png" })] },
		});
		await screen.findByRole("button", { name: "Aplicar recorte" });
		expect(screen.queryByRole("note")).toBeNull();
	});

	it("recortar a imagem atual ligada a asset privado também avisa", async () => {
		renderPicker({ imageUrl: "", imageAssetId: "privada" });
		fireEvent.click(screen.getByRole("button", { name: /Recortar/ }));
		await screen.findByRole("button", { name: "Aplicar recorte" });
		expect(screen.getByRole("note").textContent).toBe(PRIVATE_SOURCE_NOTICE);
	});

	it("salvar com aviso continua subindo a cópia e aplicando a imagem", async () => {
		const onChange = renderPicker();
		await pickFromLibrary("privada");
		fireEvent.click(screen.getByRole("button", { name: "Aplicar recorte" }));
		await waitFor(() =>
			expect(onChange).toHaveBeenCalledWith(
				expect.objectContaining({
					imageUrl: "https://r2.test/npcs/copia.webp",
					imageAssetId: "",
				}),
			),
		);
		expect(upload).toHaveBeenCalledTimes(1);
		expect(addImageAsset).toHaveBeenCalledTimes(1);
	});
});
