-- supabase/migrations/20250225194500_create_inventory_tables.sql
-- Esquema inicial para el módulo de inventario

create type public.inventory_movement_type as enum ('adjustment', 'transfer');
create type public.inventory_movement_status as enum ('pending', 'in_transit', 'completed', 'cancelled');

create table if not exists public.inventory_products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  unit text default 'unidad',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_stock (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.inventory_products(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  quantity numeric(18,2) not null default 0,
  updated_at timestamptz not null default now(),
  constraint inventory_stock_quantity_non_negative check (quantity >= 0)
);

create unique index if not exists inventory_stock_product_site_idx
  on public.inventory_stock (product_id, site_id);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.inventory_products(id) on delete cascade,
  from_site_id uuid references public.sites(id) on delete set null,
  to_site_id uuid references public.sites(id) on delete set null,
  quantity numeric(18,2) not null check (quantity > 0),
  movement_type public.inventory_movement_type not null,
  status public.inventory_movement_status not null default 'pending',
  requested_by uuid references public.people(id) on delete set null,
  confirmed_by uuid references public.people(id) on delete set null,
  notes text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_idx
  on public.inventory_movements (product_id);

create index if not exists inventory_movements_status_idx
  on public.inventory_movements (status);

comment on table public.inventory_products is 'Catálogo de productos controlados en inventario';
comment on table public.inventory_stock is 'Stock actual por producto y sucursal';
comment on table public.inventory_movements is 'Historial de movimientos y ajustes de inventario';

