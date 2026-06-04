create extension if not exists pgcrypto;

create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10, 2) not null check (price > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references services(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  appointment_date date not null,
  appointment_time time not null,
  notes text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_active_slot_lookup
on bookings (appointment_date, appointment_time)
where status in ('pending', 'confirmed', 'completed');

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists services_set_updated_at on services;
create trigger services_set_updated_at
before update on services
for each row
execute function set_updated_at();

drop trigger if exists bookings_set_updated_at on bookings;
create trigger bookings_set_updated_at
before update on bookings
for each row
execute function set_updated_at();
