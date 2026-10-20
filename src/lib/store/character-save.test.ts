// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Banco falso em memória: uma linha de `characters` e o mínimo da API do
 * PostgREST usado pelo save (select/eq/maybeSingle e update/eq/select).
 */
type Row = { id: string; data: Record<string, unknown> };
const db = vi.hoisted(() => ({
	rows: new Map<string, { id: string; data: Record<string, unknown> }>(),
	/** Simula a RLS escondendo a linha de quem salva (0 linhas). */
	rlsHidesRow: false,
	/** Simula estar sem rede: o fetch do supabase-js rejeita. */
	offline: false,
}));

const showToastMock = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/toast", () => ({ showToast: showToastMock }));

vi.mock("../supabase", () => {
	const visible = (id: string) => {
		if (db.offline) throw new TypeError("Failed to fetch");
		return db.rlsHidesRow ? undefined : db.rows.get(id);
	};
	const from = (table: string) => ({
		select: () => ({
			eq: (_col: string, id: string) => ({
				maybeSingle: async () => {
					const row = table === "characters" ? visible(id) : undefined;
					return {
						data: row ? { data: structuredClone(row.data) } : null,
						error: null,
					};
				},
			}),
		}),
		update: (patch: { data?: Record<string, unknown> }) => ({
			eq: (_col: string, id: string) => ({
				select: async () => {
					const row = visible(id);
					if (!row) return { data: [], error: null };
					if (patch.data) row.data = structuredClone(patch.data);
					return { data: [{ id }], error: null };
				},
			}),
		}),
		insert: async () => ({ error: null }),
	});
	return {
		SUPABASE_TABLES: new Proxy({}, { get: (_t, key) => String(key) }),
		getSupabase: () => ({
			from,
			auth: {
				getSession: async () => ({ data: { session: null } }),
				getUser: async () => ({ data: { user: null } }),
			},
		}),
	};
});

import { updateRemoteEntity } from "../remote-store";
import { useRPGStore } from "../store";
import { characterDefaults } from "./character-slice";
import { pendingSaveCount } from "./pending-saves";
import type { Character, InventoryItem } from "./types";

const CAMPAIGN = "campanha-qa";
const sword: InventoryItem = {
	id: "inv-espada",
	name: "Espada",
	quantity: 1,
	weightLbs: 3,
	location: "equipped",
};
const potion: InventoryItem = {
	id: "inv-pocao",
	name: "Poção de cura",
	quantity: 1,
	weightLbs: 0.5,
	location: "backpack",
};

function baseCharacter(): Character {
	return {
		...characterDefaults,
		id: "ficha-1",
		createdAt: 1,
		updatedAt: 1,
		characterName: "Thalia",
		notes: "",
		inventoryList: [sword],
	} as Character;
}

async function flush() {
	for (let i = 0; i < 5; i++) await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Jogador salva a mochila com a poção (direto no "banco"). */
function playerAddsPotion() {
	const row = db.rows.get("ficha-1") as Row;
	row.data = { ...row.data, inventoryList: [sword, potion] };
}

describe("salvamento concorrente da ficha (mestre × jogador)", () => {
	beforeEach(() => {
		db.rows.clear();
		db.rlsHidesRow = false;
		db.offline = false;
		showToastMock.mockClear();
		const character = baseCharacter();
		db.rows.set(character.id, {
			id: character.id,
			data: structuredClone(character) as unknown as Record<string, unknown>,
		});
		// Mestre com a ficha carregada ANTES do jogador pegar a poção.
		useRPGStore.setState({
			activeCampaignId: CAMPAIGN,
			characters: [character],
			activityLog: [],
			syncError: null,
		});
	});

	it("reproduz o bug: regravar a cópia local inteira apaga o item da mochila", async () => {
		playerAddsPotion();
		const staleMaster = { ...baseCharacter(), notes: "PV 5/12" };
		await updateRemoteEntity("character", staleMaster, CAMPAIGN);
		const saved = db.rows.get("ficha-1")?.data as Partial<Character>;
		expect(saved.notes).toBe("PV 5/12");
		// last write wins no `data` inteiro: a poção do jogador sumiu.
		expect(saved.inventoryList?.map((i) => i.id)).toEqual(["inv-espada"]);
	});

	it("com o patch por chave, a poção do jogador continua depois do save do mestre", async () => {
		playerAddsPotion();
		useRPGStore.getState().updateCharacter("ficha-1", { notes: "PV 5/12" });
		await flush();
		const saved = db.rows.get("ficha-1")?.data as Partial<Character>;
		expect(saved.notes).toBe("PV 5/12");
		expect(saved.inventoryList?.map((i) => i.id)).toEqual([
			"inv-espada",
			"inv-pocao",
		]);
		// A cópia local do mestre também passa a ver a poção.
		const local = useRPGStore.getState().characters[0];
		expect(local.inventoryList?.map((i) => i.id)).toEqual([
			"inv-espada",
			"inv-pocao",
		]);
		expect(showToastMock).not.toHaveBeenCalled();
	});

	it("UPDATE com 0 linhas (RLS) vira erro visível e desfaz a mudança local", async () => {
		db.rlsHidesRow = true;
		useRPGStore
			.getState()
			.updateCharacter("ficha-1", { inventoryList: [sword, potion] });
		await flush();
		expect(showToastMock).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({ title: "A ficha não foi salva" }),
		);
		const state = useRPGStore.getState();
		expect(state.syncError).toMatch(/não tem permissão para editar esta ficha/);
		expect(state.characters[0].inventoryList?.map((i) => i.id)).toEqual([
			"inv-espada",
		]);
	});

	it("updateRemoteEntity de ficha também falha com 0 linhas em vez de silenciar", async () => {
		db.rlsHidesRow = true;
		await expect(
			updateRemoteEntity("character", baseCharacter(), CAMPAIGN),
		).rejects.toThrow(/não tem permissão/);
	});

	it("cópia desatualizada: aba B sem Realtime salva e o item que a aba A pôs na mochila não some", async () => {
		// Aba B carregou a ficha só com a espada e não recebe Realtime.
		const tabB = useRPGStore.getState().characters[0];
		expect(tabB.inventoryList?.map((i) => i.id)).toEqual(["inv-espada"]);
		// Aba A adiciona a poção e salva no banco.
		playerAddsPotion();
		// Aba B (cópia velha) muda só o deslocamento e salva.
		useRPGStore.getState().updateCharacter("ficha-1", { speed: 35 });
		await flush();
		const saved = db.rows.get("ficha-1")?.data as Partial<Character>;
		expect(saved.speed).toBe(35);
		expect(saved.inventoryList?.map((i) => i.id)).toEqual([
			"inv-espada",
			"inv-pocao",
		]);
		expect(showToastMock).not.toHaveBeenCalled();
	});

	it("offline: toast sem erro técnico, com 'Tentar de novo' que refaz o save", async () => {
		db.offline = true;
		useRPGStore.getState().updateCharacter("ficha-1", { notes: "PV 3/12" });
		await flush();
		expect(showToastMock).toHaveBeenCalledTimes(1);
		const [variant, toast] = showToastMock.mock.calls[0];
		expect(variant).toBe("error");
		expect(toast.title).toBe(
			"A ficha não foi salva. Verifique a conexão e tente de novo.",
		);
		expect(JSON.stringify(toast)).not.toMatch(/TypeError|Failed to fetch/);
		expect(toast.action.label).toBe("Tentar de novo");
		const state = useRPGStore.getState();
		expect(state.syncError).toBeNull();
		expect(state.characters[0].notes).toBe("");
		// Volta a conexão e clica em "Tentar de novo".
		db.offline = false;
		toast.action.onClick();
		await flush();
		expect((db.rows.get("ficha-1")?.data as Partial<Character>).notes).toBe(
			"PV 3/12",
		);
		expect(useRPGStore.getState().characters[0].notes).toBe("PV 3/12");
	});

	it("save pendente: recarregar a página pede confirmação até o save terminar", async () => {
		const reload = () => {
			const event = new Event("beforeunload", { cancelable: true });
			window.dispatchEvent(event);
			return event.defaultPrevented;
		};
		expect(reload()).toBe(false);
		useRPGStore.getState().updateCharacter("ficha-1", { notes: "PV 2/12" });
		expect(pendingSaveCount()).toBe(1);
		expect(reload()).toBe(true);
		await flush();
		expect(pendingSaveCount()).toBe(0);
		expect(reload()).toBe(false);
		expect((db.rows.get("ficha-1")?.data as Partial<Character>).notes).toBe(
			"PV 2/12",
		);
	});
});
