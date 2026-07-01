// Provider-agnostic SMS sending.
//
// The active provider is chosen by the SMS_PROVIDER env var:
//   - "mock"      (default) — logs the message, returns a fake id. No real send.
//   - "semaphore" — Philippine gateway (SEMAPHORE_API_KEY, SEMAPHORE_SENDER_NAME)
//   - "twilio"    — global fallback (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN,
//                   TWILIO_FROM)
//
// To go live, set SMS_PROVIDER + the matching credentials as Edge Function
// secrets. Until then everything runs end-to-end against the mock so the queue,
// cron, OTP and status flows can all be exercised without spending on SMS.

export interface SmsResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface SmsProvider {
  send(to: string, body: string): Promise<SmsResult>;
}

const mockProvider: SmsProvider = {
  async send(to, body) {
    console.log(`[sms:mock] -> ${to}: ${body}`);
    return { ok: true, providerMessageId: `mock-${crypto.randomUUID()}` };
  },
};

const semaphoreProvider: SmsProvider = {
  async send(to, body) {
    const apiKey = Deno.env.get("SEMAPHORE_API_KEY");
    const sender = Deno.env.get("SEMAPHORE_SENDER_NAME") ?? "";
    if (!apiKey) return { ok: false, error: "SEMAPHORE_API_KEY not set" };
    try {
      const res = await fetch("https://api.semaphore.co/api/v4/messages", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          apikey: apiKey,
          number: to,
          message: body,
          ...(sender ? { sendername: sender } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: JSON.stringify(data) };
      const id = Array.isArray(data) ? String(data[0]?.message_id ?? "") : "";
      return { ok: true, providerMessageId: id };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};

const twilioProvider: SmsProvider = {
  async send(to, body) {
    const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const token = Deno.env.get("TWILIO_AUTH_TOKEN");
    const from = Deno.env.get("TWILIO_FROM");
    if (!sid || !token || !from) {
      return { ok: false, error: "Twilio credentials not set" };
    }
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(`${sid}:${token}`),
          },
          body: new URLSearchParams({ To: to, From: from, Body: body }),
        },
      );
      const data = await res.json();
      if (!res.ok) return { ok: false, error: JSON.stringify(data) };
      return { ok: true, providerMessageId: data.sid };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },
};

export function getProvider(): SmsProvider {
  switch ((Deno.env.get("SMS_PROVIDER") ?? "mock").toLowerCase()) {
    case "semaphore":
      return semaphoreProvider;
    case "twilio":
      return twilioProvider;
    default:
      return mockProvider;
  }
}

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  return await getProvider().send(to, body);
}
