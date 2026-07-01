-- =============================================================================
-- Migration 0005: Row Level Security
--   - authenticated (staff): full read/write on all operational tables
--   - anon (public): read active document_types only; everything else goes
--     through SECURITY DEFINER RPCs (track_order, submit_public_order)
--   - otp_codes / rate_limit_events / scheduled_messages: no client access;
--     the Edge Functions use the service role key which bypasses RLS.
-- =============================================================================

-- Enable RLS everywhere
alter table customers          enable row level security;
alter table document_types     enable row level security;
alter table orders             enable row level security;
alter table order_details      enable row level security;
alter table status_history     enable row level security;
alter table payments           enable row level security;
alter table scheduled_messages enable row level security;
alter table otp_codes          enable row level security;
alter table rate_limit_events  enable row level security;
alter table settings           enable row level security;

-- ---- Staff (authenticated) full access -------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'customers','document_types','orders','order_details',
    'status_history','payments','scheduled_messages','settings'
  ] loop
    execute format('drop policy if exists staff_all on %I;', t);
    execute format($p$
      create policy staff_all on %I
        for all to authenticated
        using (true) with check (true);
    $p$, t);
  end loop;
end $$;

-- ---- Public: read active document types (landing page + order flow) ---------
drop policy if exists public_read_doctypes on document_types;
create policy public_read_doctypes on document_types
  for select to anon
  using (active = true);

-- ---- Grants for anon on the public RPCs ------------------------------------
grant execute on function track_order(text, text)            to anon, authenticated;
grant execute on function submit_public_order(text, text, uuid, int, jsonb, jsonb)
  to anon, authenticated;

-- staff RPCs
grant execute on function advance_order_status(uuid, order_status, text, text, text)
  to authenticated;
grant execute on function recompute_order_payment(uuid) to authenticated;

-- rate_limit_check is used by Edge Functions (service role) and can be exposed
grant execute on function rate_limit_check(text, int, interval) to anon, authenticated, service_role;

-- otp_codes & rate_limit_events: no policies => only service_role (bypasses RLS)
-- scheduled_messages: staff can read (via staff_all above); writes happen via
-- SECURITY DEFINER functions and the service-role cron job.
