import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

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
		const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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

		// Parse origin from request for redirect URLs
		const body = await req.json().catch(() => ({}));
		const origin = body.origin || "http://localhost:3000";

		// ── Developer mock mode ──────────────────────────────────────────
		// When STRIPE_SECRET_KEY is not configured, skip Stripe entirely
		// and upgrade the user directly in the database.
		if (!stripeSecretKey) {
			const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

			const { error: upsertError } = await supabaseAdmin
				.from("user_plans")
				.upsert(
					{
						user_id: user.id,
						plan: "pro",
						updated_at: new Date().toISOString(),
					},
					{ onConflict: "user_id" },
				);

			if (upsertError) {
				return jsonResponse(
					{ error: "Failed to update plan: " + upsertError.message },
					200,
				);
			}

			return jsonResponse({
				url: `${origin}/billing?success=true&mock=true`,
			});
		}

		// ── Production Stripe flow ───────────────────────────────────────
		const Stripe = (await import("https://esm.sh/stripe@14.14.0")).default;
		const stripe = new Stripe(stripeSecretKey, {
			apiVersion: "2024-04-10",
			httpClient: Stripe.createFetchHttpClient(),
		});

		if (!stripePriceId) {
			return jsonResponse(
				{ error: "STRIPE_PRO_PRICE_ID is not configured." },
				200,
			);
		}

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
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("stripe-checkout error:", message);
		return jsonResponse({ error: message }, 200);
	}
});
