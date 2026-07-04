create table if not exists public.admin_provider_maintenance_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null,
  provider_id uuid not null,
  maintenance_code_id uuid null,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz null
);

alter table public.admin_provider_maintenance_sessions enable row level security;

create index if not exists admin_provider_maintenance_sessions_admin_id_idx
on public.admin_provider_maintenance_sessions (admin_id);

create index if not exists admin_provider_maintenance_sessions_provider_id_idx
on public.admin_provider_maintenance_sessions (provider_id);

create index if not exists admin_provider_maintenance_sessions_active_idx
on public.admin_provider_maintenance_sessions (id, expires_at)
where revoked_at is null;
