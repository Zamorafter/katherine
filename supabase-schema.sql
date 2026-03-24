create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  accent_color text not null default '#f28cb4',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  appointment_date date not null,
  time_slot text not null check (time_slot in ('09:00', '11:00', '13:00', '15:00')),
  status text not null default 'booked' check (status in ('booked', 'cancelled')),
  week_start date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_services (
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (appointment_id, service_id)
);

create unique index if not exists appointments_unique_booked_slot
  on public.appointments (appointment_date, time_slot)
  where status = 'booked';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists appointments_set_updated_at on public.appointments;
create trigger appointments_set_updated_at
before update on public.appointments
for each row
execute function public.set_updated_at();

alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;

drop policy if exists "public can read services" on public.services;
create policy "public can read services"
on public.services
for select
to anon, authenticated
using (true);

drop policy if exists "public can read appointments" on public.appointments;
create policy "public can read appointments"
on public.appointments
for select
to anon, authenticated
using (true);

drop policy if exists "public can read appointment_services" on public.appointment_services;
create policy "public can read appointment_services"
on public.appointment_services
for select
to anon, authenticated
using (true);

insert into public.services (slug, name, accent_color, sort_order)
values
  ('unas', 'Unas', '#f28cb4', 1),
  ('pestanas', 'Pestanas', '#f7b267', 2),
  ('cejas', 'Cejas', '#9ac7b8', 3)
on conflict (slug) do update
set
  name = excluded.name,
  accent_color = excluded.accent_color,
  sort_order = excluded.sort_order;
