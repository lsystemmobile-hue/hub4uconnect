-- Habilita pg_cron (já ativo no Supabase por padrão, idempotente)
create extension if not exists pg_cron;

-- Habilita pg_net para chamadas HTTP dentro do cron (já ativo no Supabase)
create extension if not exists pg_net;

-- Remove job anterior se existir (idempotente)
select cron.unschedule('sync-omie-charges-hourly')
where exists (select 1 from cron.job where jobname = 'sync-omie-charges-hourly');

-- Cron job: sync-omie-charges a cada 1 hora
-- Rate limit: ~5 chamadas à API Omie por execução (50 registros/página) → seguro
select cron.schedule(
  'sync-omie-charges-hourly',
  '0 * * * *',
  $$
  select
    net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/sync-omie-charges',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', current_setting('app.supabase_anon_key')
      ),
      body    := '{}'::jsonb
    )
  $$
);
