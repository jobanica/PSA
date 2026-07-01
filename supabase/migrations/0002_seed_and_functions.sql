-- =============================================================================
-- Migration 0002: Seed data + helper functions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Seed document_types (idempotent by name)
-- ---------------------------------------------------------------------------
create unique index if not exists document_types_name_key on document_types (name);

insert into document_types (name, base_fee, psa_cost, active, sort_order) values
  ('PSA Birth Certificate',    685, 205, true, 1),
  ('PSA Marriage Certificate', 685, 205, true, 2),
  ('PSA Death Certificate',    685, 205, true, 3),
  ('CENOMAR / NOR',            750, 255, true, 4)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Seed settings (idempotent)
-- ---------------------------------------------------------------------------
insert into settings (key, value) values
  ('business_name',        '"DocuassistPH"'::jsonb),
  ('shipping_cost',        '105'::jsonb),
  ('sla_submitted_days',   '9'::jsonb),
  ('sla_shipped_days',     '8'::jsonb),
  ('sms_enabled',          'true'::jsonb),
  ('sms_sender_name',      '"DocuassistPH"'::jsonb),
  ('followup_interval_days','2'::jsonb),
  ('followup_max_count',   '7'::jsonb),
  ('sms_templates', jsonb_build_object(
      'submitted',  'Hi {first_name}! Your PSA {document_type} request is now being processed. Ref no: {psa_reference_no}. We''ll update you once it''s ready. — {business_name}',
      'followup',   'Hi {first_name}, update on your PSA {document_type} (Ref {psa_reference_no}): still being processed with PSA. We''ll text you the moment it''s released and ready to ship. Salamat sa pasensya! — {business_name}',
      'released',   'Good news {first_name}! Your PSA {document_type} has been released and is being prepared for shipment via J&T. You''ll get the tracking number shortly.',
      'shipped',    'Hi {first_name}, your PSA {document_type} has shipped via J&T! Tracking: {jnt_tracking_no}. Track it here: {track_url}. Please prepare ₱{balance_due} for COD. Salamat!',
      'delivered',  'Hi {first_name}, your PSA {document_type} has been delivered. Thank you for ordering with {business_name}!',
      'confirmation','Hi {first_name}! We received your PSA {document_type} order {order_code}. Track it anytime here: {track_url}. — {business_name}',
      'otp',        'Your {business_name} verification code is {code}. It expires in 5 minutes. Do not share this code.'
  ))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Order code generator: ORD-YYYY-NNNN  (sequential per year)
-- ---------------------------------------------------------------------------
create sequence if not exists order_code_seq;

create or replace function next_order_code()
returns text language plpgsql as $$
declare
  n bigint;
begin
  n := nextval('order_code_seq');
  return 'ORD-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 4, '0');
end $$;

-- ---------------------------------------------------------------------------
-- Maintain balance_due + payment_status from payments
-- ---------------------------------------------------------------------------
create or replace function recompute_order_payment(p_order_id uuid)
returns void language plpgsql as $$
declare
  v_total    numeric(10,2);
  v_paid     numeric(10,2);
  v_balance  numeric(10,2);
  v_status   payment_status;
begin
  select total_amount into v_total from orders where id = p_order_id;
  select coalesce(sum(amount), 0) into v_paid
    from payments where order_id = p_order_id;

  v_balance := greatest(v_total - v_paid, 0);

  if v_paid <= 0 then
    v_status := 'unpaid';
  elsif v_paid >= v_total then
    v_status := 'paid';
  else
    v_status := 'partial';
  end if;

  update orders
    set balance_due = v_balance,
        payment_status = v_status
    where id = p_order_id;
end $$;

create or replace function payments_after_change()
returns trigger language plpgsql as $$
begin
  perform recompute_order_payment(coalesce(new.order_id, old.order_id));
  return null;
end $$;

drop trigger if exists payments_recompute on payments;
create trigger payments_recompute
  after insert or update or delete on payments
  for each row execute function payments_after_change();
