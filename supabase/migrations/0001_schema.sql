-- =============================================================================
-- DocuassistPH — PSA Document Processing CRM
-- Migration 0001: Core schema, enums, tables
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type order_status as enum (
    'new_order',
    'submitted',
    'released',
    'shipped',
    'delivered',
    'paid'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('unpaid', 'partial', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cod', 'gcash', 'bank', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type scheduled_message_status as enum ('pending', 'sent', 'cancelled', 'failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- settings  (single-row key/value config, editable in the app)
-- ---------------------------------------------------------------------------
create table if not exists settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  messenger_name    text,
  phone             text not null,
  shipping_address  text,
  city              text,
  province          text,
  postal_code       text,
  sms_opt_out       boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists customers_phone_idx on customers (phone);

-- ---------------------------------------------------------------------------
-- document_types  (seed data, editable)
-- ---------------------------------------------------------------------------
create table if not exists document_types (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  base_fee    numeric(10,2) not null,   -- what the customer pays (all-in)
  psa_cost    numeric(10,2) not null,   -- your cost, for margin tracking
  active      boolean not null default true,
  sort_order  int not null default 0
);

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------
create table if not exists orders (
  id                uuid primary key default gen_random_uuid(),
  order_code        text unique not null,
  customer_id       uuid not null references customers(id) on delete restrict,
  document_type_id  uuid not null references document_types(id) on delete restrict,
  status            order_status not null default 'new_order',
  copies            int not null default 1,
  total_amount      numeric(10,2) not null default 0,
  downpayment       numeric(10,2) not null default 0,
  balance_due       numeric(10,2) not null default 0,
  payment_status    payment_status not null default 'unpaid',
  payment_method    payment_method not null default 'cod',
  psa_reference_no  text,
  jnt_tracking_no   text,
  notes             text,
  raw_intake_text   text,
  -- per-stage timestamps for SLA tracking
  submitted_at      timestamptz,
  released_at       timestamptz,
  shipped_at        timestamptz,
  delivered_at      timestamptz,
  paid_at           timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists orders_status_idx on orders (status);
create index if not exists orders_customer_idx on orders (customer_id);
create index if not exists orders_created_idx on orders (created_at);

-- ---------------------------------------------------------------------------
-- order_details  (PSA request specifics — explicit columns + generic extra)
-- ---------------------------------------------------------------------------
create table if not exists order_details (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references orders(id) on delete cascade,
  -- explicit name parts (used by Smart Paste / print form)
  first_name           text,
  middle_name          text,
  last_name            text,
  sex                  text,           -- 'Male' | 'Female'
  date_of_birth        date,
  place_of_birth       text,
  fathers_full_name    text,
  mothers_full_name    text,           -- maiden name
  -- generic event fields (marriage/death etc.)
  subject_full_name    text,
  date_of_event        date,
  place_of_event       text,
  spouse_name          text,
  purpose              text,
  extra                jsonb not null default '{}'::jsonb,
  created_at           timestamptz not null default now()
);
create index if not exists order_details_order_idx on order_details (order_id);

-- ---------------------------------------------------------------------------
-- status_history
-- ---------------------------------------------------------------------------
create table if not exists status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  from_status  order_status,
  to_status    order_status not null,
  changed_by   uuid references auth.users(id),
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists status_history_order_idx on status_history (order_id);

-- ---------------------------------------------------------------------------
-- payments
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  amount       numeric(10,2) not null,
  method       payment_method not null default 'cod',
  reference_no text,
  received_at  timestamptz not null default now(),
  recorded_by  uuid references auth.users(id)
);
create index if not exists payments_order_idx on payments (order_id);

-- ---------------------------------------------------------------------------
-- scheduled_messages  (SMS queue driven by pg_cron)
-- ---------------------------------------------------------------------------
create table if not exists scheduled_messages (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid references orders(id) on delete cascade,
  phone               text not null,
  body                text not null,
  kind                text not null default 'followup', -- 'confirmation'|'submitted'|'followup'|'released'|'shipped'|'delivered'|'otp'
  send_at             timestamptz not null,
  status              scheduled_message_status not null default 'pending',
  provider_message_id text,
  error               text,
  dedupe_key          text,   -- guards against enqueuing the same message twice
  created_at          timestamptz not null default now(),
  sent_at             timestamptz
);
create index if not exists scheduled_messages_due_idx
  on scheduled_messages (status, send_at);
create unique index if not exists scheduled_messages_dedupe_idx
  on scheduled_messages (dedupe_key) where dedupe_key is not null;

-- ---------------------------------------------------------------------------
-- otp_codes  (phone verification for public order flow)
-- ---------------------------------------------------------------------------
create table if not exists otp_codes (
  id           uuid primary key default gen_random_uuid(),
  phone        text not null,
  code_hash    text not null,
  expires_at   timestamptz not null,
  attempts     int not null default 0,
  verified     boolean not null default false,
  -- verification token issued on success; the submit step must present it
  verify_token text,
  token_expires_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists otp_codes_phone_idx on otp_codes (phone, created_at desc);
create index if not exists otp_codes_token_idx on otp_codes (verify_token);

-- ---------------------------------------------------------------------------
-- rate_limit_events  (per-IP / per-phone throttling for public endpoints)
-- ---------------------------------------------------------------------------
create table if not exists rate_limit_events (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null,   -- e.g. 'send_otp:ip:1.2.3.4' or 'track:ip:...'
  created_at  timestamptz not null default now()
);
create index if not exists rate_limit_events_bucket_idx
  on rate_limit_events (bucket, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger for orders
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists orders_set_updated_at on orders;
create trigger orders_set_updated_at
  before update on orders
  for each row execute function set_updated_at();
