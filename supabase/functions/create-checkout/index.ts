import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient, siteUrl, stripeClient, userClient } from "../_shared/clients.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("Authorization") || "";
    const users = userClient(authorization);
    const admin = serviceClient();
    const stripe = stripeClient();
    const priceId = Deno.env.get("STRIPE_PRICE_ID");
    if (!priceId) return json({ error: "League Plus price is not configured." }, 500);

    const { data: authData, error: authError } = await users.auth.getUser();
    if (authError || !authData.user) return json({ error: "Sign in again before upgrading." }, 401);

    const { leagueId } = await request.json();
    if (!leagueId) return json({ error: "Choose a league." }, 400);

    const { data: league } = await admin.from("leagues").select("id, name, owner_id").eq("id", leagueId).maybeSingle();
    if (!league || league.owner_id !== authData.user.id) return json({ error: "Only the league owner can upgrade this league." }, 403);

    const { data: entitlement } = await admin.rpc("has_league_plus_for_user", {
      target_league_id: league.id,
      target_user_id: authData.user.id,
    });
    if (entitlement) return json({ error: "This league already has League Plus." }, 409);

    const { data: savedSubscription } = await admin
      .from("league_subscriptions")
      .select("stripe_customer_id")
      .eq("league_id", league.id)
      .maybeSingle();

    let customerId = savedSubscription?.stripe_customer_id || "";
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: authData.user.email,
        name: league.name,
        metadata: { league_id: league.id, owner_id: authData.user.id },
      });
      customerId = customer.id;
      await admin.from("league_subscriptions").upsert({
        league_id: league.id,
        stripe_customer_id: customerId,
        stripe_price_id: priceId,
        status: "inactive",
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${siteUrl()}/?league_plus=success`,
      cancel_url: `${siteUrl()}/?league_plus=cancelled`,
      metadata: { league_id: league.id, owner_id: authData.user.id },
      subscription_data: { metadata: { league_id: league.id, owner_id: authData.user.id } },
    });

    return json({ url: session.url });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Could not start checkout." }, 500);
  }
});
