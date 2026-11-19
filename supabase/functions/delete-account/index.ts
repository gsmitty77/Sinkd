import { createClient } from "npm:@supabase/supabase-js@2";
import postgres from "npm:postgres@4.1.1";

type MemberRow = {
  user_id: string | null;
  role: string;
};

type BlockedLeague = {
  name: string;
  needsTransfer: boolean;
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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const databaseUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !databaseUrl) {
    return json({ error: "Account deletion is not configured." }, 500);
  }

  const authorization = request.headers.get("Authorization") || request.headers.get("authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const users = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await users.auth.getUser(token);
  const user = authData?.user;
  if (authError || !user?.id) return json({ error: "Missing authenticated user." }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let sql: ReturnType<typeof postgres> | null = null;

  try {
    sql = postgres(databaseUrl, { prepare: false, max: 1 });
    const result = await deleteOwnedData(sql, user.id, user.email || "");
    if (result.blocked.length) return json({ error: blockedMessage(result.blocked) }, 409);

    // TODO: If the user has a Stripe subscription, leave it running.
    // Do not cancel it here and do not call Stripe from this function.
    // Smitty can cancel the leftover subscription in the Stripe dashboard.
    if (result.stripeSubscriptionIds.length) {
      console.warn(
        `TODO: leaving Stripe subscription(s) active after account deletion for ${user.id}: ${result.stripeSubscriptionIds.join(", ")}`,
      );
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error(deleteError);
      return json({ error: "Could not delete the account. Try again." }, 500);
    }

    return json({ deleted: true });
  } catch (error) {
    console.error(error);
    return json({ error: "Could not delete the account. Try again." }, 500);
  } finally {
    try {
      await sql?.end({ timeout: 5 });
    } catch (error) {
      console.error(error);
    }
  }
});

async function deleteOwnedData(sql: ReturnType<typeof postgres>, userId: string, email: string) {
  return await sql.begin(async (tx) => {
    // Owner-row updates are blocked unless this flag is set. It has to be
    // set in this transaction so preferred-partner links on owner rows can
    // be cleared before auth.admin.deleteUser runs.
    await tx`select set_config('sinkd.allow_owner_transfer', 'on', true)`;

    const owned = await tx<{ id: string; name: string }[]>`
      select id, name
      from public.leagues
      where owner_id = ${userId}::uuid
      for update
    `;

    const blocked: BlockedLeague[] = [];
    for (const league of owned) {
      const members = await tx<MemberRow[]>`
        select user_id, role
        from public.league_members
        where league_id = ${league.id}::uuid
        for update
      `;
      const others = members.filter((member) => {
        const memberId = String(member.user_id || "").toLowerCase();
        if (memberId && memberId === userId.toLowerCase()) return false;
        if (member.role === "owner" && !member.user_id) return false;
        return true;
      });
      if (!others.length) continue;
      blocked.push({
        name: league.name || "a league",
        needsTransfer: others.some((member) => Boolean(member.user_id)),
      });
    }
    if (blocked.length) return { blocked, stripeSubscriptionIds: [] as string[] };

    const subscriptions = await tx<{ stripe_subscription_id: string }[]>`
      select stripe_subscription_id
      from public.league_subscriptions
      where league_id in (select id from public.leagues where owner_id = ${userId}::uuid)
        and coalesce(btrim(stripe_subscription_id), '') <> ''
    `;

    if (owned.length) {
      await tx`delete from public.leagues where owner_id = ${userId}::uuid`;
    }

    // Shared leagues stay. These match the foreign keys that set the user
    // reference to null, so other players keep games, chat, and stats.
    await tx`update public.league_members set user_id = null where user_id = ${userId}::uuid`;
    await tx`update public.league_members set preferred_partner_user_id = null where preferred_partner_user_id = ${userId}::uuid`;
    await tx`update public.league_games set logged_by = null where logged_by = ${userId}::uuid`;
    await tx`update public.league_tournaments set created_by = null where created_by = ${userId}::uuid`;
    await tx`update public.league_seasons set created_by = null where created_by = ${userId}::uuid`;
    await tx`update public.league_chat_messages set user_id = null where user_id = ${userId}::uuid`;
    await tx`update public.notifications set created_by = null where created_by = ${userId}::uuid`;
    await tx`update public.feedback set user_id = null where user_id = ${userId}::uuid`;
    await tx`update public.friend_requests set recipient_id = null where recipient_id = ${userId}::uuid`;

    await tx`delete from public.player_profiles where user_id = ${userId}::uuid`;
    await tx`delete from public.push_subscriptions where user_id = ${userId}::uuid`;
    await tx`delete from public.notifications where recipient_id = ${userId}::uuid`;
    await tx`delete from public.league_poll_votes where user_id = ${userId}::uuid`;
    await tx`delete from public.friend_requests where requester_id = ${userId}::uuid`;
    await tx`delete from public.app_admins where user_id = ${userId}::uuid`;

    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail) {
      await tx`delete from public.push_subscriptions where lower(btrim(email)) = ${normalizedEmail}`;
      await tx`delete from public.notifications where lower(btrim(recipient_email)) = ${normalizedEmail}`;
    }

    return {
      blocked,
      stripeSubscriptionIds: subscriptions.map((row) => row.stripe_subscription_id),
    };
  });
}

function blockedMessage(blocked: BlockedLeague[]) {
  const names = blocked.map((league) => league.name);
  const list = names.length === 1 ? names[0] : names.join(", ");
  if (blocked.some((league) => league.needsTransfer)) {
    return names.length === 1
      ? `You still own ${list}, and other people are in it. Open that league and use Transfer Ownership, then delete your account.`
      : `You still own leagues with other people in them (${list}). Open each league and use Transfer Ownership, then delete your account.`;
  }
  return names.length === 1
    ? `You still own ${list}, which has other roster spots or invites. Remove those people, then delete your account.`
    : `You still own leagues with other roster spots or invites (${list}). Remove those people, then delete your account.`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
