-- =============================================================================
-- Migration 0003: SMS template rendering, status advancement, scheduling
-- =============================================================================

-- public_base_url used to build tracking links inside SMS
insert into settings (key, value) values
  ('public_base_url', '"https://example.com"'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- setting_text / setting_num helpers
-- ---------------------------------------------------------------------------
create or replace function setting_text(p_key text, p_default text default '')
returns text language sql stable as $$
  select coalesce((select value #>> '{}' from settings where key = p_key), p_default);
$$;

create or replace function setting_num(p_key text, p_default numeric default 0)
returns numeric language sql stable as $$
  select coalesce((select (value #>> '{}')::numeric from settings where key = p_key), p_default);
$$;

-- ---------------------------------------------------------------------------
-- render_sms_template(kind, order_id) -> fully-substituted SMS body
-- ---------------------------------------------------------------------------
create or replace function render_sms_template(p_kind text, p_order_id uuid)
returns text language plpgsql stable as $$
declare
  v_tpl        text;
  v_body       text;
  v_first      text;
  v_doc        text;
  v_business   text;
  v_base_url   text;
  o            orders%rowtype;
  d            order_details%rowtype;
begin
  select (value -> p_kind) #>> '{}' into v_tpl from settings where key = 'sms_templates';
  if v_tpl is null then
    return null;
  end if;

  select * into o from orders where id = p_order_id;
  select * into d from order_details where order_id = p_order_id limit 1;

  select name into v_doc from document_types where id = o.document_type_id;
  v_business := setting_text('business_name', 'DocuassistPH');
  v_base_url := setting_text('public_base_url', '');
  v_first := coalesce(nullif(d.first_name, ''), split_part(
               (select full_name from customers where id = o.customer_id), ' ', 1), 'po');

  v_body := v_tpl;
  v_body := replace(v_body, '{first_name}',       coalesce(v_first, ''));
  v_body := replace(v_body, '{document_type}',    coalesce(v_doc, 'document'));
  v_body := replace(v_body, '{psa_reference_no}', coalesce(o.psa_reference_no, 'pending'));
  v_body := replace(v_body, '{jnt_tracking_no}',  coalesce(o.jnt_tracking_no, ''));
  v_body := replace(v_body, '{order_code}',       coalesce(o.order_code, ''));
  v_body := replace(v_body, '{balance_due}',      coalesce(o.balance_due::text, '0'));
  v_body := replace(v_body, '{business_name}',    v_business);
  v_body := replace(v_body, '{track_url}',        v_base_url || '/track/' || coalesce(o.order_code, ''));
  return v_body;
end $$;

-- ---------------------------------------------------------------------------
-- enqueue_sms: insert a scheduled message with dedupe protection
-- ---------------------------------------------------------------------------
create or replace function enqueue_sms(
  p_order_id uuid,
  p_kind     text,
  p_send_at  timestamptz,
  p_dedupe   text
) returns void language plpgsql as $$
declare
  v_phone     text;
  v_optout    boolean;
  v_enabled   boolean;
  v_body      text;
begin
  v_enabled := setting_text('sms_enabled', 'true') = 'true';
  if not v_enabled then
    return;
  end if;

  select c.phone, c.sms_opt_out into v_phone, v_optout
    from orders o join customers c on c.id = o.customer_id
    where o.id = p_order_id;

  if v_optout then
    return;
  end if;

  v_body := render_sms_template(p_kind, p_order_id);
  if v_body is null then
    return;
  end if;

  insert into scheduled_messages (order_id, phone, body, kind, send_at, dedupe_key)
  values (p_order_id, v_phone, v_body, p_kind, p_send_at, p_dedupe)
  on conflict (dedupe_key) do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- schedule_processing_followups: immediate submitted SMS + every-N-day followups
-- ---------------------------------------------------------------------------
create or replace function schedule_processing_followups(p_order_id uuid)
returns void language plpgsql as $$
declare
  v_interval int;
  v_max      int;
  v_base     timestamptz;
  i          int;
begin
  v_interval := setting_num('followup_interval_days', 2)::int;
  v_max      := setting_num('followup_max_count', 7)::int;
  v_base     := coalesce((select submitted_at from orders where id = p_order_id), now());

  -- immediate "submitted" confirmation
  perform enqueue_sms(p_order_id, 'submitted', now(),
                      'submitted:' || p_order_id::text);

  -- recurring processing updates: base + interval, +2*interval, ...
  for i in 1..v_max loop
    perform enqueue_sms(
      p_order_id, 'followup',
      v_base + (i * v_interval) * interval '1 day',
      'followup:' || p_order_id::text || ':' || i::text
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- cancel_pending_followups: called when order advances past processing
-- ---------------------------------------------------------------------------
create or replace function cancel_pending_followups(p_order_id uuid)
returns void language plpgsql as $$
begin
  update scheduled_messages
    set status = 'cancelled'
    where order_id = p_order_id
      and status = 'pending'
      and kind = 'followup';
end $$;

-- ---------------------------------------------------------------------------
-- advance_order_status: the one-click stage advance (staff, SECURITY DEFINER
-- so it can write history/schedule regardless of granular table policies).
-- Validates required fields, sets stage timestamp, logs history, drives SMS.
-- ---------------------------------------------------------------------------
create or replace function advance_order_status(
  p_order_id          uuid,
  p_to_status         order_status,
  p_note              text default null,
  p_psa_reference_no  text default null,
  p_jnt_tracking_no   text default null
) returns orders language plpgsql security definer set search_path = public as $$
declare
  o          orders%rowtype;
  v_from     order_status;
  v_result   orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into o from orders where id = p_order_id for update;
  if not found then
    raise exception 'order not found';
  end if;
  v_from := o.status;

  -- required-field guards
  if p_to_status = 'shipped'
     and coalesce(nullif(p_jnt_tracking_no, ''), o.jnt_tracking_no) is null then
    raise exception 'J&T tracking number is required to mark as shipped';
  end if;

  -- apply optional field updates
  if p_psa_reference_no is not null and p_psa_reference_no <> '' then
    o.psa_reference_no := p_psa_reference_no;
  end if;
  if p_jnt_tracking_no is not null and p_jnt_tracking_no <> '' then
    o.jnt_tracking_no := p_jnt_tracking_no;
  end if;

  -- set the stage timestamp (only if not already set)
  update orders set
    status           = p_to_status,
    psa_reference_no = o.psa_reference_no,
    jnt_tracking_no  = o.jnt_tracking_no,
    submitted_at = case when p_to_status = 'submitted' and submitted_at is null then now() else submitted_at end,
    released_at  = case when p_to_status = 'released'  and released_at  is null then now() else released_at  end,
    shipped_at   = case when p_to_status = 'shipped'   and shipped_at   is null then now() else shipped_at   end,
    delivered_at = case when p_to_status = 'delivered' and delivered_at is null then now() else delivered_at end,
    paid_at      = case when p_to_status = 'paid'      and paid_at      is null then now() else paid_at      end
  where id = p_order_id
  returning * into v_result;

  -- history
  insert into status_history (order_id, from_status, to_status, changed_by, note)
  values (p_order_id, v_from, p_to_status, auth.uid(), p_note);

  -- SMS side effects
  if p_to_status = 'submitted' then
    perform schedule_processing_followups(p_order_id);
  elsif p_to_status in ('released', 'shipped', 'delivered') then
    perform cancel_pending_followups(p_order_id);
    perform enqueue_sms(p_order_id, p_to_status::text, now(),
                        p_to_status::text || ':' || p_order_id::text);
  end if;

  return v_result;
end $$;
