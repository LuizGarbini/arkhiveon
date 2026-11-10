import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { resolveReturnOrigin } from "../_shared/stripe-plan.ts";

const corsHeaders = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Headers":
		"authorization, x-client-info, apikey, content-type",
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
		const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
		const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
		const authHeader = req.headers.get("Authorization") ?? "";

		// Authenticate user
		const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
			global: { headers: { Authorization: authHeader } },
		});

		const {
			data: { user },
			error: authError,
		} = await supabaseUserClient.auth.getUser();

		if (authError || !user) {
			return jsonResponse({ error: "Unauthorized" }, 401);
		}

		const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
		const stripePriceId = Deno.env.get("STRIPE_PRO_PRICE_ID");

		// Sem o Stripe configurado não existe checkout: nunca promover o usuário
		// sem cobrança (antes havia um "modo de teste" que dava o Pro de graça).
		if (!stripeSecretKey || !stripePriceId) {
			console.error("stripe-checkout: Stripe não configurado.");
			return jsonResponse(
				{ error: "Pagamentos indisponíveis no momento." },
				503,
			);
		}

		// O endereço de volta vem do cliente. Com APP_URL / APP_ALLOWED_ORIGINS
		// configurados, só vale o que estiver na lista. Sem configuração, aceita
		// a origem enviada (validada, sem caminho), como antes.
		const body = await req.json().catch(() => ({}));
		const appUrl = Deno.env.get("APP_URL") ?? "";
		const allowedOrigins = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
			.split(",")
			.map((item) => item.trim())
			.filter(Boolean);
		const restricted = Boolean(appUrl) || allowedOrigins.length > 0;
		if (!restricted)
			console.warn(
				"stripe-checkout: APP_URL não configurado; aceitando a origem enviada.",
			);
		const requested = typeof body?.origin === "string" ? body.origin : "";
		const origin = restricted
			? resolveReturnOrigin(
					requested,
					appUrl || allowedOrigins[0],
					allowedOrigins,
				)
			: resolveReturnOrigin(requested, "http://localhost:3000", [requested]);

		// ── Fluxo de produção do Stripe ──────────────────────────────────
		const Stripe = (await import("https://esm.sh/stripe@14.14.0")).default;
		const stripe = new Stripe(stripeSecretKey, {
			apiVersion: "2024-04-10",
			httpClient: Stripe.createFetchHttpClient(),
		});

		// Check if user already has a Stripe customer
		const existingCustomers = await stripe.customers.list({
			email: user.email,
			limit: 1,
		});

		let customerId: string;
		if (existingCustomers.data.length > 0) {
			customerId = existingCustomers.data[0].id;
		} else {
			const customer = await stripe.customers.create({
				email: user.email,
				metadata: { supabase_user_id: user.id },
			});
			customerId = customer.id;
		}

		const session = await stripe.checkout.sessions.create({
			customer: customerId,
			client_reference_id: user.id,
			line_items: [{ price: stripePriceId, quantity: 1 }],
			mode: "subscription",
			success_url: `${origin}/billing?success=true`,
			cancel_url: `${origin}/billing?canceled=true`,
			subscription_data: {
				metadata: { supabase_user_id: user.id },
			},
		});

		return jsonResponse({ url: session.url });
	} catch (err) {
		console.error(
			"stripe-checkout error:",
			err instanceof Error ? err.message : "Unknown error",
		);
		return jsonResponse({ error: "Não foi possível iniciar o pagamento." }, 500);
	}
});
