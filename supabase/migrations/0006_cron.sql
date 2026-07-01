-- =============================================================================
-- Migration 0006: pg_cron dispatcher for the SMS queue
--
-- Runs every 2 minutes, POSTing to the `send-sms` Edge Function in "dispatch"
-- mode. That function pulls due `pending` rows (send_at <= now()), sends each
-- via the SMS provider, and marks them sent/failed.
--
-- PREREQUISITES (run once in the Supabase SQL editor / dashboard):
--   1. Enable the extensions:  pg_cron, pg_net
--   2. Set your Edge base URL in settings:
--        update settings set value = to_jsonb('https://<PROJECT_REF>.supabase.co/functions/v1'::text)
--          where key = 'edge_base_url';
--   3. Store the shared cron secret in Vault (same value as the CRON_SECRET
--      Edge Function secret):
--        select vault.create_secret('<YOUR_CRON_SECRET>', 'cron_secret');
-- =============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

insert into settings (key, value) values
  ('edge_base_url', '"https://YOUR_PROJECT_REF.supabase.co/functions/v1"'::jsonb)
on conflict (key) do nothing;

-- (Re)schedule the dispatcher. Unschedule first so re-running is idempotent.
do $$
begin
  perform cron.unschedule('dispatch-scheduled-sms');
exception when others then null;
end $$;

select cron.schedule(
  'dispatch-scheduled-sms',
  '*/2 * * * *',
  $cron$
  select net.http_post(
    url := (select value #>> '{}' from settings where key = 'edge_base_url') || '/send-sms',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := jsonb_build_object('mode', 'dispatch')
  );
  $cron$
);
