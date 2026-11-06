import { describe, expect, it, vi } from "vitest";
import type { PersistenceWrite } from "./persistence-queue";
import { createSceneWriter } from "./scene-persistence-writer";

const write: PersistenceWrite = {
	key: "scene:a",
	scope: { campaignId: "campaign", sceneId: "a" },
	sessionId: "tab",
	seq: 1,
	generation: 1,
	kind: "update",
	patch: { grid_size: 64 },
	attempt: 1,
	sentAt: 0,
};
function transport(result: {
	data: { id: string; updated_at: string } | null;
	error: unknown;
}) {
	const maybeSingle = vi.fn().mockResolvedValue(result);
	const select = vi.fn().mockReturnValue({ maybeSingle });
	const eqCampaign = vi.fn().mockReturnValue({ select });
	const eqScene = vi.fn().mockReturnValue({ eq: eqCampaign });
	const update = vi.fn().mockReturnValue({ eq: eqScene });
	const client = { from: vi.fn().mockReturnValue({ update }) };
	return { client, update, eqScene, eqCampaign, select, maybeSingle };
}

describe("P2a — writer da cena", () => {
	it("escreve com escopo de campanha e exige exatamente uma linha", async () => {
		const db = transport({
			data: { id: "a", updated_at: "2026-11-06" },
			error: null,
		});
		const save = createSceneWriter(db.client);
		await expect(save(write)).resolves.toBeUndefined();
		expect(db.client.from).toHaveBeenCalledWith("vtt_scenes");
		expect(db.update).toHaveBeenCalledWith({ grid_size: 64 });
		expect(db.eqScene).toHaveBeenCalledWith("id", "a");
		expect(db.eqCampaign).toHaveBeenCalledWith("campaign_id", "campaign");
		expect(db.select).toHaveBeenCalledWith("id, updated_at");
		expect(db.maybeSingle).toHaveBeenCalledOnce();
	});
	it("não transforma RLS com zero linhas em salvamento", async () => {
		const save = createSceneWriter(
			transport({ data: null, error: null }).client,
		);
		await expect(save(write)).resolves.toEqual({
			kind: "permanent",
			message: "Cena inexistente ou sem permissão para salvar",
		});
	});
	it("classifica permissão, sessão e erros transitórios", async () => {
		const denied = createSceneWriter(
			transport({ data: null, error: { code: "42501", message: "denied" } })
				.client,
		);
		expect(await denied(write)).toMatchObject({ kind: "permanent" });
		const session = createSceneWriter(
			transport({
				data: null,
				error: { code: "PGRST303", message: "JWT expired" },
			}).client,
		);
		expect(await session(write)).toMatchObject({ kind: "session" });
		const offline = createSceneWriter(null);
		expect(await offline(write)).toMatchObject({ kind: "transient" });
		await expect(
			createSceneWriter({
				from: () => {
					throw new Error("unknown");
				},
			})(write),
		).resolves.toMatchObject({ kind: "transient" });
	});
	it("não inventa colunas nem envia update vazio", async () => {
		const db = transport({ data: { id: "a", updated_at: "now" }, error: null });
		const save = createSceneWriter(db.client);
		expect(await save({ ...write, patch: {} })).toMatchObject({
			kind: "permanent",
		});
		expect(db.update).not.toHaveBeenCalled();
	});
});
