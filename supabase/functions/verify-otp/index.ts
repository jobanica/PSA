// verify-otp Edge Function
//
// Checks a submitted code against the stored hash, expiry, and attempt count.
// On success, issues a short-lived verify_token that submit_public_order
// requires. Max 5 attempts per code, then the code is dead and a new one is
// needed.
//
// Deploy: supabase functions deploy verify-otp --no-verify-jwt

import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

const MAX_ATTEMPTS = 5;
const TOKEN_TTL_MS = 15 * 60 * 1000; // token valid 15 min to complete the order

function normalizePhone(raw: string): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) return "+63" + digits.slice(1);
  if (digits.startsWith("63")) return "+" + digits;
  if (raw.startsWith("+")) return "+" + digits;
  return "+63" + digits;
}

async function hashCode(code: string, phone: string): Promise<string> {
  const data = new TextEncoder().encode(`${code}:${phone}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: { phone?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  if (!body.phone || !body.code) {
    return json({ error: "phone and code are required" }, 400);
  }
  const phone = normalizePhone(body.phone);
  const db = serviceClient();

  // Most recent unverified, unexpired code for this phone
  const { data: otp } = await db
    .from("otp_codes")
    .select("*")
    .eq("phone", phone)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otp) {
    return json({ error: "Code expired or not found. Request a new one." }, 400);
  }
  if (otp.attempts >= MAX_ATTEMPTS) {
    return json({ error: "Too many attempts. Request a new code." }, 429);
  }

  const submittedHash = await hashCode(body.code, phone);
  if (submittedHash !== otp.code_hash) {
    await db.from("otp_codes").update({ attempts: otp.attempts + 1 }).eq(
      "id",
      otp.id,
    );
    const left = MAX_ATTEMPTS - (otp.attempts + 1);
    return json({ error: `Incorrect code. ${left} attempt(s) left.` }, 400);
  }

  // Success — issue verify token
  const verify_token = crypto.randomUUID();
  const token_expires_at = new Date(Date.now() + TOKEN_TTL_MS).toISOString();
  await db.from("otp_codes").update({
    verified: true,
    verify_token,
    token_expires_at,
  }).eq("id", otp.id);

  return json({ ok: true, verify_token, phone });
});
