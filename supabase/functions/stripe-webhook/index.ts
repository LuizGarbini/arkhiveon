import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import {
	handleStripeEvent,
	type PlanChange,
} from "../_shared/stripe-plan.ts";

// Esta função é chamada pelo Stripe, que não manda login do Supabase: no
// config.toml ela fica com verify_jwt = false. Quem garante a origem é a
// assinatura do webhook, conferida abaixo antes de qualquer gravação.
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

		let event: Awaited<ReturnType<typeof stripe.webhooks.constructEventAsync>>;
		try {
			event = await stripe.webhooks.constructEventAsync(
				body,
				signature,
				stripeWebhookSecret,
			);
		} catch (err) {
			// Assinatura inválida: não é do Stripe. 400, sem reenvio útil.
			console.error(
				"Invalid webhook signature:",
				err instanceof Error ? err.message : "unknown",
			);
			return jsonResponse({ error: "Invalid signature." }, 400);
		}

		const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
		const upsertPlan = async ({ userId, plan }: PlanChange) => {
			const { error } = await supabaseAdmin.from("user_plans").upsert(
				{
					user_id: userId,
					plan,
					updated_at: new Date().toISOString(),
				},
				{ onConflict: "user_id" },
			);
			return error ? { message: error.message } : null;
		};

		const result = await handleStripeEvent(event, upsertPlan);
		return jsonResponse(result.body, result.status);
	} catch (err) {
		// Erro inesperado: 500 para o Stripe tentar de novo mais tarde.
		console.error(
			"Webhook error:",
			err instanceof Error ? err.message : "Unknown error",
		);
		return jsonResponse({ error: "Webhook failed." }, 500);
	}
});
