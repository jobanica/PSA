# DocuassistPH — PSA Document Processing CRM

A web app to run a Philippine PSA document processing service. Customers come from
Facebook ads → a public landing page where they self-order (OTP-gated). Staff
process orders through a fixed 6-stage pipeline with automatic SMS updates.

- **Public site** — ad landing page (`/`), self-order flow (`/order`), order tracking (`/track`).
- **Internal ops dashboard** — staff-only (`/staff/*`), for processing, printing, and monitoring.

## Tech stack

- **Frontend:** React + Vite + TypeScript + TailwindCSS (mobile-first)
- **Backend / DB / Auth:** Supabase (Postgres, RLS, Auth, Edge Functions, pg_cron)
- **LLM:** Anthropic Claude (`claude-opus-4-8`) via an Edge Function, for Smart Paste parsing
- **SMS:** provider-agnostic (`mock` default; Semaphore / Twilio pluggable)

---

## The business flow (6 fixed stages)

`New Order → Submitted to PSA → Released → Shipped → Delivered → Paid`

Orders are born at **New Order** (customers self-order with all details captured up
front). Advancing a stage is one click and drives automatic SMS.

---

## Folder structure

```
.
├─ src/
│  ├─ lib/            # supabaseClient, types, constants, api helpers, statusMessage
│  ├─ hooks/          # useSettings, useDocumentTypes
│  ├─ context/        # AuthContext, ToastContext
│  ├─ components/     # StatusBadge, StatusStepper, ProtectedRoute, layout/StaffLayout
│  ├─ pages/
│  │  ├─ public/      # Landing, OrderWizard (OTP), Track
│  │  └─ staff/       # Login, Dashboard, Orders, OrderDetail, OrderPrint,
│  │                  #   ManualEntry (Smart Paste), Customers, CustomerDetail,
│  │                  #   Reports, Settings
│  ├─ App.tsx         # router
│  └─ main.tsx
├─ supabase/
│  ├─ migrations/     # 0001..0006 — run these in order in the SQL editor
│  └─ functions/      # send-sms, send-otp, verify-otp, parse-intake (+ _shared)
├─ .env.example
└─ README.md
```

---

## Setup

### 1. Create a Supabase project

At [supabase.com](https://supabase.com), create a project. From **Project Settings → API**
grab the **Project URL**, the **anon public key**, and (for later, secrets only) the
**service_role key**.

### 2. Frontend env vars

Copy `.env.example` to `.env` and fill in the two public values:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> Only `VITE_*` values belong in the frontend. The service role key, Anthropic key,
> and SMS/cron secrets live **only** in Edge Function secrets — never in `.env` here.

### 3. Run the SQL migrations

In the Supabase **SQL editor**, run the files in `supabase/migrations/` **in order**:

| File | What it does |
|---|---|
| `0001_schema.sql` | Tables + enums + triggers |
| `0002_seed_and_functions.sql` | Seeds the 4 document types & default settings; order-code + payment helpers |
| `0003_sms_and_status_logic.sql` | SMS template rendering, `advance_order_status`, scheduling/cancellation |
| `0004_public_rpcs.sql` | `track_order`, `submit_public_order`, rate limiting, insert defaults |
| `0005_rls.sql` | Row Level Security policies + grants |
| `0006_cron.sql` | pg_cron dispatcher for the SMS queue (see step 6) |

Seeded document types (PHP, all-in / your cost):

| Document | Price | Your cost |
|---|---|---|
| PSA Birth Certificate | 685 | 205 |
| PSA Marriage Certificate | 685 | 205 |
| PSA Death Certificate | 685 | 205 |
| CENOMAR / NOR | 750 | 255 |

Shipping cost defaults to ₱105 (configurable in Settings). Margin per order = price − PSA cost − shipping.

### 4. Create a staff user

**Authentication → Users → Add user** (email + password). The customer flow needs
no accounts; only staff sign in (at `/staff/login`).

### 5. Deploy the Edge Functions

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# OTP + SMS functions do their own auth, so deploy without the JWT gate:
supabase functions deploy send-sms  --no-verify-jwt
supabase functions deploy send-otp  --no-verify-jwt
supabase functions deploy verify-otp --no-verify-jwt

# Smart Paste is staff-only — keep the JWT gate:
supabase functions deploy parse-intake
```

Set the secrets (never in the frontend):

```bash
# SMS — start with the mock provider (logs instead of sending, no cost)
supabase secrets set SMS_PROVIDER=mock
# ...or go live:
# supabase secrets set SMS_PROVIDER=semaphore SEMAPHORE_API_KEY=... SEMAPHORE_SENDER_NAME=DocuassistPH
# supabase secrets set SMS_PROVIDER=twilio TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM=+1...

# Anthropic key for Smart Paste
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optional model override (defaults to claude-opus-4-8)
# supabase secrets set ANTHROPIC_MODEL=claude-opus-4-8

# Shared secret used by the pg_cron dispatcher (step 6)
supabase secrets set CRON_SECRET=$(openssl rand -hex 24)
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into Edge Functions
automatically — you don't set those.

### 6. Wire up pg_cron (SMS queue dispatcher)

The `scheduled_messages` table is filled by the app; a cron job drains it every 2
minutes by POSTing to `send-sms` in dispatch mode.

1. In **Database → Extensions**, enable `pg_cron` and `pg_net`.
2. Store the same `CRON_SECRET` in Vault and point the job at your project:

```sql
-- run once in the SQL editor
select vault.create_secret('YOUR_CRON_SECRET', 'cron_secret');

update settings
  set value = to_jsonb('https://YOUR_PROJECT_REF.supabase.co/functions/v1'::text)
  where key = 'edge_base_url';
```

3. `0006_cron.sql` schedules the `dispatch-scheduled-sms` job. Re-run that file if you
   change the URL or secret (it unschedules and reschedules idempotently).

Also set the public base URL so SMS tracking links resolve:

```sql
update settings set value = to_jsonb('https://your-deployed-site.com'::text)
  where key = 'public_base_url';
```

### 7. Run locally

```bash
npm install
npm run dev
```

- Public landing: `http://localhost:5173/`
- Staff app: `http://localhost:5173/staff` (redirects to login)

### 8. Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # preview the build
```

Deploy `dist/` to any static host (Vercel/Netlify/Cloudflare Pages). This is an SPA —
configure the host to rewrite all routes to `index.html`.

---

## How the pieces fit

- **Public order** → `send-otp` / `verify-otp` verify the phone → `submit_public_order`
  RPC (requires the verify token) creates the customer + order and enqueues the
  confirmation SMS.
- **Staff advance a stage** → `advance_order_status` RPC writes `status_history`, sets
  the stage timestamp, and drives SMS: on **Submitted** it enqueues the immediate
  confirmation + every-2-day follow-ups; on **Released/Shipped/Delivered** it cancels
  pending follow-ups and enqueues that stage's SMS.
- **pg_cron** drains `scheduled_messages` via `send-sms`. Every send/fail/cancel is
  visible on the order's activity timeline.
- **Public tracking** → `track_order` RPC only returns safe fields, and only when
  `order_code` + phone match (order codes are guessable, so phone-matching is the gate).

## Security notes

- Service role / Anthropic / SMS / cron secrets live only in Edge Function secrets.
- RLS: staff (authenticated) read/write everything; anon can only read active
  `document_types` and call the two public RPCs (both `SECURITY DEFINER`, exposing only
  safe fields).
- OTP codes are hashed (never stored plaintext), expire in 5 min, cap attempts, and are
  rate-limited per phone and per IP. The order-submit RPC requires a valid verify token.
- Per-customer `sms_opt_out` flag is honored before any SMS is enqueued.

## Going live checklist

- [ ] Set a real `SMS_PROVIDER` + credentials (currently `mock`).
- [ ] Confirm sender name registration with your PH SMS gateway.
- [ ] Add bot protection (hCaptcha/Turnstile) to the order form — a honeypot is in place as a baseline.
- [ ] Set `public_base_url` and `edge_base_url` to production URLs.
- [ ] Review SLA thresholds, follow-up interval/cap, and SMS templates in **Settings**.
