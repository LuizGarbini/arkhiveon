import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import type { Character, InventoryItem } from "@/lib/store/types";
import { equipmentChanges, saveEquipmentAsOwner } from "./character-equipment";

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }));

const ring = (extra: Partial<InventoryItem> = {}): InventoryItem => ({
	id: "e-ring",
	name: "Anel",
	quantity: 1,
	weightLbs: 0,
	location: "backpack",
	campaignItemId: "it-ring",
	isAttuned: true,
	...extra,
});
const sword = (extra: Partial<InventoryItem> = {}): InventoryItem => ({
	id: "e-sword",
	name: "Espada",
	quantity: 1,
	weightLbs: 3,
	location: "backpack",
	campaignItemId: "it-sword",
	...extra,
});

describe("equipmentChanges", () => {
	it("devolve só o que mudou em local, slot e sintonia", () => {
		const prev = [ring(), sword()];
		const next = [
			ring({ location: "equipped", slot: "ring1", isAttuned: false }),
			sword(),
		];
		expect(equipmentChanges(prev, next)).toEqual([
			{ id: "e-ring", location: "equipped", slot: "ring1", isAttuned: false },
		]);
	});

	it("sem mudança devolve lista vazia", () => {
		expect(equipmentChanges([ring()], [ring()])).toEqual([]);
	});

	it("limpar o slot vai como null", () => {
		const prev = [ring({ location: "equipped", slot: "ring1" })];
		const next = [ring({ location: "backpack" })];
		expect(equipmentChanges(prev, next)).toEqual([
			{ id: "e-ring", location: "backpack", slot: null },
		]);
	});

	it("recusa mudar outra coisa (quantidade, nome, peso)", () => {
		expect(equipmentChanges([sword()], [sword({ quantity: 99 })])).toBeNull();
		expect(equipmentChanges([sword()], [sword({ name: "Outra" })])).toBeNull();
		expect(equipmentChanges([sword()], [sword({ weightLbs: 0 })])).toBeNull();
	});

	it("recusa item novo, item apagado e ordem trocada", () => {
		expect(equipmentChanges([ring()], [ring(), sword()])).toBeNull();
		expect(equipmentChanges([ring(), sword()], [ring()])).toBeNull();
		expect(equipmentChanges([ring(), sword()], [sword(), ring()])).toBeNull();
	});

	it("recusa 'apagar' a sintonia (a função só liga ou desliga)", () => {
		const { isAttuned: _drop, ...noAttune } = ring();
		expect(equipmentChanges([ring()], [noAttune])).toBeNull();
	});
});

describe("saveEquipmentAsOwner", () => {
	const base = {
		id: "c1",
		system: "dnd5e",
		inventoryList: [ring(), sword()],
	} as unknown as Character;

	beforeEach(() => {
		useRPGStore.setState({ characters: [base] });
	});
	afterEach(() => {
		useRPGStore.setState({ characters: [] });
	});

	const inv = () =>
		useRPGStore.getState().characters.find((c) => c.id === "c1")
			?.inventoryList as InventoryItem[];

	it("atualiza na hora e usa o que o servidor devolve", async () => {
		const next = [ring({ location: "equipped", slot: "ring1" }), sword()];
		const rpc = vi.fn(async (args: { p_changes: unknown }) => {
			// no momento da chamada a ficha já está atualizada (otimista)
			expect(inv()[0].location).toBe("equipped");
			expect(args.p_changes).toEqual([
				{ id: "e-ring", location: "equipped", slot: "ring1" },
			]);
			return {
				inventoryList: [
					ring({ location: "equipped", slot: "ring1", isAttuned: true }),
					sword(),
				],
			};
		});
		const result = await saveEquipmentAsOwner({
			characterId: "c1",
			next,
			rpc,
		});
		expect(result).toEqual({ ok: true });
		expect(rpc).toHaveBeenCalledTimes(1);
		expect(inv()[0]).toMatchObject({ location: "equipped", slot: "ring1" });
	});

	it("se o servidor recusar, volta ao que estava", async () => {
		const next = [ring({ location: "equipped", slot: "ring1" }), sword()];
		const result = await saveEquipmentAsOwner({
			characterId: "c1",
			next,
			rpc: async () => {
				throw {
					code: "42501",
					message: "Você não pode equipar itens desta ficha.",
				};
			},
		});
		expect(result).toMatchObject({ ok: false, reason: "forbidden" });
		expect(inv()[0].location).toBe("backpack");
	});

	it("função ainda não criada no servidor: avisa e desfaz", async () => {
		const result = await saveEquipmentAsOwner({
			characterId: "c1",
			next: [ring({ location: "equipped", slot: "ring1" }), sword()],
			rpc: async () => {
				throw { code: "PGRST202", message: "not found" };
			},
		});
		expect(result).toMatchObject({ ok: false, reason: "unavailable" });
		expect(inv()[0].location).toBe("backpack");
	});

	it("sem conexão: avisa e desfaz", async () => {
		const result = await saveEquipmentAsOwner({
			characterId: "c1",
			next: [ring({ location: "equipped", slot: "ring1" }), sword()],
			rpc: async () => {
				throw { code: "offline" };
			},
		});
		expect(result).toMatchObject({ ok: false, reason: "offline" });
		expect(inv()[0].location).toBe("backpack");
	});

	it("não chama o servidor quando nada mudou", async () => {
		const rpc = vi.fn();
		const result = await saveEquipmentAsOwner({
			characterId: "c1",
			next: [ring(), sword()],
			rpc,
		});
		expect(result).toEqual({ ok: true });
		expect(rpc).not.toHaveBeenCalled();
	});

	it("mudança que não é de equipamento nem chega ao servidor", async () => {
		const rpc = vi.fn();
		const result = await saveEquipmentAsOwner({
			characterId: "c1",
			next: [ring(), sword({ quantity: 50 })],
			rpc,
		});
		expect(result).toMatchObject({ ok: false, reason: "invalid" });
		expect(rpc).not.toHaveBeenCalled();
		expect(inv()[1].quantity).toBe(1);
	});

	it("se outra mudança chegar no meio, não desfaz por cima dela", async () => {
		const next = [ring({ location: "equipped", slot: "ring1" }), sword()];
		const result = await saveEquipmentAsOwner({
			characterId: "c1",
			next,
			rpc: async () => {
				// chega uma atualização de fora (realtime) enquanto o RPC voa
				useRPGStore.setState((s) => ({
					characters: s.characters.map((c) =>
						c.id === "c1"
							? { ...c, inventoryList: [ring(), sword({ quantity: 2 })] }
							: c,
					),
				}));
				throw { code: "22023", message: "Slot inválido." };
			},
		});
		expect(result).toMatchObject({ ok: false, reason: "invalid" });
		expect(inv()[1].quantity).toBe(2);
	});

	it("ficha que não existe", async () => {
		const result = await saveEquipmentAsOwner({
			characterId: "nao-existe",
			next: [],
		});
		expect(result).toMatchObject({ ok: false });
	});
});
