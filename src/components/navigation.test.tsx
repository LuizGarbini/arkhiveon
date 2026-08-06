// @vitest-environment jsdom

import type { Session, User } from "@supabase/supabase-js";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
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

describe("Router navigation loop test", () => {
	beforeEach(() => {
		useRPGStore.setState({
			loadCampaigns: vi.fn().mockResolvedValue(undefined),
			loadRemoteData: vi.fn().mockResolvedValue(undefined),
			setupRealtime: vi.fn().mockReturnValue(() => {}),
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
			worlds: [
				{
					id: "test-world-id",
					name: "Test World",
					ownerUserId: "test-user-id",
					isDefault: true,
					createdAt: Date.now(),
				},
			],
			activeCampaignId: "test-campaign-id",
			activeWorldId: "test-world-id",
			hasLoadedCampaigns: true,
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
});
