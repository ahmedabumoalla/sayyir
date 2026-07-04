create table if not exists public.provider_maintenance_codes (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null,
  maintenance_code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provider_maintenance_codes_provider_id_unique unique (provider_id),
  constraint provider_maintenance_codes_code_digits check (maintenance_code ~ '^[0-9]{6}([0-9]{2})?$')
);

alter table public.provider_maintenance_codes enable row level security;

create unique index if not exists provider_maintenance_codes_provider_id_idx
on public.provider_maintenance_codes (provider_id);

create unique index if not exists provider_maintenance_codes_code_idx
on public.provider_maintenance_codes (maintenance_code);

drop policy if exists "provider_maintenance_codes_service_role_all"
on public.provider_maintenance_codes;

create policy "provider_maintenance_codes_service_role_all"
on public.provider_maintenance_codes
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

create or replace function public.set_provider_maintenance_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_provider_maintenance_codes_updated_at
on public.provider_maintenance_codes;

create trigger set_provider_maintenance_codes_updated_at
before update on public.provider_maintenance_codes
for each row
execute function public.set_provider_maintenance_codes_updated_at();
