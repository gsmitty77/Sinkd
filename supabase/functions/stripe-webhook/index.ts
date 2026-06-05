import Stripe from "npm:stripe@18";
import { serviceClient, stripeClient } from "../_shared/clients.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();

function planFromPrice(priceId = "", fallback = "plus") {
  if (priceId && priceId === Deno.env.get("STRIPE_MAX_PRICE_ID")) return "max";
  if (priceId && priceId === Deno.env.get("STRIPE_PLUS_PRICE_ID")) return "plus";
  return fallback === "max" ? "max" : "plus";
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed.", { status: 405 });

  const stripe = stripeClient();
  const signature = request.headers.get("Stripe-Signature");
  const signingSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!signature || !signingSecret) return new Response("Webhook is not configured.", { status: 500 });

  try {
    const event = await stripe.webhooks.constructEventAsync(
      await request.text(),
      signature,
      signingSecret,
      undefined,
      cryptoProvider,
    );
    const admin = serviceClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const leagueId = session.metadata?.league_id;
      if (leagueId) {
        const plan = session.metadata?.plan === "max" ? "max" : "plus";
        await admin.from("league_subscriptions").upsert({
          league_id: leagueId,
          stripe_customer_id: String(session.customer || ""),
          stripe_subscription_id: String(session.subscription || ""),
          stripe_price_id: plan === "max" ? Deno.env.get("STRIPE_MAX_PRICE_ID") || "" : Deno.env.get("STRIPE_PLUS_PRICE_ID") || Deno.env.get("STRIPE_PRICE_ID") || "",
          plan,
          status: "active",
          updated_at: new Date().toISOString(),
        });
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const leagueId = subscription.metadata?.league_id;
      if (leagueId) {
        const priceId = subscription.items.data[0]?.price?.id || "";
        await admin.from("league_subscriptions").upsert({
          league_id: leagueId,
          stripe_customer_id: String(subscription.customer),
          stripe_subscription_id: subscription.id,
          stripe_price_id: priceId,
          plan: planFromPrice(priceId, subscription.metadata?.plan),
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(error);
    return new Response(error instanceof Error ? error.message : "Invalid webhook.", { status: 400 });
  }
});
