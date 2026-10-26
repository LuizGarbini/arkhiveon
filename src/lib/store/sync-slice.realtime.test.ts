// @vitest-environment jsdom
import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O rewrite do canal foi desfeito. O único acréscimo em relação à main é
 * esperar `realtime.setAuth()` antes do subscribe: sem o JWT no join, a RLS
 * de `characters` esconde o PV que a outra mesa gravou.
 */
type PostgresHandler = (payload: {
	eventType: string;
	table: string;
	new: Record<string, unknown>;
	old: Record<string, unknown>;
}) => void;

const gate = vi.hoisted(() => ({
	calls: [] as string[],
	handlers: [] as PostgresHandler[],
	user: Promise.resolve({ data: { user: null as { id: string } | null } }),
	auth: Promise.resolve() as Promise<void>,
	resolveUser: (_value: { data: { user: { id: string } | null } }) => {},
	resolveAuth: () => {},
}));

vi.mock("../supabase", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../supabase")>();
	return {
		...actual,
		getSupabase: () => ({
			auth: { getUser: () => gate.user },
			realtime: {
				setAuth: () => {
					gate.calls.push("setAuth");
					return gate.auth;
				},
			},
			channel: () => {
				gate.calls.push("channel");
				const channel = {
					on: (_event: string, _filter: unknown, callback: PostgresHandler) => {
						gate.calls.push("on");
						gate.handlers.push(callback);
						return channel;
					},
					subscribe: () => {
						gate.calls.push("subscribe");
						return channel;
					},
				};
				return channel;
			},
			removeChannel: () => {
				gate.calls.push("removeChannel");
			},
		}),
	};
});

import { useRPGStore } from "../store";
import { characterDefaults } from "./character-slice";

function defer<T>() {
	let resolve: (value: T) => void = () => {};
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

async function tick() {
	await act(async () => {
		await new Promise((resolve) => {
			setTimeout(resolve, 0);
		});
	});
}

beforeEach(() => {
	const user = defer<{ data: { user: { id: string } | null } }>();
	const auth = defer<void>();
	gate.calls = [];
	gate.handlers = [];
	gate.user = user.promise;
	gate.auth = auth.promise;
	gate.resolveUser = user.resolve;
	gate.resolveAuth = auth.resolve;
});

describe("setupRealtime — PV da ficha", () => {
	it("assina o canal só depois do JWT e aplica o health que chega em characters.data", async () => {
		useRPGStore.setState({
			activeCampaignId: "camp-1",
			campaigns: [
				{
					id: "camp-1",
					name: "Mesa",
					description: "",
					ownerId: "gm-1",
					worldId: "world-1",
					createdAt: 0,
				},
			],
			characters: [
				{
					...characterDefaults,
					id: "char-1",
					createdAt: 0,
					health: 33,
					healthMax: 38,
				},
			],
		});

		const stop = useRPGStore.getState().setupRealtime();
		expect(gate.calls).not.toContain("subscribe");

		gate.resolveUser({ data: { user: null } });
		await tick();
		expect(gate.calls).toContain("setAuth");
		expect(gate.calls).not.toContain("subscribe");

		gate.resolveAuth();
		await tick();

		const order = ["setAuth", "channel", "on", "subscribe"];
		let previous = -1;
		for (const name of order) {
			const index = gate.calls.indexOf(name);
			expect(index).toBeGreaterThan(previous);
			previous = index;
		}

		gate.handlers[0]?.({
			eventType: "UPDATE",
			table: "characters",
			new: {
				id: "char-1",
				campaign_id: "camp-1",
				data: { health: 28, healthMax: 38 },
			},
			old: { id: "char-1", campaign_id: "camp-1" },
		});

		const character = useRPGStore
			.getState()
			.characters.find((item) => item.id === "char-1");
		expect(character?.health).toBe(28);
		expect(character?.healthMax).toBe(38);
		stop();
		expect(gate.calls).toContain("removeChannel");
	});

	it("não assina se o realtime desmontar antes do JWT", async () => {
		const stop = useRPGStore.getState().setupRealtime();
		stop();
		gate.resolveUser({ data: { user: null } });
		gate.resolveAuth();
		await tick();
		expect(gate.calls).not.toContain("setAuth");
		expect(gate.calls).not.toContain("subscribe");
	});

	it("não assina se desmontar enquanto o JWT ainda está sendo aplicado", async () => {
		const stop = useRPGStore.getState().setupRealtime();
		gate.resolveUser({ data: { user: { id: "user-1" } } });
		await tick();
		expect(gate.calls).toContain("setAuth");
		stop();
		gate.resolveAuth();
		await tick();
		expect(gate.calls).not.toContain("subscribe");
		expect(gate.calls).not.toContain("removeChannel");
	});
});
