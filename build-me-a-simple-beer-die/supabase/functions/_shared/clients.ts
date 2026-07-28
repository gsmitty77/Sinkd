import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@18";

function requiredEnv(name: string, fallbackName = "") {
  const value = Deno.env.get(name) || (fallbackName ? Deno.env.get(fallbackName) : "");
  if (!value) throw new Error(`Missing required Edge Function secret: ${fallbackName ? `${name} or ${fallbackName}` : name}`);
  return value;
}

export function serviceClient() {
  return createClient(requiredEnv("SUPABASE_URL", "PROJECT_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY", "SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

export function userClient(authorization: string) {
  return createClient(requiredEnv("SUPABASE_URL", "PROJECT_URL"), requiredEnv("SUPABASE_ANON_KEY", "ANON_KEY"), {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
}

export function stripeClient() {
  return new Stripe(requiredEnv("STRIPE_SECRET_KEY"));
}

export function siteUrl() {
  return (Deno.env.get("SITE_URL") || "https://sinkd.online").replace(/\/+$/, "");
}
