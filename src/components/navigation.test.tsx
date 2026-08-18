import type { Session, User } from "@supabase/supabase-js";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
			campaigns: [
				{
					id: "c1",
					name: "Campanha Principal",
					description: "Descrição de teste",
					worldId: "w1",
					system: "dnd5e",
					createdAt: 1767225600000,
					updatedAt: 1767225600000,
					ownerId: "test-user-id",
				},
			],
			worlds: [
				{
					id: "w1",
					name: "Mundo de Teste",
					isDefault: true,
					createdAt: 1767225600000,
					updatedAt: 1767225600000,
					ownerUserId: "test-user-id",
				},
			],
			activeCampaignId: "c1",
			activeWorldId: "w1",
			hasLoadedCampaigns: true,
			loadCampaigns: vi.fn().mockResolvedValue(undefined),
			loadRemoteData: vi.fn().mockResolvedValue(undefined),
			setupRealtime: vi.fn().mockReturnValue(() => {}),
		});
	});

	afterEach(() => {
		cleanup();
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
});
