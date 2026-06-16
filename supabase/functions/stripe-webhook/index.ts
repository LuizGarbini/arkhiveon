import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type, stripe-signature",
	"Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...corsHeaders, "Content-Type": "application/json" },
	});
}

serve(async (req) => {
	if (req.method === "OPTIONS") {
		return new Response("ok", { headers: corsHeaders });
	}

	try {
		const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
		const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

		if (!stripeSecretKey || !stripeWebhookSecret) {
			return jsonResponse(
				{ error: "Stripe environment variables not configured." },
				500,
			);
		}

		const Stripe = (await import("https://esm.sh/stripe@14.14.0")).default;
		const stripe = new Stripe(stripeSecretKey, {
			apiVersion: "2024-04-10",
			httpClient: Stripe.createFetchHttpClient(),
		});

		const body = await req.text();
		const signature = req.headers.get("stripe-signature");

		if (!signature) {
			return jsonResponse({ error: "Missing stripe-signature header." }, 400);
		}

		const event = await stripe.webhooks.constructEventAsync(
			body,
			signature,
			stripeWebhookSecret,
		);

		const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

		switch (event.type) {
			// ── Checkout completed → upgrade to pro ──────────────────────
			case "checkout.session.completed": {
				const session = event.data.object;
				const userId = session.client_reference_id;

				if (!userId) {
					console.error("checkout.session.completed: missing client_reference_id");
					break;
				}

				const { error } = await supabaseAdmin
					.from("user_plans")
					.upsert(
						{
							user_id: userId,
							plan: "pro",
							updated_at: new Date().toISOString(),
						},
						{ onConflict: "user_id" },
					);

				if (error) {
					console.error("Failed to upgrade user plan:", error.message);
				} else {
					console.log(`User ${userId} upgraded to pro.`);
				}
				break;
			}

			// ── Subscription deleted → downgrade to free ─────────────────
			case "customer.subscription.deleted": {
				const subscription = event.data.object;
				const userId = subscription.metadata?.supabase_user_id;

				if (!userId) {
					console.error(
						"customer.subscription.deleted: missing supabase_user_id in metadata",
					);
					break;
				}

				const { error } = await supabaseAdmin
					.from("user_plans")
					.upsert(
						{
							user_id: userId,
							plan: "free",
							updated_at: new Date().toISOString(),
						},
						{ onConflict: "user_id" },
					);

				if (error) {
					console.error("Failed to downgrade user plan:", error.message);
				} else {
					console.log(`User ${userId} downgraded to free.`);
				}
				break;
			}

			// ── Invoice payment failed → optional: notify user ───────────
			case "invoice.payment_failed": {
				const invoice = event.data.object;
				console.warn(
					`Payment failed for customer ${invoice.customer}. Subscription will be canceled by Stripe if retries fail.`,
				);
				break;
			}

			default:
				console.log(`Unhandled event type: ${event.type}`);
		}

		return jsonResponse({ received: true });
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("Webhook error:", message);
		return jsonResponse({ error: message }, 400);
	}
});
