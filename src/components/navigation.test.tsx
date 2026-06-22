// @vitest-environment jsdom

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
		AuthProvider: ({ children }: any) => children,
		useAuth: () => ({
			loading: false,
			session: {
				user: { id: "test-user-id", email: "test@arkhiveon.com" },
			} as any,
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
