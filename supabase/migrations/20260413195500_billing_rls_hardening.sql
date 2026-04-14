create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.can_operate_billing()
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
      and role in ('admin', 'financeiro')
      and is_active = true
  );
$$;

create index if not exists idx_charges_customer_id on public.charges(customer_id);
create index if not exists idx_charge_schedules_charge_id on public.charge_schedules(charge_id);
create index if not exists idx_charge_schedules_approved_by on public.charge_schedules(approved_by);
create index if not exists idx_message_dispatches_charge_id on public.message_dispatches(charge_id);
create index if not exists idx_audit_logs_actor_id on public.audit_logs(actor_id);

drop policy if exists "billing_read_authenticated" on public.integration_settings;
drop policy if exists "billing_admin_manage_integration_settings" on public.integration_settings;
create policy "billing_read_integration_settings" on public.integration_settings
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_integration_settings" on public.integration_settings
for insert to authenticated with check (public.is_admin());
create policy "billing_update_integration_settings" on public.integration_settings
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "billing_delete_integration_settings" on public.integration_settings
for delete to authenticated using (public.is_admin());

drop policy if exists "billing_read_customers" on public.customers;
drop policy if exists "billing_admin_manage_customers" on public.customers;
create policy "billing_read_customers" on public.customers
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_customers" on public.customers
for insert to authenticated with check (public.is_admin());
create policy "billing_update_customers" on public.customers
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "billing_delete_customers" on public.customers
for delete to authenticated using (public.is_admin());

drop policy if exists "billing_read_charges" on public.charges;
drop policy if exists "billing_manage_charges" on public.charges;
create policy "billing_read_charges" on public.charges
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_charges" on public.charges
for insert to authenticated with check (public.can_operate_billing());
create policy "billing_update_charges" on public.charges
for update to authenticated using (public.can_operate_billing()) with check (public.can_operate_billing());
create policy "billing_delete_charges" on public.charges
for delete to authenticated using (public.is_admin());

drop policy if exists "billing_read_schedules" on public.charge_schedules;
drop policy if exists "billing_manage_schedules" on public.charge_schedules;
create policy "billing_read_schedules" on public.charge_schedules
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_schedules" on public.charge_schedules
for insert to authenticated with check (public.can_operate_billing());
create policy "billing_update_schedules" on public.charge_schedules
for update to authenticated using (public.can_operate_billing()) with check (public.can_operate_billing());
create policy "billing_delete_schedules" on public.charge_schedules
for delete to authenticated using (public.is_admin());

drop policy if exists "billing_read_templates" on public.message_templates;
drop policy if exists "billing_admin_manage_templates" on public.message_templates;
create policy "billing_read_templates" on public.message_templates
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_templates" on public.message_templates
for insert to authenticated with check (public.is_admin());
create policy "billing_update_templates" on public.message_templates
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "billing_delete_templates" on public.message_templates
for delete to authenticated using (public.is_admin());

drop policy if exists "billing_read_dispatches" on public.message_dispatches;
drop policy if exists "billing_manage_dispatches" on public.message_dispatches;
create policy "billing_read_dispatches" on public.message_dispatches
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_dispatches" on public.message_dispatches
for insert to authenticated with check (public.can_operate_billing());
create policy "billing_update_dispatches" on public.message_dispatches
for update to authenticated using (public.can_operate_billing()) with check (public.can_operate_billing());
create policy "billing_delete_dispatches" on public.message_dispatches
for delete to authenticated using (public.is_admin());

drop policy if exists "billing_read_notifications" on public.notifications;
drop policy if exists "billing_manage_notifications" on public.notifications;
create policy "billing_read_notifications" on public.notifications
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_notifications" on public.notifications
for insert to authenticated with check (public.can_operate_billing());
create policy "billing_update_notifications" on public.notifications
for update to authenticated using (public.can_operate_billing()) with check (public.can_operate_billing());
create policy "billing_delete_notifications" on public.notifications
for delete to authenticated using (public.is_admin());

drop policy if exists "billing_read_sync_runs" on public.sync_runs;
drop policy if exists "billing_admin_manage_sync_runs" on public.sync_runs;
create policy "billing_read_sync_runs" on public.sync_runs
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_sync_runs" on public.sync_runs
for insert to authenticated with check (public.is_admin());
create policy "billing_update_sync_runs" on public.sync_runs
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "billing_delete_sync_runs" on public.sync_runs
for delete to authenticated using (public.is_admin());

drop policy if exists "billing_read_audit_logs" on public.audit_logs;
drop policy if exists "billing_manage_audit_logs" on public.audit_logs;
create policy "billing_read_audit_logs" on public.audit_logs
for select to authenticated using (public.can_operate_billing());
create policy "billing_insert_audit_logs" on public.audit_logs
for insert to authenticated with check (actor_id = auth.uid() and public.can_operate_billing());
