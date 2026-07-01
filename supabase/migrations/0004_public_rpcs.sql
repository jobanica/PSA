-- =============================================================================
-- Migration 0004: Public-facing RPCs (tracking, order submission) + insert trigger
-- =============================================================================

-- ---------------------------------------------------------------------------
-- orders BEFORE INSERT: auto order_code, balance, payment_status defaults
-- ---------------------------------------------------------------------------
create or replace function orders_before_insert()
returns trigger language plpgsql as $$
begin
  if new.order_code is null or new.order_code = '' then
    new.order_code := next_order_code();
  end if;
  new.balance_due := greatest(coalesce(new.total_amount,0) - coalesce(new.downpayment,0), 0);
  if coalesce(new.downpayment,0) <= 0 then
    new.payment_status := 'unpaid';
  elsif new.downpayment >= new.total_amount then
    new.payment_status := 'paid';
  else
    new.payment_status := 'partial';
  end if;
  return new;
end $$;

drop trigger if exists orders_set_defaults on orders;
create trigger orders_set_defaults
  before insert on orders
  for each row execute function orders_before_insert();

-- ---------------------------------------------------------------------------
-- Rate limiting helper: returns true if under the limit (and records the hit)
-- ---------------------------------------------------------------------------
create or replace function rate_limit_check(
  p_bucket   text,
  p_max      int,
  p_window   interval
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  delete from rate_limit_events where created_at < now() - interval '1 day';
  select count(*) into v_count
    from rate_limit_events
    where bucket = p_bucket and created_at > now() - p_window;
  if v_count >= p_max then
    return false;
  end if;
  insert into rate_limit_events (bucket) values (p_bucket);
  return true;
end $$;

-- ---------------------------------------------------------------------------
-- track_order(order_code, phone) -> safe public view of an order.
-- Only returns a row when order_code + phone match. No financial/PII fields.
-- Rate limited per IP by the caller (Edge Function or via rate_limit_check).
-- ---------------------------------------------------------------------------
create or replace function track_order(
  p_order_code text,
  p_phone      text
) returns table (
  order_code      text,
  document_type   text,
  status          order_status,
  submitted_at    timestamptz,
  released_at     timestamptz,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  jnt_tracking_no text,
  created_at      timestamptz
) language plpgsql security definer set search_path = public as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone,''), '\D', '', 'g');
begin
  if length(v_digits) < 4 then
    return; -- require at least last 4 digits
  end if;

  return query
  select o.order_code,
         dt.name,
         o.status,
         o.submitted_at, o.released_at, o.shipped_at, o.delivered_at,
         case when o.status in ('shipped','delivered','paid') then o.jnt_tracking_no else null end,
         o.created_at
  from orders o
  join customers c on c.id = o.customer_id
  join document_types dt on dt.id = o.document_type_id
  where lower(o.order_code) = lower(trim(p_order_code))
    -- match full phone OR last 4 digits
    and (
      regexp_replace(c.phone, '\D', '', 'g') = v_digits
      or right(regexp_replace(c.phone, '\D', '', 'g'), 4) = right(v_digits, 4)
    );
end $$;

-- ---------------------------------------------------------------------------
-- submit_public_order: creates a customer+order from the public /order flow.
-- Requires a valid, unexpired verification token matching the phone.
-- SECURITY DEFINER; callable by anon. Never trusts client-side "verified".
-- ---------------------------------------------------------------------------
create or replace function submit_public_order(
  p_verify_token     text,
  p_phone            text,
  p_document_type_id uuid,
  p_copies           int,
  p_details          jsonb,
  p_delivery         jsonb
) returns table (order_code text, order_id uuid)
language plpgsql security definer set search_path = public as $$
declare
  v_otp        otp_codes%rowtype;
  v_customer   uuid;
  v_doc        document_types%rowtype;
  v_order      orders%rowtype;
  v_copies     int := greatest(coalesce(p_copies,1), 1);
  v_recipient  text;
begin
  -- 1. validate verification token
  select * into v_otp
    from otp_codes
    where verify_token = p_verify_token
      and verified = true
      and token_expires_at > now()
      and phone = p_phone
    order by created_at desc
    limit 1;
  if not found then
    raise exception 'phone not verified or verification expired';
  end if;

  -- 2. validate document type
  select * into v_doc from document_types where id = p_document_type_id and active;
  if not found then
    raise exception 'invalid document type';
  end if;

  -- 3. find or create customer by phone
  select id into v_customer from customers where phone = p_phone order by created_at limit 1;
  v_recipient := coalesce(p_delivery->>'recipient_name', p_details->>'first_name');
  if v_customer is null then
    insert into customers (full_name, phone, shipping_address, city, province, postal_code)
    values (
      v_recipient,
      p_phone,
      trim(concat_ws(', ', p_delivery->>'address_line', p_delivery->>'barangay')),
      p_delivery->>'city',
      p_delivery->>'province',
      p_delivery->>'postal_code'
    )
    returning id into v_customer;
  else
    update customers set
      shipping_address = trim(concat_ws(', ', p_delivery->>'address_line', p_delivery->>'barangay')),
      city = p_delivery->>'city',
      province = p_delivery->>'province',
      postal_code = p_delivery->>'postal_code'
    where id = v_customer;
  end if;

  -- 4. create order
  insert into orders (customer_id, document_type_id, status, copies,
                      total_amount, downpayment, payment_method)
  values (v_customer, p_document_type_id, 'new_order', v_copies,
          v_doc.base_fee * v_copies, 0, 'cod')
  returning * into v_order;

  -- 5. order_details
  insert into order_details (
    order_id, first_name, middle_name, last_name, sex, date_of_birth,
    place_of_birth, fathers_full_name, mothers_full_name,
    subject_full_name, spouse_name, purpose, extra
  ) values (
    v_order.id,
    p_details->>'first_name',
    p_details->>'middle_name',
    p_details->>'last_name',
    p_details->>'sex',
    nullif(p_details->>'date_of_birth','')::date,
    p_details->>'place_of_birth',
    p_details->>'fathers_full_name',
    p_details->>'mothers_full_name',
    trim(concat_ws(' ', p_details->>'first_name', p_details->>'middle_name', p_details->>'last_name')),
    p_details->>'spouse_name',
    p_details->>'purpose',
    coalesce(p_details->'extra', '{}'::jsonb)
  );

  -- 6. history + immediate confirmation SMS
  insert into status_history (order_id, from_status, to_status, note)
  values (v_order.id, null, 'new_order', 'Placed via public order flow');

  perform enqueue_sms(v_order.id, 'confirmation', now(),
                      'confirmation:' || v_order.id::text);

  -- 7. burn the token so it can't be reused
  update otp_codes set verify_token = null, verified = false
    where id = v_otp.id;

  return query select v_order.order_code, v_order.id;
end $$;
