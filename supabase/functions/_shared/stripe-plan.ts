/**
 * stripe-plan — o que cada evento do Stripe faz com o plano do usuário.
 *
 * Sem dependência de Deno: roda na Edge Function `stripe-webhook` e nos testes
 * do Vitest. A função grava o plano por `upsertPlan` (injetada) e responde ao
 * Stripe só com o resultado: falha de gravação vira 500, para o Stripe reenviar
 * o evento (200 faz o Stripe desistir de reenviar).
 */

export type Plan = "pro" | "free";

export interface StripeEventLike {
	type: string;
	data: { object: unknown };
}

export interface PlanChange {
	userId: string;
	plan: Plan;
}

export interface WebhookResult {
	status: number;
	body: Record<string, unknown>;
}

function field(value: unknown, key: string): unknown {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)[key]
		: undefined;
}

function nonEmptyString(value: unknown): string | null {
	return typeof value === "string" && value.length > 0 ? value : null;
}

/** Assinou: o checkout leva o id do usuário em `client_reference_id`. */
function fromCheckout(object: unknown): PlanChange | null {
	const userId = nonEmptyString(field(object, "client_reference_id"));
	return userId ? { userId, plan: "pro" } : null;
}

/** Cancelou: o id do usuário vem da metadata gravada na assinatura. */
function fromSubscriptionDeleted(object: unknown): PlanChange | null {
	const userId = nonEmptyString(
		field(field(object, "metadata"), "supabase_user_id"),
	);
	return userId ? { userId, plan: "free" } : null;
}

/** Mudança de plano que o evento pede; `null` se o evento não mexe no plano. */
export function planChangeFromEvent(event: StripeEventLike): PlanChange | null {
	if (event.type === "checkout.session.completed")
		return fromCheckout(event.data.object);
	if (event.type === "customer.subscription.deleted")
		return fromSubscriptionDeleted(event.data.object);
	return null;
}

/** Eventos que pedem mudança de plano (para separar "sem usuário" de "ignorado"). */
const PLAN_EVENTS = new Set([
	"checkout.session.completed",
	"customer.subscription.deleted",
]);

export async function handleStripeEvent(
	event: StripeEventLike,
	upsertPlan: (change: PlanChange) => Promise<{ message: string } | null>,
	log: Pick<Console, "error" | "log" | "warn"> = console,
): Promise<WebhookResult> {
	if (!PLAN_EVENTS.has(event.type)) {
		if (event.type === "invoice.payment_failed") {
			log.warn(
				`Payment failed for customer ${String(field(event.data.object, "customer"))}.`,
			);
		} else {
			log.log(`Unhandled event type: ${event.type}`);
		}
		return { status: 200, body: { received: true } };
	}

	const change = planChangeFromEvent(event);
	if (!change) {
		// Reenviar não ajuda: o evento não diz de quem é. Fica no log.
		log.error(`${event.type}: evento sem o id do usuário.`);
		return { status: 200, body: { received: true, skipped: "no_user" } };
	}

	const error = await upsertPlan(change);
	if (error) {
		log.error(`Failed to set plan ${change.plan}:`, error.message);
		return { status: 500, body: { error: "Plan update failed." } };
	}
	log.log(`User ${change.userId} set to ${change.plan}.`);
	return { status: 200, body: { received: true } };
}

/**
 * Para onde o Stripe devolve o usuário depois do checkout. Só vale um endereço
 * http(s) que esteja na lista permitida (usa apenas a origem, sem caminho nem
 * parâmetros); qualquer outra coisa cai no endereço do app. Lista vazia
 * aceita só o próprio `fallback`.
 */
export function resolveReturnOrigin(
	requested: unknown,
	fallback: string,
	allowed: readonly string[] = [],
): string {
	if (typeof requested !== "string") return fallback;
	try {
		const url = new URL(requested);
		if (url.protocol !== "https:" && url.protocol !== "http:") return fallback;
		const permitted = new Set(
			[fallback, ...allowed].map((item) => {
				try {
					return new URL(item).origin;
				} catch {
					return item;
				}
			}),
		);
		return permitted.has(url.origin) ? url.origin : fallback;
	} catch {
		return fallback;
	}
}
