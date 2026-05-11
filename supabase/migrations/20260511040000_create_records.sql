-- Records: one row per purchase / service entry, always tied to a customer.
-- Run in Supabase SQL Editor or via CLI migrations.

create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  customer_name text,
  note text not null default '',
  amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists records_customer_id_idx on public.records (customer_id);
create index if not exists records_created_at_idx on public.records (created_at desc);

alter table public.records enable row level security;

-- Adjust policies to match your auth model. These allow the anon key (typical for internal tools using publishable key).
create policy "records_select_anon"
  on public.records for select
  to anon
  using (true);

create policy "records_insert_anon"
  on public.records for insert
  to anon
  with check (true);

create policy "records_update_anon"
  on public.records for update
  to anon
  using (true)
  with check (true);

create policy "records_delete_anon"
  on public.records for delete
  to anon
  using (true);

create policy "records_select_authenticated"
  on public.records for select
  to authenticated
  using (true);

create policy "records_insert_authenticated"
  on public.records for insert
  to authenticated
  with check (true);

create policy "records_update_authenticated"
  on public.records for update
  to authenticated
  using (true)
  with check (true);

create policy "records_delete_authenticated"
  on public.records for delete
  to authenticated
  using (true);
