// @vitest-environment jsdom

import type { Session } from "@supabase/supabase-js";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { type ReactNode, StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRPGStore } from "@/lib/store";
import { routeTree } from "../routeTree.gen";

// Mock matchMedia for jsdom environment
window.matchMedia =
	window.matchMedia ||
	(() => ({
		matches: false,
		media: "",
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));

const { authSession, authActions } = vi.hoisted(() => {
	const createSession = (): Session => ({
		access_token: "test-access-token",
		expires_at: 1,
		expires_in: 3600,
		refresh_token: "test-refresh-token",
		token_type: "bearer",
		user: {
			app_metadata: {},
			aud: "authenticated",
			created_at: "2026-01-01T00:00:00.000Z",
			email: "test@arkhiveon.com",
			id: "test-user-id",
			user_metadata: {},
		},
	});
	let currentSession = createSession();
	const listeners = new Set<() => void>();

	return {
		authSession: {
			getSnapshot: () => currentSession,
			refresh: () => {
				currentSession = {
					...createSession(),
					access_token: "refreshed-access-token",
				};
				listeners.forEach((listener) => {
					listener();
				});
			},
			reset: () => {
				currentSession = createSession();
			},
			subscribe: (listener: () => void) => {
				listeners.add(listener);
				return () => {
					listeners.delete(listener);
				};
			},
		},
		authActions: {
			resetPassword: vi.fn(),
			signIn: vi.fn(),
			signInWithOAuth: vi.fn(),
			signOut: vi.fn(),
			signUp: vi.fn(),
			updatePassword: vi.fn(),
		},
	};
});

vi.mock("@/lib/auth", async () => {
	const { useSyncExternalStore } = await import("react");
	return {
		AuthProvider: ({ children }: { children: ReactNode }) => children,
		useAuth: () => {
			const session = useSyncExternalStore(
				authSession.subscribe,
				authSession.getSnapshot,
			);
			return {
				...authActions,
				loading: false,
				session,
				user: session?.user ?? null,
				plan: "free",
				storageUsedBytes: 0,
				isPro: false,
				planLoading: false,
			};
		},
	};
});

describe("Router navigation loop test", () => {
	beforeEach(() => {
		cleanup();
		authSession.reset();
		useRPGStore.setState({
			activeCampaignId: "campaign-1",
			activeWorldId: "world-1",
			campaignLoadStatus: "ready",
			campaigns: [
				{
					id: "campaign-1",
					name: "Campanha",
					description: "",
					ownerId: "test-user-id",
					worldId: "world-1",
					myRole: "owner",
					createdAt: 1,
				},
			],
			hasLoadedCampaigns: true,
			loadCampaigns: vi.fn().mockResolvedValue(undefined),
			loadRemoteData: vi.fn().mockResolvedValue(undefined),
			setupRealtime: vi.fn().mockReturnValue(() => {}),
		});
	});

	it("renders settings page without crashing", async () => {
		const router = createRouter({
			routeTree,
		});

		render(<RouterProvider router={router} />);

		// Navigate to settings
		await router.navigate({ to: "/settings" });

		// Wait and see if it successfully renders the page title
		await waitFor(() => {
			expect(screen.getByText("Preferências da plataforma")).toBeDefined();
		});
	});

	it("renders account page without crashing", async () => {
		const router = createRouter({
			routeTree,
		});

		render(<RouterProvider router={router} />);

		// Navigate to account
		await router.navigate({ to: "/account" });

		// Wait and see if it successfully renders the page title
		await waitFor(() => {
			expect(screen.getAllByText("Aventureiro").length).toBeGreaterThan(0);
		});
	});

	it("renders Arkhiveon brand logo linking to dashboard in sidebar and header", async () => {
		const router = createRouter({
			routeTree,
		});

		render(<RouterProvider router={router} />);

		// Navigate to settings first
		await router.navigate({ to: "/settings" });

		await waitFor(() => {
			expect(screen.getByText("Preferências da plataforma")).toBeDefined();
		});

		// Check for links to /dashboard with Arkhiveon branding
		const dashboardLinks = screen.getAllByRole("link", {
			name: /dashboard/i,
		});
		expect(dashboardLinks.length).toBeGreaterThan(0);

		const brandLogoLinks = screen.getAllByRole("link", {
			name: "Ir para a visão inicial (Dashboard)",
		});
		expect(brandLogoLinks.length).toBe(2);
		for (const link of brandLogoLinks) {
			expect(link.getAttribute("href")).toBe("/dashboard");
		}
	});

	it("navigates between protected routes without restarting campaign bootstrap", async () => {
		const router = createRouter({ routeTree });
		const loadCampaigns = useRPGStore.getState().loadCampaigns;

		render(<RouterProvider router={router} />);
		await router.navigate({ to: "/settings" });
		await waitFor(() => {
			expect(screen.getByText("Preferências da plataforma")).toBeDefined();
		});

		await router.navigate({ to: "/account" });
		await waitFor(() => {
			expect(screen.getAllByText("Aventureiro").length).toBeGreaterThan(0);
		});

		expect(loadCampaigns).toHaveBeenCalledTimes(1);
		expect(screen.queryByText("Comece pelo seu Mundo")).toBeNull();
	});

	it("runs the initial campaign bootstrap once in StrictMode", async () => {
		const router = createRouter({ routeTree });
		const loadCampaigns = useRPGStore.getState().loadCampaigns;

		render(
			<StrictMode>
				<RouterProvider router={router} />
			</StrictMode>,
		);
		await router.navigate({ to: "/account" });
		await waitFor(() => {
			expect(screen.getAllByText("Aventureiro").length).toBeGreaterThan(0);
		});

		expect(loadCampaigns).toHaveBeenCalledTimes(1);
	});

	it("does not reload campaign bootstrap when the same user refreshes their session", async () => {
		const router = createRouter({ routeTree });
		const loadCampaigns = useRPGStore.getState().loadCampaigns;

		render(<RouterProvider router={router} />);
		await router.navigate({ to: "/account" });
		await waitFor(() => {
			expect(screen.getAllByText("Aventureiro").length).toBeGreaterThan(0);
		});

		act(() => authSession.refresh());

		await waitFor(() => {
			expect(loadCampaigns).toHaveBeenCalledTimes(1);
		});
	});

	it("keeps account accessible when campaign bootstrap fails", async () => {
		const campaignError = "Erro ao carregar campanhas: network unavailable";
		const loadCampaigns = vi.fn(async () => {
			useRPGStore.setState({
				campaignLoadStatus: "error",
				syncError: campaignError,
			});
		});
		const loadRemoteData = vi.fn(async () => {
			useRPGStore.setState({ syncError: null });
		});
		useRPGStore.setState({
			activeCampaignId: null,
			activeWorldId: null,
			campaignLoadStatus: "idle",
			campaigns: [],
			hasLoadedCampaigns: false,
			loadCampaigns,
			loadRemoteData,
			syncError: null,
		});
		const router = createRouter({ routeTree });

		render(<RouterProvider router={router} />);
		await router.navigate({ to: "/account" });

		await waitFor(() => {
			expect(screen.getAllByText("Aventureiro").length).toBeGreaterThan(0);
		});
		expect(screen.queryByText("Comece pelo seu Mundo")).toBeNull();
		expect(screen.getByText(campaignError)).toBeDefined();
		expect(useRPGStore.getState().syncError).toBe(campaignError);
		expect(loadRemoteData).not.toHaveBeenCalled();
	});
});
