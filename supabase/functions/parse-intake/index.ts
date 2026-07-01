// parse-intake Edge Function
//
// Smart Paste parser for the Manual Order Entry page. Takes a messy blob of
// customer text and returns structured JSON for staff to review and correct.
// The Anthropic API key lives ONLY in this function's secrets — never in the
// frontend. The React app calls this function, not Anthropic directly.
//
// Deploy: supabase functions deploy parse-intake  (JWT-gated: staff only)

import { corsHeaders, json } from "../_shared/cors.ts";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-opus-4-8";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SCHEMA_HINT = `{
  "first_name": "",
  "middle_name": "",
  "last_name": "",
  "sex": "",
  "date_of_birth": "",
  "place_of_birth": "",
  "fathers_full_name": "",
  "mothers_full_name": "",
  "delivery": {
    "recipient_name": "",
    "phone": "",
    "address_line": "",
    "barangay": "",
    "city": "",
    "province": "",
    "postal_code": ""
  },
  "unmatched_notes": ""
}`;

const SYSTEM_PROMPT =
  `You extract Philippine PSA document request details from a customer's raw message. ` +
  `Return ONLY valid JSON matching this exact schema, no markdown, no commentary. ` +
  `If a field is missing or unclear, leave it as an empty string and put a short note in unmatched_notes. ` +
  `Normalize dates to YYYY-MM-DD. Map sex values loosely: "M"/"male"/"lalaki" -> "Male"; ` +
  `"F"/"female"/"babae" -> "Female". Do not invent data.\n\nSchema:\n` +
  SCHEMA_HINT;

// Strip ``` fences the model may add despite instructions, then parse.
function safeParse(text: string): unknown | null {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "ANTHROPIC_API_KEY not configured" }, 500);

  let body: { text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  if (!body.text || !body.text.trim()) {
    return json({ error: "text is required" }, 400);
  }

  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: body.text }],
      }),
    });
  } catch (e) {
    return json({ error: "failed to reach parser", detail: String(e) }, 502);
  }

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: "parser error", detail }, 502);
  }

  const data = await res.json();
  const rawText = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("");

  const parsed = safeParse(rawText);
  if (parsed === null) {
    // Never block the order — surface the raw response for manual filling.
    return json({ parsed: null, raw: rawText });
  }
  return json({ parsed, raw: rawText });
});
