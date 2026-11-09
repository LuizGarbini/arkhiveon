// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	AmmoConsumeAmbiguousError,
	type AmmoConsumeError,
	AmmoConsumeOfflineError,
	consumeAmmo,
	consumeSessionKey,
	ensureConsumeId,
	peekConsumeId,
} from "./consume-ammo";

const bindings = {
	userId: "user-a",
	campaignId: "camp-a",
	characterId: "char-a",
	inventoryEntryId: "inv-ammo",
};

const otherBindings = {
	...bindings,
	userId: "user-b",
	campaignId: "camp-b",
};

function memoryStore(initial: Record<string, string> = {}) {
	const data = { ...initial };
	return {
		getItem(key: string) {
			return data[key] ?? null;
		},
		setItem(key: string, value: string) {
			data[key] = value;
		},
		dump: () => ({ ...data }),
	};
}

afterEach(() => {
	sessionStorage.clear();
	vi.unstubAllGlobals();
});

describe("ensureConsumeId", () => {
	it("grava o UUID no sessionStorage antes de qualquer RPC", () => {
		const store = memoryStore();
		const created: string[] = [];
		const id = ensureConsumeId(bindings, store, () => {
			created.push("id-1");
			return "11111111-1111-4111-8111-111111111111";
		});
		expect(id).toBe("11111111-1111-4111-8111-111111111111");
		expect(store.getItem(consumeSessionKey(bindings))).toBe(id);
		expect(created).toEqual(["id-1"]);
		expect(
			ensureConsumeId(
				bindings,
				store,
				() => "22222222-2222-4222-8222-222222222222",
			),
		).toBe(id);
	});

	it("conta/campanha diferentes não reutilizam nem alteram a sessão anterior", () => {
		const store = memoryStore();
		const first = ensureConsumeId(
			bindings,
			store,
			() => "11111111-1111-4111-8111-111111111111",
		);
		const second = ensureConsumeId(
			otherBindings,
			store,
			() => "33333333-3333-4333-8333-333333333333",
		);
		expect(first).not.toBe(second);
		expect(peekConsumeId(bindings, store)).toBe(first);
		expect(peekConsumeId(otherBindings, store)).toBe(second);
	});
});

describe("consumeAmmo", () => {
	it("bloqueia offline sem chamar a RPC", async () => {
		const rpc = vi.fn();
		await expect(
			consumeAmmo({
				bindings,
				rpc,
				get: vi.fn(),
				store: memoryStore(),
				offline: true,
			}),
		).rejects.toBeInstanceOf(AmmoConsumeOfflineError);
		expect(rpc).not.toHaveBeenCalled();
	});

	it("envia o mesmo id no retry e usa o resultado autoritativo", async () => {
		const store = memoryStore();
		const id = ensureConsumeId(
			bindings,
			store,
			() => "11111111-1111-4111-8111-111111111111",
		);
		const rpc = vi
			.fn()
			.mockResolvedValueOnce({
				data: null,
				error: { code: "23505", message: "duplicate" },
			})
			.mockResolvedValue({
				data: { consumption_id: id, quantity: 0, snapshot: {}, replayed: true },
				error: null,
			});
		const get = vi.fn().mockResolvedValue({
			data: {
				consumption_id: id,
				quantity: 0,
				snapshot: { mergedFormula: "1d8" },
				replayed: true,
			},
			error: null,
		});
		const first = await consumeAmmo({ bindings, rpc, get, store });
		expect(first.quantity).toBe(0);
		expect(first.replayed).toBe(true);
		expect(rpc).toHaveBeenCalledTimes(1);
		expect(rpc.mock.calls[0]?.[0]?.p_consumption_id).toBe(id);
		expect(get).toHaveBeenCalledTimes(1);

		rpc.mockResolvedValue({
			data: {
				consumption_id: id,
				quantity: 0,
				snapshot: { mergedFormula: "1d8" },
				replayed: true,
			},
			error: null,
		});
		const retry = await consumeAmmo({ bindings, rpc, get, store });
		expect(retry.consumption_id).toBe(id);
		expect(rpc.mock.calls[1]?.[0]?.p_consumption_id).toBe(id);
	});

	it("callback tardio de outra conta não altera a sessão nova", async () => {
		const store = memoryStore();
		const firstId = ensureConsumeId(
			bindings,
			store,
			() => "11111111-1111-4111-8111-111111111111",
		);
		let release: (value: { data: unknown; error: null }) => void = () => {};
		const pending = new Promise<{ data: unknown; error: null }>((resolve) => {
			release = resolve;
		});
		const rpc = vi.fn().mockReturnValue(pending);
		const firstCall = consumeAmmo({ bindings, rpc, get: vi.fn(), store });
		const newId = ensureConsumeId(
			otherBindings,
			store,
			() => "33333333-3333-4333-8333-333333333333",
		);
		release({
			data: {
				consumption_id: firstId,
				quantity: 7,
				snapshot: {},
				replayed: false,
			},
			error: null,
		});
		await firstCall;
		expect(peekConsumeId(otherBindings, store)).toBe(newId);
		expect(peekConsumeId(bindings, store)).toBe(firstId);
	});

	it("ACK ambíguo preserva o mesmo id para retomar", async () => {
		const store = memoryStore();
		const id = ensureConsumeId(
			bindings,
			store,
			() => "11111111-1111-4111-8111-111111111111",
		);
		const rpc = vi.fn().mockRejectedValue(new Error("network"));
		const get = vi.fn().mockResolvedValue({
			data: null,
			error: { code: "P0002", message: "não encontrado" },
		});
		await expect(
			consumeAmmo({ bindings, rpc, get, store }),
		).rejects.toBeInstanceOf(AmmoConsumeAmbiguousError);
		expect(peekConsumeId(bindings, store)).toBe(id);
	});

	it("não usa inventoryList: a RPC é a única escrita de quantity", async () => {
		const store = memoryStore();
		const rpc = vi.fn().mockResolvedValue({
			data: {
				consumption_id: "11111111-1111-4111-8111-111111111111",
				quantity: 2,
				snapshot: {},
				replayed: false,
			},
			error: null,
		});
		const result = await consumeAmmo({ bindings, rpc, get: vi.fn(), store });
		expect(result.quantity).toBe(2);
		expect(rpc).toHaveBeenCalledTimes(1);
	});

	it("propaga 42501 sem mascarar como ambíguo", async () => {
		const store = memoryStore();
		const rpc = vi.fn().mockResolvedValue({
			data: null,
			error: {
				code: "42501",
				message: "Você não pode alterar a munição desta ficha.",
			},
		});
		await expect(
			consumeAmmo({ bindings, rpc, get: vi.fn(), store }),
		).rejects.toMatchObject({
			code: "42501",
		} satisfies Partial<AmmoConsumeError>);
	});
});
