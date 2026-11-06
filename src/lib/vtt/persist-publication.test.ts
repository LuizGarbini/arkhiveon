import { describe, expect, it, vi } from "vitest";
import { type PublishSceneRpc, publishScene } from "./persist-publication";

function fixture() {
	const rpc = vi.fn<PublishSceneRpc>().mockResolvedValue({
		data: "scene-b",
		error: null,
	});
	const scenes = [
		{ id: "scene-a", isActive: true },
		{ id: "scene-b", isActive: false },
	];
	const toast = vi.fn();
	return { rpc, scenes, toast };
}

describe("P0 — publicação atômica", () => {
	it("chama uma única RPC e publica a cena somente após a confirmação", async () => {
		const { rpc, scenes, toast } = fixture();
		await expect(
			publishScene({ sceneId: "scene-b", rpc, scenes, toast }),
		).resolves.toEqual([
			{ id: "scene-a", isActive: false },
			{ id: "scene-b", isActive: true },
		]);
		expect(rpc).toHaveBeenCalledExactlyOnceWith("publish_scene", {
			p_scene_id: "scene-b",
		});
		expect(toast).not.toHaveBeenCalled();
	});

	it("recusa permissão pelo toast e não produz uma troca otimista", async () => {
		const { rpc, scenes, toast } = fixture();
		rpc.mockResolvedValue({
			data: null,
			error: { code: "42501", message: "sem permissão" },
		});
		await expect(
			publishScene({ sceneId: "scene-b", rpc, scenes, toast }),
		).rejects.toThrow("sem permissão");
		expect(toast).toHaveBeenCalledExactlyOnceWith("error", {
			title: "Não foi possível exibir a cena",
			description: "sem permissão",
		});
	});

	it("mantém o erro de rede e não converte a publicação em sucesso", async () => {
		const { rpc, scenes, toast } = fixture();
		rpc.mockResolvedValue({
			data: null,
			error: { code: "NETWORK", message: "Failed to fetch" },
		});
		await expect(
			publishScene({ sceneId: "scene-b", rpc, scenes, toast }),
		).rejects.toThrow("Failed to fetch");
		expect(toast).toHaveBeenCalledExactlyOnceWith("error", {
			title: "Não foi possível exibir a cena",
			description: "Failed to fetch",
		});
		expect(scenes[0].isActive).toBe(true);
	});

	it("usa uma chamada também para ativar novamente a cena corrente", async () => {
		const { rpc, scenes, toast } = fixture();
		rpc.mockResolvedValue({ data: "scene-a", error: null });
		await expect(
			publishScene({ sceneId: "scene-a", rpc, scenes, toast }),
		).resolves.toEqual(scenes);
		expect(rpc).toHaveBeenCalledExactlyOnceWith("publish_scene", {
			p_scene_id: "scene-a",
		});
	});

	it("não mascara uma rejeição de transporte da RPC", async () => {
		const { rpc, scenes, toast } = fixture();
		rpc.mockRejectedValue(new TypeError("NetworkError"));
		await expect(
			publishScene({ sceneId: "scene-b", rpc, scenes, toast }),
		).rejects.toThrow("NetworkError");
		expect(toast).toHaveBeenCalledExactlyOnceWith("error", {
			title: "Não foi possível exibir a cena",
			description: "NetworkError",
		});
	});
});
