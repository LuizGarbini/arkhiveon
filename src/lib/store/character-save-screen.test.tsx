// @vitest-environment jsdom
/**
 * Caminho real da tela: "Editar módulo" (ModuleEditorDialog) -> mesmo
 * onSave da rota /sheets/$characterId -> store -> save no Supabase (falso).
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Banco falso em memória: uma linha de `characters` e o mínimo da API do
 * PostgREST usado pelo save (select/eq/maybeSingle e update/eq/select).
 */
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

import { buildModuleSaveUpdate } from "@/components/character-sheet/fields";
import { ModuleEditorDialog } from "@/components/character-sheet/view/module-editor-dialog";
import { createDefaultSheetLayout } from "@/lib/sheet-modules";
import { useRPGStore } from "../store";
import { characterDefaults } from "./character-slice";
import type { Character, InventoryItem } from "./types";

const CAMPAIGN = "campanha-qa";
const sword: InventoryItem = {
	id: "inv-espada",
	name: "Espada",
	quantity: 1,
	weightLbs: 3,
	location: "equipped",
};
const rope: InventoryItem = {
	id: "inv-corda",
	name: "Corda QA 359",
	quantity: 1,
	weightLbs: 10,
	location: "backpack",
};

function staleCopy(): Character {
	return {
		...characterDefaults,
		id: "ficha-1",
		createdAt: 1,
		updatedAt: 1,
		characterName: "Thalia",
		speed: 30,
		sheetLayout: createDefaultSheetLayout("dnd5e"),
		inventoryList: [sword],
	} as Character;
}

async function flush() {
	for (let i = 0; i < 5; i++) await Promise.resolve();
	await new Promise((resolve) => setTimeout(resolve, 0));
}

/** Aba B: abre "Editar módulo" no Combate da cópia velha e salva speed=35. */
async function tabBSavesSpeed35() {
	const character = useRPGStore.getState().characters[0];
	const layout = character.sheetLayout ?? createDefaultSheetLayout("dnd5e");
	const combat = layout.modules.find((m) => m.kind === "combat");
	if (!combat) throw new Error("módulo de combate ausente");
	render(
		<ModuleEditorDialog
			character={character}
			module={combat}
			layout={layout}
			open
			onOpenChange={() => {}}
			// Mesmo onSave da rota src/routes/sheets/$characterId.tsx
			onSave={(_patch, changes) =>
				useRPGStore
					.getState()
					.updateCharacter(
						character.id,
						buildModuleSaveUpdate(changes, character),
						{ quiet: true },
					)
			}
		/>,
	);
	const speed = document.querySelector<HTMLInputElement>('input[name="speed"]');
	if (!speed) throw new Error("campo Deslocamento não encontrado");
	fireEvent.change(speed, { target: { value: "35" } });
	fireEvent.click(screen.getByRole("button", { name: /salvar/i }));
	await flush();
}

const savedData = () => db.rows.get("ficha-1")?.data as Partial<Character>;
const ids = (list?: InventoryItem[]) => list?.map((i) => i.id);

describe("Editar módulo com cópia desatualizada (caminho real da tela)", () => {
	beforeEach(() => {
		db.rows.clear();
		db.rlsHidesRow = false;
		db.offline = false;
		showToastMock.mockClear();
		const tabB = staleCopy();
		// Banco: a aba A já salvou a Corda na mochila.
		db.rows.set(tabB.id, {
			id: tabB.id,
			data: structuredClone({
				...tabB,
				inventoryList: [sword, rope],
			}) as unknown as Record<string, unknown>,
		});
		// Aba B sem Realtime: ainda sem a Corda.
		useRPGStore.setState({
			activeCampaignId: CAMPAIGN,
			characters: [tabB],
			activityLog: [],
			syncError: null,
		});
	});
	afterEach(() => cleanup());

	it("aba B salva Deslocamento 35 e a Corda da aba A continua na mochila", async () => {
		await tabBSavesSpeed35();
		expect(savedData().speed).toBe(35);
		expect(ids(savedData().inventoryList)).toEqual(["inv-espada", "inv-corda"]);
		expect(showToastMock).not.toHaveBeenCalled();
	});

	it("offline no Salvar mantém o editor e a segunda tentativa grava o deslocamento", async () => {
		db.offline = true;
		await tabBSavesSpeed35();
		expect(showToastMock).not.toHaveBeenCalled();
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toBe("Não foi possível salvar. Tente de novo.");
		expect(alert.textContent).not.toMatch(/Failed to fetch|TypeError/);
		expect(useRPGStore.getState().syncError).toBeNull();
		const save = screen.getByRole("button", {
			name: /salvar/i,
		}) as HTMLButtonElement;
		expect(save.disabled).toBe(false);
		db.offline = false;
		fireEvent.click(save);
		await flush();
		expect(savedData().speed).toBe(35);
		expect(ids(savedData().inventoryList)).toEqual(["inv-espada", "inv-corda"]);
	});

	it("RLS no Salvar quiet mostra frase em português e não acende o banner", async () => {
		db.rlsHidesRow = true;
		await tabBSavesSpeed35();
		const alert = await screen.findByRole("alert");
		expect(alert.textContent).toBe("Não foi possível salvar. Tente de novo.");
		expect(alert.textContent).not.toMatch(/permissão|row-level|characters/);
		expect(useRPGStore.getState().syncError).toBeNull();
		expect(showToastMock).not.toHaveBeenCalled();
	});
});
