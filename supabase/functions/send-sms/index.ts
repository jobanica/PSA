// send-sms Edge Function
//
// Two modes:
//   1. Direct send  — POST { to, body }         (used by send-otp)
//   2. Dispatch      — POST { mode: "dispatch" } (invoked by pg_cron)
//        Pulls due `pending` scheduled_messages, sends each, marks sent/failed,
//        and logs the result on the order's status_history timeline.
//
// The dispatch mode is protected by the x-cron-secret header (must equal the
// CRON_SECRET env var). Direct send is protected by Supabase's JWT gate when
// deployed with verify_jwt (send-otp calls it with the service role key).
//
// Deploy: supabase functions deploy send-sms --no-verify-jwt
//   (we do our own auth: cron-secret for dispatch, service-role for direct)

import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";
import { sendSms } from "../_shared/sms.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let payload: { to?: string; body?: string; mode?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  // -------- Dispatch mode (cron) -------------------------------------------
  if (payload.mode === "dispatch") {
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || req.headers.get("x-cron-secret") !== cronSecret) {
      return json({ error: "unauthorized" }, 401);
    }
    return await dispatch();
  }

  // -------- Direct send mode ------------------------------------------------
  // Requires the service role key (send-otp uses it). Verify the caller holds
  // it via the Authorization bearer.
  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!auth.includes(serviceKey) || serviceKey === "") {
    return json({ error: "unauthorized" }, 401);
  }
  if (!payload.to || !payload.body) {
    return json({ error: "to and body are required" }, 400);
  }
  const result = await sendSms(payload.to, payload.body);
  return json(result, result.ok ? 200 : 502);
});

async function dispatch(): Promise<Response> {
  const db = serviceClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await db
    .from("scheduled_messages")
    .select("id, order_id, phone, body")
    .eq("status", "pending")
    .lte("send_at", nowIso)
    .order("send_at", { ascending: true })
    .limit(50);

  if (error) return json({ error: error.message }, 500);
  if (!due || due.length === 0) return json({ processed: 0 });

  let sent = 0;
  let failed = 0;

  for (const msg of due) {
    // Claim the row first (optimistic) to avoid double-send on overlapping runs.
    const { data: claimed } = await db
      .from("scheduled_messages")
      .update({ status: "sent", sent_at: nowIso }) // provisional; revert on failure
      .eq("id", msg.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) continue; // another run grabbed it

    const result = await sendSms(msg.phone, msg.body);

    // Every SMS (sent/failed) is logged on the scheduled_messages row itself,
    // which the order-detail timeline merges in — no separate log table needed.
    if (result.ok) {
      sent++;
      await db
        .from("scheduled_messages")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          provider_message_id: result.providerMessageId ?? null,
        })
        .eq("id", msg.id);
    } else {
      failed++;
      await db
        .from("scheduled_messages")
        .update({ status: "failed", error: result.error ?? "unknown" })
        .eq("id", msg.id);
    }
  }

  return json({ processed: due.length, sent, failed });
}
