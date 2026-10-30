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
import { useRPGStore } from "@/lib/store";
import { FEED_EMPTY_TEXT, SECRET_ROLL_TEXT } from "@/lib/vtt/feed-line";
import { useRollStore } from "@/lib/vtt/roll-store";
import { useVTTStore } from "@/lib/vtt/vtt-store";

const db = vi.hoisted(() => ({
	sessionId: null as string | null,
	sessions: [] as { id: string; started_at: string }[],
	rolls: [] as Record<string, unknown>[],
	results: [] as Record<string, unknown>[],
	gate: null as Promise<void> | null,
	rollError: null as { message: string; code: string } | null,
	rollsCalls: 0,
	chatCalls: 0,
	sessionCalls: 0,
	onRoll: null as
		| null
		| ((payload: { eventType: string; new: Record<string, unknown> }) => void),
	onStatus: null as null | ((status: string) => void),
}));

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({ user: { id: "user-m" }, loading: false }),
}));

vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: (table: string) => {
			const payload = async () => {
				if (db.gate) await db.gate;
				if (table === "campaigns") {
					return {
						data: { current_feed_session_id: db.sessionId },
						error: null,
					};
				}
				if (table === "vtt_feed_sessions") {
					return { data: db.sessions, error: null };
				}
				if (table === "vtt_rolls") {
					return { data: db.rolls, error: null };
				}
				return { data: db.results, error: null };
			};
			const builder = {
				select: () => builder,
				eq: () => builder,
				in: () => payload(),
				order: () => payload(),
				maybeSingle: () => payload(),
			};
			return builder;
		},
		rpc: async (name: string) => {
			if (db.gate) await db.gate;
			if (name === "roll_dice") {
				db.rollsCalls += 1;
				if (db.rollError) return { data: null, error: db.rollError };
				return {
					data: {
						id: "roll-new",
						total: 14,
						is_secret: false,
						formula: "1d20",
					},
					error: null,
				};
			}
			if (name === "post_table_message") {
				db.chatCalls += 1;
				return { data: "chat-1", error: null };
			}
			db.sessionCalls += 1;
			db.sessionId = "s2";
			db.sessions = [
				...db.sessions,
				{ id: "s2", started_at: "2026-10-29T19:00:00.000Z" },
			];
			db.rolls = [];
			return { data: "s2", error: null };
		},
		channel: () => {
			const channel = {
				on: (...args: unknown[]) => {
					const callback = args.at(-1);
					if (typeof callback === "function") {
						db.onRoll = callback as (payload: {
							eventType: string;
							new: Record<string, unknown>;
						}) => void;
					}
					return channel;
				},
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

import { VTTFeedPanel } from "./vtt-feed-panel";

const publicRoll = {
	id: "roll-lia",
	campaign_id: "camp-1",
	scene_id: "scene-1",
	session_id: "s1",
	author_id: "user-j",
	character_id: null,
	kind: "roll",
	formula: "1d20+2",
	label: null,
	message: null,
	is_secret: false,
	created_at: "2026-10-29T18:05:00.000Z",
};

const secretRoll = {
	id: "roll-secret",
	campaign_id: "camp-1",
	scene_id: "scene-1",
	session_id: "s1",
	author_id: "user-m",
	character_id: null,
	kind: "roll",
	formula: null,
	label: null,
	message: null,
	is_secret: true,
	created_at: "2026-10-29T18:06:00.000Z",
};

beforeEach(() => {
	db.sessionId = null;
	db.sessions = [];
	db.rolls = [];
	db.results = [];
	db.gate = null;
	db.rollError = null;
	db.rollsCalls = 0;
	db.chatCalls = 0;
	db.sessionCalls = 0;
	db.onRoll = null;
	db.onStatus = null;
	localStorage.clear();
	useRollStore.getState().reset();
	useRollStore.setState({ panelOpen: true });
	useVTTStore.setState({
		isGM: true,
		activeSceneId: "scene-1",
		tokens: [],
		selectedTokenIds: [],
	});
	useRPGStore.setState({ activeCampaignId: "camp-1", characters: [] });
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

describe("feed da mesa", () => {
	it("carrega com esqueleto e não mostra o vazio nem o botão de rolar", async () => {
		let release: (() => void) | undefined;
		db.gate = new Promise<void>((resolve) => {
			release = resolve;
		});
		render(<VTTFeedPanel />);
		expect(screen.getByLabelText("Carregando feed")).toBeTruthy();
		expect(screen.queryByText(FEED_EMPTY_TEXT)).toBeNull();
		expect(screen.queryByRole("button", { name: "Rolar" })).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Iniciar nova sessão" }),
		).toBeNull();
		await act(async () => {
			release?.();
		});
		expect(await screen.findByText(FEED_EMPTY_TEXT)).toBeTruthy();
	});

	it("jogador vê a linha secreta sem fórmula nem total", async () => {
		db.sessionId = "s1";
		db.sessions = [{ id: "s1", started_at: "2026-10-29T18:00:00.000Z" }];
		db.rolls = [publicRoll, secretRoll];
		db.results = [
			{
				roll_id: "roll-secret",
				total: 18,
				details: {
					formula: "1d20+3",
					count: 1,
					faces: 20,
					modifier: 3,
					rolls: [15],
				},
			},
			{
				roll_id: "roll-lia",
				total: 11,
				details: {
					formula: "1d20+2",
					count: 1,
					faces: 20,
					modifier: 2,
					rolls: [9],
				},
			},
		];
		useVTTStore.setState({ isGM: false });
		render(<VTTFeedPanel />);
		expect(await screen.findByText(SECRET_ROLL_TEXT)).toBeTruthy();
		expect(screen.getByText("1d20+2")).toBeTruthy();
		expect(screen.getByText("11")).toBeTruthy();
		expect(screen.queryByText("18")).toBeNull();
		expect(screen.queryByText("1d20+3")).toBeNull();
		expect(screen.queryByText("Secreta")).toBeNull();
		expect(
			screen.queryByRole("button", { name: "Iniciar nova sessão" }),
		).toBeNull();
		expect(document.querySelector("select")).toBeNull();
	});

	it("mestre vê o valor da rolagem secreta e o modo no Select do DS", async () => {
		db.sessionId = "s1";
		db.sessions = [{ id: "s1", started_at: "2026-10-29T18:00:00.000Z" }];
		db.rolls = [secretRoll];
		db.results = [
			{
				roll_id: "roll-secret",
				total: 18,
				details: {
					formula: "1d20+3",
					count: 1,
					faces: 20,
					modifier: 3,
					rolls: [15],
				},
			},
		];
		render(<VTTFeedPanel />);
		expect(await screen.findByText("Secreta")).toBeTruthy();
		expect(screen.getByText("18")).toBeTruthy();
		expect(screen.getByText("1d20+3")).toBeTruthy();
		expect(screen.queryByText(SECRET_ROLL_TEXT)).toBeNull();
		expect(
			screen.getByRole("combobox", { name: "Modo da rolagem" }),
		).toBeTruthy();
		expect(screen.getByText("Pública")).toBeTruthy();
		expect(document.querySelector("select")).toBeNull();
		expect(document.querySelector("option")).toBeNull();
	});

	it("mensagem vazia não envia, e a sessão nova pede confirmação", async () => {
		db.sessionId = "s1";
		db.sessions = [{ id: "s1", started_at: "2026-10-29T18:00:00.000Z" }];
		db.rolls = [publicRoll];
		db.results = [
			{
				roll_id: "roll-lia",
				total: 11,
				details: {
					formula: "1d20+2",
					count: 1,
					faces: 20,
					modifier: 2,
					rolls: [9],
				},
			},
		];
		render(<VTTFeedPanel />);
		expect(await screen.findByText("1d20+2")).toBeTruthy();
		expect(
			(screen.getByRole("button", { name: "Enviar" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
		fireEvent.click(
			screen.getByRole("button", { name: "Iniciar nova sessão" }),
		);
		expect(
			await screen.findByRole("heading", { name: "Iniciar a sessão 2?" }),
		).toBeTruthy();
		expect(
			screen.getByText(
				"O feed de rolagens e mensagens vai ficar em branco para todos na mesa. Essa ação não pode ser desfeita.",
			),
		).toBeTruthy();
		fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
		await waitFor(() =>
			expect(
				screen.queryByRole("heading", { name: "Iniciar a sessão 2?" }),
			).toBeNull(),
		);
		expect(db.sessionCalls).toBe(0);
		expect(screen.getByText("1d20+2")).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Iniciar nova sessão" }),
		);
		fireEvent.click(
			await screen.findByRole("button", { name: "Iniciar sessão 2" }),
		);
		await waitFor(() => expect(db.sessionCalls).toBe(1));
		expect(
			await screen.findByText("Sessão 2 iniciada — o feed começa em branco"),
		).toBeTruthy();
		expect(screen.queryByText("1d20+2")).toBeNull();
	});

	it("no celular o feed abre sem escurecer o mapa", async () => {
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
				<div role="application" aria-label="mapa" onPointerDown={onMap} />
				<VTTFeedPanel />
			</>,
		);
		expect(
			await screen.findByRole("dialog", { name: "Rolagens e chat" }),
		).toBeTruthy();
		expect(document.querySelector("[data-slot='dialog-overlay']")).toBeNull();
		const map = screen.getByRole("application", { name: "mapa" });
		fireEvent.pointerDown(map);
		expect(onMap).toHaveBeenCalled();
		expect(
			screen.getByRole("dialog", { name: "Rolagens e chat" }),
		).toBeTruthy();
	});

	it("a linha secreta chega 5 vezes e continua sem valor depois de reconectar", async () => {
		db.sessionId = "s1";
		db.sessions = [{ id: "s1", started_at: "2026-10-29T18:00:00.000Z" }];
		useVTTStore.setState({ isGM: false });
		render(<VTTFeedPanel />);
		expect(await screen.findByText(/Sessão 1 iniciada/)).toBeTruthy();
		for (let index = 0; index < 5; index++) {
			const row = {
				id: `secret-${index}`,
				campaign_id: "camp-1",
				scene_id: "scene-1",
				session_id: "s1",
				author_id: "user-m",
				character_id: null,
				kind: "roll",
				formula: null,
				label: null,
				message: null,
				is_secret: true,
				created_at: `2026-10-29T18:10:0${index}.000Z`,
			};
			db.rolls.push(row);
			db.results.push({
				roll_id: row.id,
				total: 21 + index,
				details: {
					formula: `9d9+${index}`,
					count: 9,
					faces: 9,
					modifier: index,
					rolls: [index + 1],
				},
			});
			act(() => {
				db.onRoll?.({ eventType: "INSERT", new: row });
			});
		}
		expect(screen.getAllByText(SECRET_ROLL_TEXT)).toHaveLength(5);
		for (let index = 0; index < 5; index++) {
			expect(screen.queryByText(String(21 + index))).toBeNull();
			expect(screen.queryByText(`9d9+${index}`)).toBeNull();
		}
		act(() => {
			db.onStatus?.("CHANNEL_ERROR");
			db.onStatus?.("SUBSCRIBED");
		});
		await waitFor(() =>
			expect(screen.getAllByText(SECRET_ROLL_TEXT)).toHaveLength(5),
		);
		for (let index = 0; index < 5; index++) {
			expect(screen.queryByText(String(21 + index))).toBeNull();
			expect(screen.queryByText(`9d9+${index}`)).toBeNull();
		}
	});
});
