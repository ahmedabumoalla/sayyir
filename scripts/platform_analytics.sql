-- Sayyir first-party platform analytics.
-- Run once in the Supabase SQL editor before deploying the analytics dashboard.

create extension if not exists pgcrypto;

create table if not exists public.analytics_sessions (
  session_id uuid primary key,
  visitor_id uuid not null,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  page_views integer not null default 0 check (page_views >= 0),
  map_views integer not null default 0 check (map_views >= 0),
  city text,
  region text,
  country text,
  device_type text check (device_type in ('mobile', 'tablet', 'desktop')),
  referrer_domain text,
  landing_page text,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.analytics_sessions(session_id) on delete cascade,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  page_path text,
  entity_type text check (entity_type in ('landmark', 'facility', 'experience', 'event')),
  entity_id text,
  entity_name text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.analytics_events
  drop constraint if exists analytics_events_event_type_check;
alter table public.analytics_events
  add constraint analytics_events_event_type_check
  check (event_type in ('page_view', 'entity_open', 'map_click', 'platform_click'));

create index if not exists analytics_sessions_started_at_idx
  on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_city_idx
  on public.analytics_sessions (city) where city is not null;
create index if not exists analytics_events_occurred_at_idx
  on public.analytics_events (occurred_at desc);
create index if not exists analytics_events_type_time_idx
  on public.analytics_events (event_type, occurred_at desc);
create index if not exists analytics_events_entity_idx
  on public.analytics_events (entity_type, entity_id, occurred_at desc)
  where entity_id is not null;

alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;

revoke all on public.analytics_sessions from anon, authenticated;
revoke all on public.analytics_events from anon, authenticated;

create or replace function public.record_platform_analytics_event(
  p_session_id uuid,
  p_visitor_id uuid,
  p_event_type text,
  p_page_path text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_entity_name text default null,
  p_duration_seconds integer default 0,
  p_city text default null,
  p_region text default null,
  p_country text default null,
  p_device_type text default null,
  p_referrer_domain text default null,
  p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_event_type not in ('session_start', 'page_view', 'heartbeat', 'entity_open', 'map_click', 'platform_click') then
    raise exception 'Unsupported analytics event';
  end if;

  insert into public.analytics_sessions (
    session_id, visitor_id, duration_seconds, city, region, country,
    device_type, referrer_domain, landing_page
  ) values (
    p_session_id, p_visitor_id, greatest(coalesce(p_duration_seconds, 0), 0),
    nullif(p_city, ''), nullif(p_region, ''), nullif(p_country, ''),
    nullif(p_device_type, ''), nullif(p_referrer_domain, ''),
    case when p_event_type = 'session_start' then p_page_path else null end
  )
  on conflict (session_id) do update set
    last_seen_at = now(),
    duration_seconds = greatest(
      public.analytics_sessions.duration_seconds,
      greatest(coalesce(excluded.duration_seconds, 0), 0)
    ),
    city = coalesce(public.analytics_sessions.city, excluded.city),
    region = coalesce(public.analytics_sessions.region, excluded.region),
    country = coalesce(public.analytics_sessions.country, excluded.country),
    device_type = coalesce(public.analytics_sessions.device_type, excluded.device_type),
    referrer_domain = coalesce(public.analytics_sessions.referrer_domain, excluded.referrer_domain),
    landing_page = coalesce(public.analytics_sessions.landing_page, excluded.landing_page);

  if p_event_type in ('page_view', 'entity_open', 'map_click', 'platform_click') then
    insert into public.analytics_events (
      session_id, event_type, page_path, entity_type, entity_id,
      entity_name, metadata
    ) values (
      p_session_id, p_event_type, p_page_path, p_entity_type, p_entity_id,
      p_entity_name, coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  if p_event_type = 'page_view' then
    update public.analytics_sessions
      set page_views = page_views + 1,
          map_views = map_views + case when p_page_path = '/map' then 1 else 0 end,
          last_seen_at = now()
      where session_id = p_session_id;
  end if;
end;
$$;

revoke all on function public.record_platform_analytics_event(
  uuid, uuid, text, text, text, text, text, integer,
  text, text, text, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.record_platform_analytics_event(
  uuid, uuid, text, text, text, text, text, integer,
  text, text, text, text, text, jsonb
) to service_role;

create or replace function public.get_platform_analytics(
  p_from timestamptz,
  p_to timestamptz
) returns jsonb
language sql
stable
security definer
set search_path = public
as $$
with
range_sessions as (
  select * from public.analytics_sessions
  where started_at >= p_from and started_at < p_to
),
range_events as (
  select e.* from public.analytics_events e
  where e.occurred_at >= p_from and e.occurred_at < p_to
),
summary as (
  select
    count(*)::integer as visits,
    count(distinct visitor_id)::integer as unique_visitors,
    coalesce(sum(page_views), 0)::integer as page_views,
    coalesce(round(avg(duration_seconds)), 0)::integer as avg_duration_seconds,
    coalesce(round(avg(page_views)::numeric, 1), 0)::numeric as pages_per_visit,
    coalesce(round(100.0 * count(*) filter (where duration_seconds < 10 and page_views <= 1) / nullif(count(*), 0), 1), 0)::numeric as bounce_rate,
    coalesce(round(100.0 * count(*) filter (where duration_seconds >= 30 or page_views > 1) / nullif(count(*), 0), 1), 0)::numeric as engagement_rate,
    coalesce(sum(map_views), 0)::integer as map_visits
  from range_sessions
),
event_summary as (
  select
    count(*) filter (where event_type = 'platform_click')::integer as platform_clicks,
    count(*) filter (where event_type = 'entity_open')::integer as content_clicks,
    count(*) filter (where event_type = 'map_click')::integer as map_clicks
  from range_events
),
category_rows as (
  select entity_type as key, count(*)::integer as clicks
  from range_events
  where event_type = 'entity_open' and entity_type is not null
  group by entity_type
),
top_content_rows as (
  select
    entity_type as type,
    entity_id as id,
    coalesce(max(entity_name), 'بدون اسم') as name,
    count(*)::integer as clicks,
    count(distinct session_id)::integer as visitors
  from range_events
  where event_type = 'entity_open' and entity_id is not null
  group by entity_type, entity_id
  order by clicks desc, name
  limit 30
),
city_rows as (
  select
    coalesce(nullif(city, ''), 'غير معروف') as city,
    count(*)::integer as visits,
    count(distinct visitor_id)::integer as visitors,
    coalesce(round(avg(duration_seconds)), 0)::integer as avg_duration_seconds
  from range_sessions
  group by coalesce(nullif(city, ''), 'غير معروف')
  order by visits desc
  limit 20
),
device_rows as (
  select coalesce(device_type, 'unknown') as device, count(*)::integer as visits
  from range_sessions
  group by coalesce(device_type, 'unknown')
  order by visits desc
),
series_days as (
  select generate_series(
    date_trunc('day', p_from),
    date_trunc('day', p_to - interval '1 second'),
    interval '1 day'
  )::date as day
),
series_rows as (
  select
    d.day,
    (select count(*) from range_sessions s where s.started_at >= d.day and s.started_at < d.day + 1)::integer as visits,
    (select count(*) from range_events e where e.event_type = 'page_view' and e.occurred_at >= d.day and e.occurred_at < d.day + 1)::integer as page_views,
    (select count(*) from range_events e where e.event_type in ('entity_open', 'map_click') and e.occurred_at >= d.day and e.occurred_at < d.day + 1)::integer as clicks
  from series_days d
),
recent_rows as (
  select
    session_id as id,
    coalesce(nullif(city, ''), 'غير معروف') as city,
    coalesce(device_type, 'unknown') as device,
    started_at,
    duration_seconds,
    page_views,
    map_views
  from range_sessions
  order by started_at desc
  limit 12
)
select jsonb_build_object(
  'summary', (select to_jsonb(summary) from summary),
  'events', (select to_jsonb(event_summary) from event_summary),
  'categories', coalesce((select jsonb_agg(to_jsonb(category_rows)) from category_rows), '[]'::jsonb),
  'topContent', coalesce((select jsonb_agg(to_jsonb(top_content_rows)) from top_content_rows), '[]'::jsonb),
  'cities', coalesce((select jsonb_agg(to_jsonb(city_rows)) from city_rows), '[]'::jsonb),
  'devices', coalesce((select jsonb_agg(to_jsonb(device_rows)) from device_rows), '[]'::jsonb),
  'series', coalesce((select jsonb_agg(to_jsonb(series_rows) order by day) from series_rows), '[]'::jsonb),
  'recentSessions', coalesce((select jsonb_agg(to_jsonb(recent_rows)) from recent_rows), '[]'::jsonb)
);
$$;

revoke all on function public.get_platform_analytics(timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_platform_analytics(timestamptz, timestamptz)
  to service_role;
