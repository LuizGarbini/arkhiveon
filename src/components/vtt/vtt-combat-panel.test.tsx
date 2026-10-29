// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { characterDefaults, useRPGStore } from "@/lib/store";
import type { Character } from "@/lib/store/types";
import type { VTTToken } from "@/lib/vtt/types";
import { useVTTStore } from "@/lib/vtt/vtt-store";

type CombatRow = {
	id: string;
	scene_id: string;
	token_id: string;
	initiative: number | null;
	dex: number | null;
	sort_key: number;
};

const db = vi.hoisted(() => ({
	combatants: [] as CombatRow[],
	round: null as number | null,
	turnId: null as string | null,
	combatantError: null as { code: string; message: string } | null,
	sceneError: null as { code: string; message: string } | null,
	failWrites: false,
	zeroRows: false,
	inserts: 0,
	updates: 0,
	upserts: 0,
	sceneUpdates: 0,
	selects: 0,
	lastScenePatch: null as null | {
		combat_round?: number | null;
		combat_turn_id?: string | null;
	},
	onStatus: null as null | ((status: string) => void),
	gate: null as null | Promise<void>,
}));

const toast = vi.hoisted(() => vi.fn());

vi.mock("@/components/ui/toast", () => ({ showToast: toast }));
vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: (table: string) => {
			if (table === "vtt_combatants") {
				return {
					select: () => ({
						eq: async () => {
							db.selects += 1;
							if (db.gate) await db.gate;
							return {
								data: db.combatantError ? null : db.combatants,
								error: db.combatantError,
							};
						},
					}),
					insert: (rows: { id: string }[]) => ({
						select: async () => {
							db.inserts += 1;
							if (db.failWrites) {
								return {
									data: null,
									error: { code: "42501", message: "permission denied" },
								};
							}
							if (db.zeroRows) return { data: [], error: null };
							return { data: rows.map((row) => ({ id: row.id })), error: null };
						},
					}),
					update: () => ({
						eq: () => ({
							select: async () => {
								db.updates += 1;
								if (db.failWrites) {
									return {
										data: null,
										error: { code: "42501", message: "permission denied" },
									};
								}
								if (db.zeroRows) return { data: [], error: null };
								return { data: [{ id: "ok" }], error: null };
							},
						}),
					}),
					upsert: (rows: unknown[]) => ({
						select: async () => {
							db.upserts += 1;
							if (db.failWrites) {
								return {
									data: null,
									error: { code: "42501", message: "permission denied" },
								};
							}
							return {
								data: rows.map(() => ({ id: "ok" })),
								error: null,
							};
						},
					}),
				};
			}
			return {
				select: () => ({
					eq: () => ({
						maybeSingle: async () => {
							db.selects += 1;
							if (db.gate) await db.gate;
							return {
								data: db.sceneError
									? null
									: {
											combat_round: db.round,
											combat_turn_id: db.turnId,
										},
								error: db.sceneError,
							};
						},
					}),
				}),
				update: (patch: {
					combat_round?: number | null;
					combat_turn_id?: string | null;
				}) => ({
					eq: () => ({
						select: async () => {
							db.sceneUpdates += 1;
							db.lastScenePatch = patch;
							if (db.failWrites) {
								return {
									data: null,
									error: { code: "42501", message: "permission denied" },
								};
							}
							if (db.zeroRows) return { data: [], error: null };
							return { data: [{ id: "scene-1" }], error: null };
						},
					}),
				}),
			};
		},
		channel: () => {
			const channel = {
				on: () => channel,
				subscribe: (cb?: (status: string) => void) => {
					db.onStatus = cb ?? null;
					cb?.("SUBSCRIBED");
					return channel;
				},
			};
			return channel;
		},
		removeChannel: () => Promise.resolve("ok"),
	}),
}));

import {
	selectOrderedCombatants,
	useCombatStore,
} from "@/lib/vtt/combat-store";
import { VTTCombatPanel } from "./vtt-combat-panel";
import { VTTToolbar } from "./vtt-toolbar";

const token = (
	partial: Partial<VTTToken> & Pick<VTTToken, "id" | "name">,
): VTTToken => ({
	sceneId: "scene-1",
	layer: "token",
	x: 100,
	y: 100,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
	...partial,
});

const character = (
	id: string,
	initiative: number,
	dexterity: number,
): Character =>
	({
		...characterDefaults,
		id,
		createdAt: 0,
		characterName: id,
		initiative,
		dexterity,
	}) as Character;

const row = (
	id: string,
	tokenId: string,
	initiative: number | null,
	dex: number | null,
	sortKey: number,
): CombatRow => ({
	id,
	scene_id: "scene-1",
	token_id: tokenId,
	initiative,
	dex,
	sort_key: sortKey,
});

function resetDb() {
	db.combatants = [];
	db.round = null;
	db.turnId = null;
	db.combatantError = null;
	db.sceneError = null;
	db.failWrites = false;
	db.zeroRows = false;
	db.inserts = 0;
	db.updates = 0;
	db.upserts = 0;
	db.sceneUpdates = 0;
	db.selects = 0;
	db.lastScenePatch = null;
	db.onStatus = null;
	db.gate = null;
}

function settle() {
	return act(async () => {});
}

beforeEach(() => {
	resetDb();
	toast.mockReset();
	useCombatStore.setState({
		sceneId: null,
		combatants: [],
		round: null,
		turnId: null,
		status: "idle",
		panelOpen: true,
		busy: false,
	});
	useVTTStore.setState({
		isGM: true,
		activeSceneId: "scene-1",
		tokens: [],
		selectedTokenIds: [],
		activeTool: "select",
		showRosterDrawer: false,
	});
	useRPGStore.setState({ characters: [] });
	window.matchMedia = ((query: string) => ({
		matches: false,
		media: query,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
		onchange: null,
	})) as unknown as typeof window.matchMedia;
});

afterEach(() => {
	cleanup();
});

describe("painel de combate", () => {
	it("mestre adiciona a ficha (0 vale) e o token sem ficha fica em branco", async () => {
		useRPGStore.setState({
			characters: [character("char-lia", 0, 18)],
		});
		useVTTStore.setState({
			tokens: [
				token({ id: "tok-lia", name: "Lia", characterId: "char-lia" }),
				token({ id: "tok-goblin", name: "Goblin" }),
			],
			selectedTokenIds: ["tok-lia", "tok-goblin"],
		});
		render(<VTTCombatPanel />);
		fireEvent.click(
			await screen.findByRole("button", { name: "Adicionar selecionados" }),
		);
		await waitFor(() => expect(useCombatStore.getState().busy).toBe(false));
		expect(db.inserts).toBe(1);
		expect(toast).not.toHaveBeenCalled();
		const byToken = new Map(
			useCombatStore.getState().combatants.map((c) => [c.tokenId, c]),
		);
		expect(byToken.get("tok-lia")).toMatchObject({ initiative: 0, dex: 18 });
		expect(byToken.get("tok-goblin")).toMatchObject({
			initiative: null,
			dex: null,
		});
		expect(
			(
				screen.getByRole("spinbutton", {
					name: "Iniciativa de Lia",
				}) as HTMLInputElement
			).value,
		).toBe("0");
		expect(
			(
				screen.getByRole("spinbutton", {
					name: "Iniciativa de Goblin",
				}) as HTMLInputElement
			).value,
		).toBe("");
		const ordered = selectOrderedCombatants(useCombatStore.getState());
		expect(selectOrderedCombatants(useCombatStore.getState())).toBe(ordered);
		expect(ordered.map((c) => c.tokenId)).toEqual(["tok-lia", "tok-goblin"]);
	});

	it("jogador vê a ordem e a vez do mestre, sem botões de escrita", async () => {
		db.combatants = [
			row("c-lia", "tok-lia", 15, 14, 0),
			row("c-sombra", "tok-sombra", 20, 12, 1),
		];
		db.round = 2;
		db.turnId = "c-sombra";
		useVTTStore.setState({
			isGM: false,
			tokens: [
				token({ id: "tok-lia", name: "Lia" }),
				token({ id: "tok-sombra", name: "Sombra", isHidden: true }),
			],
		});
		render(<VTTCombatPanel />);
		expect(await screen.findByText("Lia")).toBeTruthy();
		expect(screen.queryByText("Sombra")).toBeNull();
		expect(screen.getByText("Vez do mestre")).toBeTruthy();
		expect(screen.getByText("2")).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Adicionar selecionados" }),
		).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Iniciar combate" }),
		).toBeNull();
		expect(screen.queryByRole("button", { name: "Anterior" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Próximo" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Encerrar" })).toBeNull();
		expect(screen.queryByRole("button", { name: /Reordenar/ })).toBeNull();
		expect(screen.queryByRole("spinbutton")).toBeNull();
		expect(screen.queryByRole("listitem", { current: true })).toBeNull();
	});

	it("próximo avança a vez e anterior na primeira da rodada 1 não grava", async () => {
		db.combatants = [
			row("c-lia", "tok-lia", 18, 14, 0),
			row("c-nix", "tok-nix", 10, 12, 1),
		];
		db.round = 1;
		db.turnId = "c-lia";
		useVTTStore.setState({
			tokens: [
				token({ id: "tok-lia", name: "Lia" }),
				token({ id: "tok-nix", name: "Nix" }),
			],
		});
		render(<VTTCombatPanel />);
		const previous = await screen.findByRole("button", { name: "Anterior" });
		expect((previous as HTMLButtonElement).disabled).toBe(true);
		fireEvent.click(previous);
		await settle();
		expect(db.sceneUpdates).toBe(0);
		expect(
			screen.getByRole("listitem", { name: "Lia", current: true }),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
		await waitFor(() => expect(useCombatStore.getState().busy).toBe(false));
		expect(db.sceneUpdates).toBe(1);
		expect(db.lastScenePatch).toMatchObject({
			combat_round: 1,
			combat_turn_id: "c-nix",
		});
		expect(
			screen.getByRole("listitem", { name: "Nix", current: true }),
		).toBeTruthy();
		expect(toast).not.toHaveBeenCalled();
	});

	it("falha ao salvar desfaz a iniciativa e mostra um toast", async () => {
		db.combatants = [row("c-lia", "tok-lia", 12, 14, 0)];
		db.round = 1;
		db.turnId = "c-lia";
		useVTTStore.setState({
			tokens: [token({ id: "tok-lia", name: "Lia" })],
		});
		render(<VTTCombatPanel />);
		const input = await screen.findByRole("spinbutton", {
			name: "Iniciativa de Lia",
		});
		expect((input as HTMLInputElement).value).toBe("12");
		db.failWrites = true;
		fireEvent.change(input, { target: { value: "18" } });
		fireEvent.blur(input);
		await waitFor(() => expect(toast).toHaveBeenCalledTimes(1));
		expect(toast).toHaveBeenCalledWith(
			"error",
			expect.objectContaining({
				title: "Não foi possível salvar o combate",
				description: "A ordem voltou ao que estava.",
			}),
		);
		expect(useCombatStore.getState().combatants[0]?.initiative).toBe(12);
		expect(
			(
				screen.getByRole("spinbutton", {
					name: "Iniciativa de Lia",
				}) as HTMLInputElement
			).value,
		).toBe("12");
		expect(db.updates).toBe(1);
	});

	it("arraste no empate grava a ordem uma vez", async () => {
		db.combatants = [
			row("c-lia", "tok-lia", 12, 14, 0),
			row("c-nix", "tok-nix", 12, 14, 1),
		];
		useVTTStore.setState({
			tokens: [
				token({ id: "tok-lia", name: "Lia" }),
				token({ id: "tok-nix", name: "Nix" }),
			],
		});
		render(<VTTCombatPanel />);
		await screen.findByRole("button", { name: "Reordenar Lia" });
		fireEvent.dragStart(screen.getByRole("button", { name: "Reordenar Lia" }));
		const nix = screen.getByRole("listitem", { name: "Nix" });
		fireEvent.dragOver(nix);
		fireEvent.drop(nix);
		await waitFor(() => expect(useCombatStore.getState().busy).toBe(false));
		expect(db.upserts).toBe(1);
		expect(toast).not.toHaveBeenCalled();
		expect(
			screen
				.getAllByRole("listitem")
				.map((item) => item.getAttribute("aria-label")),
		).toEqual(["Nix", "Lia"]);
	});

	it("encerrar pede confirmação e, depois, dá para iniciar de novo", async () => {
		db.combatants = [row("c-lia", "tok-lia", 12, 14, 0)];
		db.round = 1;
		db.turnId = "c-lia";
		useVTTStore.setState({
			tokens: [token({ id: "tok-lia", name: "Lia" })],
		});
		render(<VTTCombatPanel />);
		fireEvent.click(await screen.findByRole("button", { name: "Encerrar" }));
		expect(await screen.findByRole("alertdialog")).toBeTruthy();
		expect(screen.getByText("Encerrar combate?")).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Encerrar combate" }));
		await waitFor(() => expect(useCombatStore.getState().round).toBeNull());
		expect(db.lastScenePatch).toMatchObject({
			combat_round: null,
			combat_turn_id: null,
		});
		fireEvent.click(screen.getByRole("button", { name: "Iniciar combate" }));
		await waitFor(() => expect(useCombatStore.getState().round).toBe(1));
		expect(useCombatStore.getState().turnId).toBe("c-lia");
		expect(toast).not.toHaveBeenCalled();
	});

	it("atalho C abre o combate e não fecha com o foco num campo", async () => {
		useCombatStore.setState({ panelOpen: false });
		render(
			<>
				<VTTToolbar />
				<VTTCombatPanel />
				<input aria-label="busca" />
			</>,
		);
		expect(screen.queryByTestId("combat-panel")).toBeNull();
		fireEvent.keyDown(document.body, { key: "c" });
		expect(await screen.findByText("Ninguém na ordem.")).toBeTruthy();
		const input = screen.getByLabelText("busca");
		input.focus();
		fireEvent.keyDown(input, { key: "c" });
		expect(screen.getByTestId("combat-panel")).toBeTruthy();
		input.blur();
		fireEvent.keyDown(document.body, { key: "c" });
		await waitFor(() =>
			expect(screen.queryByTestId("combat-panel")).toBeNull(),
		);
	});

	it("tabela ausente deixa o painel indisponível, sem toast", async () => {
		db.combatantError = {
			code: "PGRST205",
			message:
				"Could not find the table 'public.vtt_combatants' in the schema cache",
		};
		render(<VTTCombatPanel />);
		expect(
			await screen.findByText(
				"O combate chega quando a atualização do banco for aplicada",
			),
		).toBeTruthy();
		expect(
			screen.queryByRole("button", { name: "Adicionar selecionados" }),
		).toBeNull();
		expect(toast).not.toHaveBeenCalled();
	});

	it("carrega com esqueleto e, ao reconectar, busca de novo", async () => {
		let release: (() => void) | undefined;
		db.gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		db.combatants = [row("c-lia", "tok-lia", 8, 10, 0)];
		useVTTStore.setState({
			tokens: [token({ id: "tok-lia", name: "Lia" })],
		});
		render(<VTTCombatPanel />);
		expect(screen.getByLabelText("Carregando combate")).toBeTruthy();
		await act(async () => {
			release?.();
		});
		expect(await screen.findByText("Lia")).toBeTruthy();
		const before = db.selects;
		db.combatants = [
			row("c-lia", "tok-lia", 8, 10, 0),
			row("c-nix", "tok-nix", 4, 10, 1),
		];
		useVTTStore.setState({
			tokens: [
				token({ id: "tok-lia", name: "Lia" }),
				token({ id: "tok-nix", name: "Nix" }),
			],
		});
		act(() => {
			db.onStatus?.("CHANNEL_ERROR");
			db.onStatus?.("SUBSCRIBED");
		});
		await waitFor(() => expect(db.selects).toBeGreaterThan(before));
		expect(await screen.findByText("Nix")).toBeTruthy();
	});

	it("no celular o combate abre na folha de baixo", async () => {
		window.matchMedia = ((query: string) => ({
			matches: query.includes("max-width"),
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
			onchange: null,
		})) as unknown as typeof window.matchMedia;
		render(<VTTCombatPanel />);
		expect(await screen.findByTestId("bottom-sheet-handle")).toBeTruthy();
		expect(screen.getByRole("dialog", { name: "Combate" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
		expect(
			screen.getByRole("button", { name: "Adicionar selecionados" }),
		).toBeTruthy();
	});

	it("no celular o sheet de combate não cobre o mapa com overlay", async () => {
		window.matchMedia = ((query: string) => ({
			matches: query.includes("max-width"),
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
			onchange: null,
		})) as unknown as typeof window.matchMedia;
		const onMap = vi.fn();
		render(
			<>
				<div
					aria-label="mapa"
					role="application"
					onPointerDown={onMap}
					onWheel={onMap}
				/>
				<VTTCombatPanel />
			</>,
		);
		expect(await screen.findByRole("dialog", { name: "Combate" })).toBeTruthy();
		expect(document.querySelector("[data-slot='dialog-overlay']")).toBeNull();
		expect(document.querySelector(".backdrop-blur-md")).toBeNull();
		const map = screen.getByRole("application", { name: "mapa" });
		expect(map.closest("[aria-hidden='true']")).toBeNull();
		expect(map.hasAttribute("inert")).toBe(false);
		fireEvent.pointerDown(map);
		fireEvent.wheel(map);
		expect(onMap).toHaveBeenCalled();
		expect(screen.getByRole("dialog", { name: "Combate" })).toBeTruthy();
		expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
	});
});
