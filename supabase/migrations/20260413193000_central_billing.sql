create extension if not exists pgcrypto;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'financeiro'));

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and is_active = true
  );
$$;

create table if not exists public.integration_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  omie_customer_id text not null unique,
  customer_name text not null,
  customer_document text,
  whatsapp_phone text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.charges (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_document text,
  whatsapp_phone text,
  amount_cents bigint not null default 0,
  due_date date not null,
  status text not null default 'pendente' check (status in ('pendente', 'revisao', 'agendada', 'enviada', 'falha_envio', 'paga', 'cancelada')),
  omie_customer_id text not null,
  omie_receivable_id text not null unique,
  boleto_pdf_url text,
  boleto_number text,
  message_preview text not null,
  risk_level text not null default 'medio' check (risk_level in ('baixo', 'medio', 'alto')),
  suggested_send_time timestamptz,
  last_sync_at timestamptz not null default now(),
  payment_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.charge_schedules (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.charges(id) on delete cascade,
  customer_name text not null,
  scheduled_for timestamptz not null,
  approved_by uuid references public.profiles(id) on delete set null,
  approval_note text not null,
  snapshot_message text not null,
  status text not null default 'pendente_execucao' check (status in ('pendente_execucao', 'executado', 'cancelado', 'falha')),
  created_at timestamptz not null default now()
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'utilitario',
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.message_dispatches (
  id uuid primary key default gen_random_uuid(),
  charge_id uuid not null references public.charges(id) on delete cascade,
  customer_name text not null,
  message_sent text not null,
  status text not null check (status in ('enviado', 'falha', 'agendado')),
  channel text not null default 'whatsapp',
  error_message text,
  provider_message_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  type text not null check (type in ('novo_inadimplente', 'boleto_vencido', 'falha_envio', 'agendamento_proximo')),
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists trg_integration_settings_updated_at on public.integration_settings;
create trigger trg_integration_settings_updated_at
before update on public.integration_settings
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_customers_updated_at on public.customers;
create trigger trg_customers_updated_at
before update on public.customers
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_charges_updated_at on public.charges;
create trigger trg_charges_updated_at
before update on public.charges
for each row execute function public.set_current_timestamp_updated_at();

drop trigger if exists trg_message_templates_updated_at on public.message_templates;
create trigger trg_message_templates_updated_at
before update on public.message_templates
for each row execute function public.set_current_timestamp_updated_at();

alter table public.integration_settings enable row level security;
alter table public.customers enable row level security;
alter table public.charges enable row level security;
alter table public.charge_schedules enable row level security;
alter table public.message_templates enable row level security;
alter table public.message_dispatches enable row level security;
alter table public.notifications enable row level security;
alter table public.sync_runs enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "billing_read_authenticated" on public.integration_settings;
create policy "billing_read_authenticated" on public.integration_settings
for select to authenticated using (true);

drop policy if exists "billing_admin_manage_integration_settings" on public.integration_settings;
create policy "billing_admin_manage_integration_settings" on public.integration_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "billing_read_customers" on public.customers;
create policy "billing_read_customers" on public.customers
for select to authenticated using (true);

drop policy if exists "billing_admin_manage_customers" on public.customers;
create policy "billing_admin_manage_customers" on public.customers
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "billing_read_charges" on public.charges;
create policy "billing_read_charges" on public.charges
for select to authenticated using (true);

drop policy if exists "billing_manage_charges" on public.charges;
create policy "billing_manage_charges" on public.charges
for all to authenticated using (true) with check (true);

drop policy if exists "billing_read_schedules" on public.charge_schedules;
create policy "billing_read_schedules" on public.charge_schedules
for select to authenticated using (true);

drop policy if exists "billing_manage_schedules" on public.charge_schedules;
create policy "billing_manage_schedules" on public.charge_schedules
for all to authenticated using (true) with check (true);

drop policy if exists "billing_read_templates" on public.message_templates;
create policy "billing_read_templates" on public.message_templates
for select to authenticated using (true);

drop policy if exists "billing_admin_manage_templates" on public.message_templates;
create policy "billing_admin_manage_templates" on public.message_templates
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "billing_read_dispatches" on public.message_dispatches;
create policy "billing_read_dispatches" on public.message_dispatches
for select to authenticated using (true);

drop policy if exists "billing_manage_dispatches" on public.message_dispatches;
create policy "billing_manage_dispatches" on public.message_dispatches
for all to authenticated using (true) with check (true);

drop policy if exists "billing_read_notifications" on public.notifications;
create policy "billing_read_notifications" on public.notifications
for select to authenticated using (true);

drop policy if exists "billing_manage_notifications" on public.notifications;
create policy "billing_manage_notifications" on public.notifications
for all to authenticated using (true) with check (true);

drop policy if exists "billing_read_sync_runs" on public.sync_runs;
create policy "billing_read_sync_runs" on public.sync_runs
for select to authenticated using (true);

drop policy if exists "billing_admin_manage_sync_runs" on public.sync_runs;
create policy "billing_admin_manage_sync_runs" on public.sync_runs
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "billing_read_audit_logs" on public.audit_logs;
create policy "billing_read_audit_logs" on public.audit_logs
for select to authenticated using (true);

drop policy if exists "billing_manage_audit_logs" on public.audit_logs;
create policy "billing_manage_audit_logs" on public.audit_logs
for insert to authenticated with check (true);

insert into public.message_templates (name, category, content, active)
select
  'Cobrança utilitária padrão',
  'utilitario',
  'Olá, {{nome}}, tudo bem? Identificamos um boleto em aberto no valor de {{valor}} com vencimento em {{data}}. Segue o boleto para pagamento.',
  true
where not exists (
  select 1 from public.message_templates where name = 'Cobrança utilitária padrão'
);
