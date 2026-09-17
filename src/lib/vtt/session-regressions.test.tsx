// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { VTTToken } from "./types";
import { useVTTStore } from "./vtt-store";

const mock = vi.hoisted(() => ({
	ownersFail: false,
	writes: [] as Array<(value: unknown) => void>,
	canvas: null as null | {
		onUpdateToken: (id: string, updates: Partial<VTTToken>) => Promise<void>;
		characterOwners: unknown[];
	},
}));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => options,
	useParams: () => ({ campaignId: "campaign" }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user }) }));
vi.mock("@/lib/store", () => ({
	useRPGStore: (selector: (s: unknown) => unknown) => selector({ campaigns }),
}));
vi.mock("@/components/vtt/vtt-canvas", () => ({
	VTTCanvas: (props: typeof mock.canvas) => {
		mock.canvas = props;
		return null;
	},
}));
vi.mock("@/components/vtt/vtt-fog-controls", () => ({
	VTTFogControls: () => null,
}));
vi.mock("@/components/vtt/vtt-grid-settings", () => ({
	VTTGridSettings: () => null,
}));
vi.mock("@/components/vtt/vtt-journal", () => ({ VTTJournal: () => null }));
vi.mock("@/components/vtt/vtt-roster-drawer", () => ({
	VTTRosterDrawer: () => null,
}));
vi.mock("@/components/vtt/vtt-scene-bar", () => ({ VTTSceneBar: () => null }));
vi.mock("@/components/vtt/vtt-token-menu", () => ({
	VTTTokenMenu: () => null,
}));
vi.mock("@/components/vtt/vtt-toolbar", () => ({ VTTToolbar: () => null }));
vi.mock("@/components/vtt/vtt-zoom-controls", () => ({
	VTTZoomControls: () => null,
}));

const user = { id: "player" };
const campaigns = [{ id: "campaign", ownerId: "gm", myRole: "viewer" }];
const token: VTTToken = {
	id: "token",
	sceneId: "scene",
	characterId: "character",
	name: "Hero",
	layer: "token",
	x: 0,
	y: 0,
	sizeCells: 1,
	rotation: 0,
	elevation: 0,
	conditions: [],
	auras: [],
	visionRange: 6,
	isLocked: false,
	isHidden: false,
	controlledBy: [],
	hpCurrent: 12,
};
vi.mock("@/lib/supabase", () => ({
	getSupabase: () => ({
		from: (table: string) => {
			let writing = false;
			const query = {
				select: () => query,
				eq: () => query,
				order: () => query,
				update: () => {
					writing = true;
					return query;
				},
				single: () =>
					writing
						? new Promise((resolve) => mock.writes.push(resolve))
						: Promise.resolve({ data: null, error: null }),
				maybeSingle: () => Promise.resolve({ data: null, error: null }),
				// biome-ignore lint/suspicious/noThenProperty: Supabase query builders are intentionally thenable.
				then: (resolve: (value: unknown) => unknown) =>
					Promise.resolve(
						table === "characters"
							? {
									data: mock.ownersFail
										? null
										: [{ id: "character", user_id: "player" }],
									error: mock.ownersFail ? new Error("offline") : null,
								}
							: {
									data:
										table === "vtt_scenes"
											? [
													{
														id: "scene",
														campaign_id: "campaign",
														name: "Scene",
														is_active: true,
													},
												]
											: [],
									error: null,
								},
					).then(resolve),
			};
			return query;
		},
		channel: () => {
			const channel = {
				on: () => channel,
				subscribe: () => channel,
				unsubscribe: vi.fn(),
				untrack: vi.fn(),
				track: vi.fn(),
			};
			return channel;
		},
		removeChannel: vi.fn(),
	}),
}));

import { Route } from "@/routes/campaigns/$campaignId/vtt";

const Page = (Route as unknown as { component: ComponentType }).component;
const initial = useVTTStore.getState();
beforeEach(() => {
	mock.ownersFail = false;
	mock.writes = [];
	mock.canvas = null;
	useVTTStore.setState(initial, true);
});
afterEach(cleanup);
async function open() {
	const view = render(<Page />);
	await waitFor(() => expect(mock.canvas?.characterOwners.length).toBe(1));
	await act(async () => {
		useVTTStore.getState().setTokens([token]);
	});
	return view;
}
it("shows an ownership query error and retries it to restore control", async () => {
	mock.ownersFail = true;
	render(<Page />);
	const retry = await screen.findByRole("button", {
		name: "Recarregar permissões",
	});
	expect(screen.getByRole("alert").textContent).toContain("permissões");
	mock.ownersFail = false;
	fireEvent.click(retry);
	await waitFor(() => expect(mock.canvas?.characterOwners.length).toBe(1));
	expect(screen.queryByRole("alert")).toBeNull();
});
it("does not let a response from an unmounted session overwrite current HP", async () => {
	const old = await open();
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { hpCurrent: 10 });
	});
	old.unmount();
	await open();
	act(() => {
		useVTTStore.getState().updateToken("token", { hpCurrent: 8 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await pending;
	});
	expect(useVTTStore.getState().tokens[0].hpCurrent).toBe(8);
});
it("does not rewind the token while another drag is active", async () => {
	await open();
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { x: 100 });
	});
	act(() => {
		useVTTStore.setState({ draggedTokenId: "token" });
		useVTTStore.getState().updateToken("token", { x: 200 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await pending;
	});
	expect(useVTTStore.getState().tokens[0].x).toBe(200);
});

function canvas() {
	if (!mock.canvas) throw new Error("Canvas not mounted");
	return mock.canvas;
}

it("ignores a failed write from an ended session without reloading current tokens", async () => {
	const old = await open();
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { hpCurrent: 10 });
	});
	old.unmount();
	await open();
	act(() => {
		useVTTStore.getState().updateToken("token", { hpCurrent: 8 });
	});
	await act(async () => {
		mock.writes[0]({ data: null, error: new Error("rejected") });
		await pending;
	});
	expect(useVTTStore.getState().tokens[0].hpCurrent).toBe(8);
	expect(screen.queryByRole("alert")).toBeNull();
});
it("applies HP updates during a drag without overwriting its position", async () => {
	await open();
	let pending: Promise<void>;
	act(() => {
		pending = canvas().onUpdateToken("token", { x: 100, y: 100, hpCurrent: 8 });
	});
	act(() => {
		useVTTStore.setState({ draggedTokenId: "token" });
		useVTTStore.getState().updateToken("token", { x: 200, y: 300 });
	});
	await act(async () => {
		mock.writes[0]({ data: { id: "token" }, error: null });
		await pending;
	});
	expect(useVTTStore.getState().tokens[0]).toMatchObject({
		x: 200,
		y: 300,
		hpCurrent: 8,
	});
});
