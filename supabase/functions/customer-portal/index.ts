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

    const { leagueId, plan } = await request.json();
    const requestedPlan = plan === "max" ? "max" : "plus";
    const { data: league } = await admin.from("leagues").select("id, owner_id").eq("id", leagueId).maybeSingle();
    if (!league || league.owner_id !== authData.user.id) return json({ error: "Only the league owner can manage billing." }, 403);

    const { data: subscription } = await admin
      .from("league_subscriptions")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("league_id", league.id)
      .maybeSingle();
    if (!subscription?.stripe_customer_id) return json({ error: "No league billing account exists yet." }, 404);

    if (requestedPlan === "max") {
      const maxPriceId = Deno.env.get("STRIPE_MAX_PRICE_ID");
      if (!maxPriceId) return json({ error: "Leagues MAX price is not configured." }, 500);

      let subscriptionId = subscription.stripe_subscription_id || "";
      if (!subscriptionId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: subscription.stripe_customer_id,
          status: "active",
          limit: 1,
        });
        subscriptionId = subscriptions.data[0]?.id || "";
      }
      if (!subscriptionId) {
        const trialingSubscriptions = await stripe.subscriptions.list({
          customer: subscription.stripe_customer_id,
          status: "trialing",
          limit: 1,
        });
        subscriptionId = trialingSubscriptions.data[0]?.id || "";
      }
      if (!subscriptionId) return json({ error: "No active subscription was found for this league." }, 404);

      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const itemId = stripeSubscription.items.data[0]?.id;
      if (!itemId) return json({ error: "No subscription item was found for this league." }, 404);

      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: `${siteUrl()}/`,
        flow_data: {
          type: "subscription_update_confirm",
          subscription_update_confirm: {
            subscription: subscriptionId,
            items: [{ id: itemId, price: maxPriceId, quantity: 1 }],
          },
          after_completion: {
            type: "redirect",
            redirect: { return_url: `${siteUrl()}/?league_plan=success` },
          },
        },
      });
      return json({ url: session.url });
    }

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
