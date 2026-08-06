// @vitest-environment jsdom

import type { Session, User } from "@supabase/supabase-js";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
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

// Mock the auth context hook
vi.mock("@/lib/auth", () => {
	return {
		AuthProvider: ({ children }: { children: ReactNode }) => children,
		useAuth: () => ({
			user: {
				id: "test-user-id",
				email: "test@arkhiveon.com",
			} as unknown as User,
			loading: false,
			session: {
				user: {
					id: "test-user-id",
					email: "test@arkhiveon.com",
				} as unknown as User,
			} as unknown as Session,
			plan: "free",
			storageUsedBytes: 0,
			isPro: false,
			planLoading: false,
			signIn: vi.fn(),
			signUp: vi.fn(),
			signOut: vi.fn(),
			resetPassword: vi.fn(),
			updatePassword: vi.fn(),
			signInWithOAuth: vi.fn(),
		}),
	};
});

describe("Routes smoke tests", () => {
	beforeEach(() => {
		useRPGStore.setState({
			loadCampaigns: vi.fn().mockResolvedValue(undefined),
			loadRemoteData: vi.fn().mockResolvedValue(undefined),
			setupRealtime: vi.fn().mockReturnValue(() => {}),
		});
	});
	it("renders auth page or redirects without crashing", async () => {
		const router = createRouter({
			routeTree,
		});

		render(<RouterProvider router={router} />);

		await router.navigate({ to: "/auth", search: { mode: "login" } });

		await waitFor(() => {
			expect(document.title).toContain("Arkhiveon");
		});
	});

	it("renders dashboard page without crashing", async () => {
		const router = createRouter({
			routeTree,
		});

		render(<RouterProvider router={router} />);

		await router.navigate({ to: "/dashboard" });

		await waitFor(() => {
			expect(document.title).toContain("Dashboard");
		});
	});

	it("renders characters page without crashing", async () => {
		useRPGStore.setState({
			campaigns: [
				{
					id: "test-campaign-id",
					name: "Test Campaign",
					description: "",
					system: "dnd5e",
					ownerId: "test-user-id",
					worldId: "test-world-id",
					myRole: "owner",
					createdAt: Date.now(),
				},
			],
			activeCampaignId: "test-campaign-id",
			hasLoadedCampaigns: true,
		});

		const router = createRouter({
			routeTree,
		});

		render(<RouterProvider router={router} />);

		await router.navigate({ to: "/characters" });

		await waitFor(() => {
			expect(document.title).toContain("Personagens");
		});
	});
});
