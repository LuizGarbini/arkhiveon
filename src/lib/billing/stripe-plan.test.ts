import { describe, expect, it, vi } from "vitest";
import {
	handleStripeEvent,
	type PlanChange,
	planChangeFromEvent,
	resolveReturnOrigin,
} from "../../../supabase/functions/_shared/stripe-plan";

const quiet = { error: vi.fn(), log: vi.fn(), warn: vi.fn() };
const checkout = (userId: string | null) => ({
	type: "checkout.session.completed",
	data: { object: { client_reference_id: userId } },
});
const canceled = (userId?: string) => ({
	type: "customer.subscription.deleted",
	data: { object: { metadata: userId ? { supabase_user_id: userId } : {} } },
});

describe("o que o evento pede", () => {
	it("checkout concluído vira Pro e cancelamento vira grátis", () => {
		expect(planChangeFromEvent(checkout("u1"))).toEqual({
			userId: "u1",
			plan: "pro",
		});
		expect(planChangeFromEvent(canceled("u2"))).toEqual({
			userId: "u2",
			plan: "free",
		});
	});

	it("sem o id do usuário, ou em outro evento, não há mudança", () => {
		expect(planChangeFromEvent(checkout(null))).toBeNull();
		expect(planChangeFromEvent(canceled())).toBeNull();
		expect(
			planChangeFromEvent({ type: "invoice.paid", data: { object: {} } }),
		).toBeNull();
		expect(
			planChangeFromEvent({
				type: "checkout.session.completed",
				data: { object: null },
			}),
		).toBeNull();
	});
});

describe("resposta ao Stripe", () => {
	it("grava o plano e responde 200", async () => {
		const upsert = vi.fn(async (_: PlanChange) => null);
		const result = await handleStripeEvent(checkout("u1"), upsert, quiet);
		expect(result.status).toBe(200);
		expect(upsert).toHaveBeenCalledWith({ userId: "u1", plan: "pro" });
	});

	it("falha ao gravar responde 500 para o Stripe reenviar", async () => {
		const result = await handleStripeEvent(
			checkout("u1"),
			async () => ({ message: "db fora do ar" }),
			quiet,
		);
		expect(result.status).toBe(500);
		expect(JSON.stringify(result.body)).not.toContain("db fora do ar");
	});

	it("falha ao gravar o cancelamento também pede reenvio", async () => {
		const result = await handleStripeEvent(
			canceled("u2"),
			async () => ({ message: "x" }),
			quiet,
		);
		expect(result.status).toBe(500);
	});

	it("evento sem usuário responde 200 sem gravar (reenviar não ajudaria)", async () => {
		const upsert = vi.fn(async () => null);
		const result = await handleStripeEvent(checkout(null), upsert, quiet);
		expect(result.status).toBe(200);
		expect(upsert).not.toHaveBeenCalled();
	});

	it("evento que não mexe no plano é ignorado com 200", async () => {
		const upsert = vi.fn(async () => null);
		for (const type of ["invoice.payment_failed", "customer.created"]) {
			const result = await handleStripeEvent(
				{ type, data: { object: { customer: "cus_1" } } },
				upsert,
				quiet,
			);
			expect(result.status).toBe(200);
		}
		expect(upsert).not.toHaveBeenCalled();
	});
});

describe("para onde o checkout devolve o usuário", () => {
	const app = "https://app.arkhiveon.com";

	it("usa o endereço do app quando nada válido foi pedido", () => {
		expect(resolveReturnOrigin(undefined, app)).toBe(app);
		expect(resolveReturnOrigin("não é url", app)).toBe(app);
		expect(resolveReturnOrigin("javascript:alert(1)", app)).toBe(app);
	});

	it("aceita só origens permitidas e corta caminho e parâmetros", () => {
		expect(resolveReturnOrigin(`${app}/qualquer?x=1`, app)).toBe(app);
		expect(resolveReturnOrigin("https://evil.example", app)).toBe(app);
		expect(
			resolveReturnOrigin("http://localhost:3000/billing", app, [
				"http://localhost:3000",
			]),
		).toBe("http://localhost:3000");
		expect(resolveReturnOrigin("http://localhost:3000", app, [])).toBe(app);
	});
});
