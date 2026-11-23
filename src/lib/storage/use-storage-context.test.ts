// @vitest-environment jsdom

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useStorageContext } from "./use-storage-context";

const auth = vi.hoisted(() => ({
	user: { id: "u1" } as { id: string } | null,
	plan: "free" as "free" | "pro",
	storageUsedBytes: 38_400_000,
	planLoading: false,
	planStatus: "ready" as "loading" | "ready" | "error",
	overLimitSince: null as string | null,
}));

vi.mock("@/lib/auth", () => ({
	useAuth: () => ({
		user: auth.user,
		plan: auth.plan,
		storageUsedBytes: auth.storageUsedBytes,
		planLoading: auth.planLoading,
		planStatus: auth.planStatus,
		overLimitSince: auth.overLimitSince,
	}),
}));

describe("useStorageContext", () => {
	afterEach(() => {
		cleanup();
		auth.user = { id: "u1" };
		auth.plan = "free";
		auth.storageUsedBytes = 38_400_000;
		auth.planLoading = false;
		auth.planStatus = "ready";
		auth.overLimitSince = null;
		window.localStorage.clear();
	});

	it("lê o cache de user_plans e deixa o recorte PDF/imagens vazio", () => {
		const { result } = renderHook(() => useStorageContext());
		expect(result.current).toEqual({
			status: "ready",
			label: "free",
			usedBytes: 38_400_000,
			limitBytes: 100_000_000,
			usedPdfs: null,
			usedImages: null,
			overLimitSince: null,
			payerName: null,
		});
	});

	it("Pro usa o limite de 10 GB", () => {
		auth.plan = "pro";
		auth.storageUsedBytes = 1_310_000_000;
		const { result } = renderHook(() => useStorageContext());
		expect(result.current.label).toBe("pro");
		expect(result.current.limitBytes).toBe(10_000_000_000);
		expect(result.current.usedBytes).toBe(1_310_000_000);
	});

	it("enquanto o plano não chega, status é loading — a UI não deve mostrar Free/0 MB", () => {
		auth.planLoading = true;
		auth.planStatus = "loading";
		const { result } = renderHook(() => useStorageContext());
		expect(result.current.status).toBe("loading");
	});

	it("plano com erro não cai em ready/Free", () => {
		auth.planStatus = "error";
		const { result } = renderHook(() => useStorageContext());
		expect(result.current.status).toBe("error");
	});

	it("sem usuário autenticado fica em loading", () => {
		auth.user = null;
		const { result } = renderHook(() => useStorageContext());
		expect(result.current.status).toBe("loading");
	});
});
