import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
	deleteRemote: vi.fn(),
	deleteFile: vi.fn(),
}));

vi.mock("../remote-store", async (importOriginal) => ({
	...(await importOriginal<typeof import("../remote-store")>()),
	deleteRemoteImageAsset: mocks.deleteRemote,
}));
vi.mock("../image-storage", async (importOriginal) => ({
	...(await importOriginal<typeof import("../image-storage")>()),
	imageStorage: { upload: vi.fn(), delete: mocks.deleteFile },
}));

import { useRPGStore } from "../store";
import type { ImageAsset } from "./types";

const URL_A = "https://cdn.exemplo.com/u1/npcs/1760000000000-aaa.webp";
const asset = (id: string, url = URL_A) =>
	({ id, url, name: id }) as unknown as ImageAsset;
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
	mocks.deleteRemote.mockReset().mockResolvedValue(undefined);
	mocks.deleteFile.mockReset().mockResolvedValue(undefined);
	useRPGStore.setState({ imageAssets: [asset("a1")], characters: [] });
});
afterEach(() => vi.restoreAllMocks());

describe("excluir imagem da galeria", () => {
	it("apaga a linha e só depois o arquivo", async () => {
		const order: string[] = [];
		mocks.deleteRemote.mockImplementation(async () => {
			order.push("linha");
		});
		mocks.deleteFile.mockImplementation(async () => {
			order.push("arquivo");
		});
		useRPGStore.getState().removeImageAsset("a1");
		expect(useRPGStore.getState().imageAssets).toHaveLength(0);
		await flush();
		expect(order).toEqual(["linha", "arquivo"]);
		expect(mocks.deleteFile).toHaveBeenCalledWith(URL_A);
	});

	it("se o servidor recusar a exclusão, a imagem volta e o arquivo fica", async () => {
		mocks.deleteRemote.mockRejectedValue(new Error("sem permissão"));
		useRPGStore.getState().removeImageAsset("a1");
		await flush();
		expect(useRPGStore.getState().imageAssets.map((a) => a.id)).toEqual(["a1"]);
		expect(mocks.deleteFile).not.toHaveBeenCalled();
	});

	it("arquivo que uma ficha ainda usa direto não é apagado", async () => {
		useRPGStore.setState({
			characters: [{ id: "c1", imageUrl: URL_A }] as never,
		});
		useRPGStore.getState().removeImageAsset("a1");
		await flush();
		expect(mocks.deleteRemote).toHaveBeenCalledTimes(1);
		expect(mocks.deleteFile).not.toHaveBeenCalled();
	});

	it("outra imagem da galeria com a mesma URL segura o arquivo", async () => {
		useRPGStore.setState({ imageAssets: [asset("a1"), asset("a2")] });
		useRPGStore.getState().removeImageAsset("a1");
		await flush();
		expect(mocks.deleteFile).not.toHaveBeenCalled();
	});

	it("falha ao apagar o arquivo não desfaz a exclusão na galeria", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		mocks.deleteFile.mockRejectedValue(new Error("r2 fora do ar"));
		useRPGStore.getState().removeImageAsset("a1");
		await flush();
		expect(useRPGStore.getState().imageAssets).toHaveLength(0);
		expect(warn).toHaveBeenCalled();
	});
});
