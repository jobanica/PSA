// send-otp Edge Function
//
// Generates a 6-digit code, stores only its hash, and sends it via send-sms.
// Public endpoint — heavily rate limited because every SMS costs money:
//   - per phone:  max 3 sends / 15 min
//   - per IP:     max 8 sends / 15 min
//   - cooldown:   60s between sends to the same phone
//
// Deploy: supabase functions deploy send-otp --no-verify-jwt

import { corsHeaders, json } from "../_shared/cors.ts";
import { serviceClient } from "../_shared/supabase.ts";

const OTP_TTL_MS = 5 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;

function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    "unknown";
}

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

  let body: { phone?: string; honeypot?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  // Honeypot: real users leave this empty. Bots that fill every field get 200
  // but nothing is sent.
  if (body.honeypot) return json({ ok: true });

  if (!body.phone) return json({ error: "phone is required" }, 400);
  const phone = normalizePhone(body.phone);
  if (phone.replace(/\D/g, "").length < 11) {
    return json({ error: "invalid phone number" }, 400);
  }

  const db = serviceClient();
  const ip = clientIp(req);

  // Rate limits
  const { data: phoneOk } = await db.rpc("rate_limit_check", {
    p_bucket: `send_otp:phone:${phone}`,
    p_max: 3,
    p_window: "15 minutes",
  });
  const { data: ipOk } = await db.rpc("rate_limit_check", {
    p_bucket: `send_otp:ip:${ip}`,
    p_max: 8,
    p_window: "15 minutes",
  });
  if (phoneOk === false || ipOk === false) {
    return json({ error: "Too many requests. Please try again later." }, 429);
  }

  // Cooldown: reject if a code was sent to this phone in the last 60s
  const { data: recent } = await db
    .from("otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < COOLDOWN_MS) {
    return json({ error: "Please wait before requesting another code.", cooldown: 60 }, 429);
  }

  // Generate + store
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const code_hash = await hashCode(code, phone);
  const expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString();

  const { error: insErr } = await db.from("otp_codes").insert({
    phone,
    code_hash,
    expires_at,
    attempts: 0,
    verified: false,
  });
  if (insErr) return json({ error: insErr.message }, 500);

  // Render OTP SMS body from settings template
  const { data: tpl } = await db.from("settings").select("value").eq(
    "key",
    "sms_templates",
  ).maybeSingle();
  const { data: biz } = await db.from("settings").select("value").eq(
    "key",
    "business_name",
  ).maybeSingle();
  const businessName = (biz?.value as string) ?? "DocuassistPH";
  const template = (tpl?.value as Record<string, string>)?.otp ??
    "Your {business_name} verification code is {code}. It expires in 5 minutes.";
  const smsBody = template.replaceAll("{code}", code).replaceAll(
    "{business_name}",
    businessName,
  );

  // Send via send-sms (direct mode, authenticated with the service role key)
  const edgeBase = Deno.env.get("SUPABASE_URL")! + "/functions/v1";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const smsRes = await fetch(`${edgeBase}/send-sms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ to: phone, body: smsBody }),
  });

  if (!smsRes.ok) {
    const err = await smsRes.text();
    return json({ error: "Failed to send SMS", detail: err }, 502);
  }

  return json({ ok: true, phone, cooldown: 60 });
});
