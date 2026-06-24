// @vitest-environment jsdom

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { render, waitFor } from "@testing-library/react";
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

describe("Routes smoke tests", () => {
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
