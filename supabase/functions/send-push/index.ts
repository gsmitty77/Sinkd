import { createClient } from "npm:@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

type PushSubscriptionRow = {
  id: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
};

type NotificationRow = {
  id: string;
  recipient_id: string | null;
  recipient_email: string | null;
  type: string;
  title: string;
  message: string;
  link_target: string | null;
  image_url: string | null;
  created_by: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:support@sinkd.app";

  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return json({ error: "Push function secrets are not fully configured." }, 500);
  }

  const callerId = authUserId(request.headers.get("authorization") || "");
  if (!callerId) return json({ error: "Missing authenticated user." }, 401);

  const { notificationId } = await request.json().catch(() => ({ notificationId: "" }));
  if (!notificationId) return json({ error: "Missing notificationId." }, 400);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: notification, error: notificationError } = await supabase
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .single<NotificationRow>();

  if (notificationError || !notification) return json({ error: "Notification not found." }, 404);
  if (notification.created_by && notification.created_by !== callerId) return json({ error: "Not allowed." }, 403);

  let query = supabase.from("push_subscriptions").select("id, subscription");
  if (notification.recipient_id) {
    query = query.eq("user_id", notification.recipient_id);
  } else if (notification.recipient_email) {
    query = query.eq("email", notification.recipient_email.toLowerCase());
  } else {
    return json({ sent: 0, failed: 0 });
  }

  const { data: subscriptions, error: subscriptionError } = await query.returns<PushSubscriptionRow[]>();
  if (subscriptionError) return json({ error: subscriptionError.message }, 500);
  if (!subscriptions?.length) return json({ sent: 0, failed: 0 });

  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const payload = JSON.stringify({
    title: notification.title || "Sinkd",
    body: notification.message || "New notification",
    icon: notification.image_url || "/assets/app-icon.png",
    badge: "/assets/app-icon.png",
    tag: notification.id,
    data: { linkTarget: notification.link_target || "notifications" },
  });

  let sent = 0;
  let failed = 0;
  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (item) => {
      try {
        await webPush.sendNotification(item.subscription, payload);
        sent += 1;
      } catch (error) {
        failed += 1;
        const statusCode = Number((error as { statusCode?: number }).statusCode || 0);
        if (statusCode === 404 || statusCode === 410) expiredIds.push(item.id);
        console.error(error);
      }
    }),
  );

  if (expiredIds.length) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }

  return json({ sent, failed, removed: expiredIds.length });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function authUserId(header: string) {
  const token = header.replace(/^Bearer\s+/i, "");
  const [, payload] = token.split(".");
  if (!payload) return "";
  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = `${normalizedPayload}${"=".repeat((4 - (normalizedPayload.length % 4)) % 4)}`;
    const decoded = JSON.parse(atob(normalized));
    return decoded.sub || "";
  } catch {
    return "";
  }
}
