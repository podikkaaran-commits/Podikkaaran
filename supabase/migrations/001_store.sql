begin;

create table if not exists public.store_products (
  slug text primary key,
  product jsonb not null check (product ->> 'slug' = slug)
);

create table if not exists public.store_orders (
  id text primary key,
  created_at timestamptz not null default now(),
  details jsonb not null check (details ->> 'id' = id)
);

create table if not exists public.store_settings (
  id boolean primary key default true check (id),
  settings jsonb not null
);

alter table public.store_products enable row level security;
alter table public.store_orders enable row level security;
alter table public.store_settings enable row level security;

revoke all on public.store_products, public.store_orders, public.store_settings from public, anon, authenticated;
grant select, insert, update, delete on public.store_products, public.store_orders, public.store_settings to service_role;

commit;
