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
    const { data: authData, error: authError } = await users.auth.getUser();
    if (authError || !authData.user) return json({ error: "Sign in again before managing League Plus." }, 401);

    const { leagueId } = await request.json();
    const { data: league } = await admin.from("leagues").select("id, owner_id").eq("id", leagueId).maybeSingle();
    if (!league || league.owner_id !== authData.user.id) return json({ error: "Only the league owner can manage billing." }, 403);

    const { data: subscription } = await admin
      .from("league_subscriptions")
      .select("stripe_customer_id")
      .eq("league_id", league.id)
      .maybeSingle();
    if (!subscription?.stripe_customer_id) return json({ error: "No League Plus billing account exists yet." }, 404);

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${siteUrl()}/`,
    });
    return json({ url: session.url });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Could not open billing." }, 500);
  }
});
