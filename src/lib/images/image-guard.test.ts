import { describe, expect, it, vi } from "vitest";
import {
	handleSign,
	IMAGE_SIGN_MAX_IDS,
	isValidStorageKey,
	parseSignRequest,
	type SignableAssetRow,
	type SignDeps,
	selectSignable,
	signingWindow,
} from "../../../supabase/functions/_shared/image-guard";

const OWNER = "00000000-0000-4000-8000-0000000000a1";
const PRIV = "a0000000-0000-4000-8000-000000000001";
const PUB = "a0000000-0000-4000-8000-000000000002";
const MISSING = "a0000000-0000-4000-8000-0000000000ff";
const KEY = `${OWNER}/npcs/1760000000000-11111111-1111-4111-8111-111111111111.webp`;

const privateRow: SignableAssetRow = {
	id: PRIV,
	storage_bucket: "private",
	storage_key: KEY,
};
const publicRow: SignableAssetRow = {
	id: PUB,
	storage_bucket: "public",
	storage_key: KEY,
};

// 2026-10-18T22:37:00Z
const NOW = Date.UTC(2026, 9, 18, 22, 37, 0);

/** `visible` = o que o RLS devolveria para esse usuário. */
function deps(
	userId: string | null,
	visible: SignableAssetRow[],
): SignDeps & { sign: ReturnType<typeof vi.fn> } {
	const sign = vi.fn(
		async (key: string, date: Date, expiresIn: number) =>
			`https://r2.test/${key}?d=${date.toISOString()}&e=${expiresIn}`,
	);
	return {
		getUserId: async () => userId,
		loadVisibleAssets: async (ids) =>
			visible.filter((row) => ids.includes(row.id)),
		sign,
		now: () => NOW,
	};
}

describe("image-guard · parseSignRequest", () => {
	it("aceita lote de 1..100 UUIDs e remove repetidos", () => {
		expect(
			parseSignRequest({ action: "sign", assetIds: [PRIV, PRIV] }),
		).toEqual({
			ok: true,
			ids: [PRIV],
		});
	});

	it("recusa ação, lista vazia, id inválido e lote acima do limite (400)", () => {
		expect(parseSignRequest({ action: "read", assetIds: [PRIV] }).ok).toBe(
			false,
		);
		expect(parseSignRequest({ action: "sign", assetIds: [] }).ok).toBe(false);
		expect(parseSignRequest({ action: "sign", assetIds: ["x"] }).ok).toBe(
			false,
		);
		const big = Array.from({ length: IMAGE_SIGN_MAX_IDS + 1 }, () => PRIV);
		expect(parseSignRequest({ action: "sign", assetIds: big })).toMatchObject({
			ok: false,
			status: 400,
		});
		expect(parseSignRequest(null).ok).toBe(false);
	});
});

describe("image-guard · key e bucket", () => {
	it("valida o formato de key do upload (com e sem pasta)", () => {
		expect(isValidStorageKey(KEY)).toBe(true);
		expect(
			isValidStorageKey(
				`${OWNER}/1760000000000-11111111-1111-4111-8111-111111111111.png`,
			),
		).toBe(true);
		expect(isValidStorageKey(`${OWNER}/../segredo.webp`)).toBe(false);
		expect(isValidStorageKey(null)).toBe(false);
	});

	it("só assina o que está no bucket privado com key válida", () => {
		expect(
			selectSignable([
				privateRow,
				publicRow,
				{ id: "x", storage_bucket: "private", storage_key: null },
			]),
		).toEqual([{ id: PRIV, key: KEY }]);
	});
});

describe("image-guard · signingWindow (TTL arredondado)", () => {
	it("mesma URL na mesma hora e validade entre 1 h e 2 h", () => {
		const a = signingWindow(NOW);
		const b = signingWindow(Date.UTC(2026, 9, 18, 22, 59, 59));
		expect(a.signingDate.toISOString()).toBe("2026-10-18T22:00:00.000Z");
		expect(b.signingDate).toEqual(a.signingDate);
		expect(a.expiresIn).toBe(7200);
		expect(a.expiresAt.toISOString()).toBe("2026-10-19T00:00:00.000Z");
		for (const t of [
			Date.UTC(2026, 9, 18, 22, 0, 0),
			NOW,
			b.signingDate.getTime() + 3599_000,
		]) {
			const left = signingWindow(t).expiresAt.getTime() - t;
			expect(left).toBeGreaterThan(3600_000 - 1);
			expect(left).toBeLessThanOrEqual(7200_000);
		}
	});

	it("na hora seguinte a assinatura muda (a anterior vence no fim da janela)", () => {
		const next = signingWindow(Date.UTC(2026, 9, 18, 23, 0, 0));
		expect(next.signingDate.toISOString()).toBe("2026-10-18T23:00:00.000Z");
		expect(next.expiresAt.getTime()).toBeGreaterThan(
			signingWindow(NOW).expiresAt.getTime(),
		);
	});
});

describe("image-guard · handleSign (negações)", () => {
	const body = { action: "sign", assetIds: [PRIV, PUB, MISSING] };

	it("anon / JWT inválido → 401, sem consultar nada", async () => {
		const d = deps(null, [privateRow]);
		const res = await handleSign(d, body);
		expect(res.status).toBe(401);
		expect(d.sign).not.toHaveBeenCalled();
	});

	it("jogador de outra campanha (RLS não devolve nada) → lista vazia", async () => {
		const res = await handleSign(deps("b", []), body);
		expect(res).toEqual({ status: 200, body: { images: [] } });
	});

	it("viewer em asset privado (RLS esconde) → sem URL; público não é assinado", async () => {
		const res = await handleSign(deps("viewer", [publicRow]), body);
		expect(res).toEqual({ status: 200, body: { images: [] } });
	});

	it("dono / mestre (RLS devolve) → URL assinada com vencimento", async () => {
		const d = deps(OWNER, [privateRow, publicRow]);
		const res = await handleSign(d, body);
		expect(res.status).toBe(200);
		expect(res.body).toEqual({
			images: [
				{
					id: PRIV,
					url: `https://r2.test/${KEY}?d=2026-10-18T22:00:00.000Z&e=7200`,
					expiresAt: "2026-10-19T00:00:00.000Z",
				},
			],
		});
		expect(d.sign).toHaveBeenCalledTimes(1);
	});

	it("id inexistente → mesma resposta do negado", async () => {
		const missing = await handleSign(deps(OWNER, []), {
			action: "sign",
			assetIds: [MISSING],
		});
		const denied = await handleSign(deps("b", []), {
			action: "sign",
			assetIds: [PRIV],
		});
		expect(missing).toEqual(denied);
	});

	it("lote acima do limite → 400 antes de ler o banco", async () => {
		const d = deps(OWNER, [privateRow]);
		const load = vi.spyOn(d, "loadVisibleAssets");
		const res = await handleSign(d, {
			action: "sign",
			assetIds: Array.from({ length: 101 }, () => PRIV),
		});
		expect(res.status).toBe(400);
		expect(load).not.toHaveBeenCalled();
	});

	it("linha que o banco devolvesse fora do pedido não é assinada", async () => {
		const d: SignDeps = {
			...deps(OWNER, []),
			loadVisibleAssets: async () => [privateRow],
		};
		const res = await handleSign(d, { action: "sign", assetIds: [MISSING] });
		expect(res).toEqual({ status: 200, body: { images: [] } });
	});
});
